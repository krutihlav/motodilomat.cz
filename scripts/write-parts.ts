#!/usr/bin/env tsx
/**
 * Zapisuje shluky A (nabídky z víc shopů = jeden díl) do parts, part_models
 * a shop_products.part_id.
 *
 * VÝCHOZÍ JE DRY-RUN: načte nabídky, spočítá shluky a vypíše seznam dílů
 * (name, slug, category, modely, nabídky). Zapisuje se jen s --write.
 *
 *   npx tsx scripts/write-parts.ts            # dry-run
 *   npx tsx scripts/write-parts.ts --write    # zápis (až po schválení)
 *
 * Idempotentní: díl se hledá podle parts.cluster_key; existující se jen aktualizuje
 * (name, category, part_type, variant - slug a is_public se nemění), part_models se
 * srovnají na sjednocení modelů nabídek. Nabídky s match_status manual / rejected /
 * ignored se nikdy nepřepisují, díly s jiným source než 'cluster' se přeskočí.
 * Díly vznikají s is_public = false.
 *
 * Vyžaduje sloupce parts.part_type, variant, cluster_key (unique), is_public, source
 * (migrace 015). Dry-run funguje i bez nich.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { applyPlans, WRITABLE_STATUSES, type PartsRepository } from '../src/lib/parts/applyPlans';
import {
  findClusterPairs,
  type ClusterSource,
  type FitGenericEntry,
} from '../src/lib/parts/clusters';
import { buildPartPlans, renderPartPlans, type PartPlan } from '../src/lib/parts/partsPlan';

const PAGE_SIZE = 1_000;
const CHUNK = 200;

export async function loadSources(client: SupabaseClient): Promise<ClusterSource[]> {
  const sources: ClusterSource[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await client
      .from('shop_products')
      .select('id, shop_id, name, price, fit_generic, category_text, match_status, part_id')
      .in('match_status', WRITABLE_STATUSES)
      .order('id')
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`Načtení shop_products selhalo: ${error.message}`);
    for (const row of data ?? []) {
      sources.push({
        id: row.id as string,
        shopId: row.shop_id as string,
        name: row.name as string,
        price: row.price === null ? null : Number(row.price),
        modelIds: [],
        fitGeneric: (row.fit_generic as FitGenericEntry[] | null) ?? null,
        categoryText: (row.category_text as string | null) ?? null,
        matchStatus: row.match_status as string,
        partId: (row.part_id as string | null) ?? null,
      });
    }
    if (!data || data.length < PAGE_SIZE) break;
  }
  const byId = new Map(sources.map((s) => [s.id, s]));
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await client
      .from('shop_product_models')
      .select('shop_product_id, model_id')
      .eq('source', 'name')
      .order('shop_product_id')
      .order('model_id')
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`Načtení shop_product_models selhalo: ${error.message}`);
    for (const row of data ?? []) {
      byId.get(row.shop_product_id as string)?.modelIds.push(row.model_id as string);
    }
    if (!data || data.length < PAGE_SIZE) break;
  }
  return sources;
}

export class SupabasePartsRepository implements PartsRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findPartsByClusterKeys(keys: string[]) {
    const found = [];
    for (let i = 0; i < keys.length; i += CHUNK) {
      const { data, error } = await this.client
        .from('parts')
        .select('id, cluster_key, slug, source')
        .in('cluster_key', keys.slice(i, i + CHUNK));
      if (error) throw new Error(`Načtení parts selhalo: ${error.message}`);
      for (const row of data ?? []) {
        found.push({
          id: row.id as string,
          clusterKey: row.cluster_key as string,
          slug: row.slug as string,
          source: (row.source as string | null) ?? null,
        });
      }
    }
    return found;
  }

  async insertPart(part: Parameters<PartsRepository['insertPart']>[0]) {
    const { data, error } = await this.client
      .from('parts')
      .insert({
        name: part.name,
        slug: part.slug,
        category: part.category,
        part_type: part.partType,
        variant: part.variant,
        cluster_key: part.clusterKey,
        is_public: part.isPublic,
        source: part.source,
      })
      .select('id')
      .single();
    if (error) throw new Error(`Vložení dílu ${part.slug} selhalo: ${error.message}`);
    return data.id as string;
  }

  async updatePart(id: string, fields: Parameters<PartsRepository['updatePart']>[1]) {
    const { error } = await this.client
      .from('parts')
      .update({
        name: fields.name,
        category: fields.category,
        part_type: fields.partType,
        variant: fields.variant,
      })
      .eq('id', id);
    if (error) throw new Error(`Aktualizace dílu ${id} selhala: ${error.message}`);
  }

  async getPartModels(partId: string) {
    const { data, error } = await this.client
      .from('part_models')
      .select('model_id')
      .eq('part_id', partId);
    if (error) throw new Error(`Načtení part_models selhalo: ${error.message}`);
    return (data ?? []).map((row) => row.model_id as string);
  }

  async deletePartModels(partId: string, modelIds: string[]) {
    const { error } = await this.client
      .from('part_models')
      .delete()
      .eq('part_id', partId)
      .in('model_id', modelIds);
    if (error) throw new Error(`Mazání part_models selhalo: ${error.message}`);
  }

  async insertPartModels(partId: string, modelIds: string[]) {
    const { error } = await this.client
      .from('part_models')
      .insert(modelIds.map((modelId) => ({ part_id: partId, model_id: modelId })));
    if (error) throw new Error(`Vkládání part_models selhalo: ${error.message}`);
  }

  async assignOffers(partId: string, offerIds: string[]) {
    let assigned = 0;
    for (let i = 0; i < offerIds.length; i += CHUNK) {
      const { data, error } = await this.client
        .from('shop_products')
        .update({ part_id: partId, match_status: 'auto', match_confidence: 1 })
        .in('id', offerIds.slice(i, i + CHUNK))
        .in('match_status', WRITABLE_STATUSES)
        .select('id');
      if (error) throw new Error(`Přiřazení nabídek k dílu ${partId} selhalo: ${error.message}`);
      assigned += data?.length ?? 0;
    }
    return assigned;
  }
}

export function planFromSources(sources: ClusterSource[]): PartPlan[] {
  return buildPartPlans(findClusterPairs(sources).clusters);
}

async function main() {
  const { createServiceRoleClient } = await import('../src/lib/supabase/server');
  const client = createServiceRoleClient();
  const sources = await loadSources(client);
  const plans = planFromSources(sources);
  const repo = new SupabasePartsRepository(client);

  let existing: number | undefined;
  let columnsMissing = false;
  try {
    existing = (await repo.findPartsByClusterKeys(plans.map((p) => p.clusterKey))).length;
  } catch (error) {
    if (!/cluster_key|column/i.test(String(error))) throw error;
    columnsMissing = true;
  }
  const inPlan = new Set(plans.flatMap((p) => p.offers.map((o) => o.id)));
  const staleAuto = sources.filter(
    (s) => s.matchStatus === 'auto' && s.partId && !inPlan.has(s.id),
  ).length;
  console.log(renderPartPlans(plans, { existing, staleAuto, columnsMissing }));

  if (!process.argv.includes('--write')) {
    console.log('DRY-RUN: nic se nezapsalo (zápis jen s --write).');
    return;
  }
  if (columnsMissing) {
    throw new Error(
      'V parts chybí sloupce z migrace 015 (cluster_key, part_type, variant, is_public, source).',
    );
  }
  const summary = await applyPlans(repo, plans, console.log);
  console.log(JSON.stringify(summary));
  console.log('Hotovo.');
}

if (process.argv[1]?.endsWith('write-parts.ts')) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
