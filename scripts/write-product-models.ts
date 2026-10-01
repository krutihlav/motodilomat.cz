#!/usr/bin/env tsx
/**
 * Parsuje názvy nabídek (shop_products) na kanonické modely a ukládá
 * vazby do shop_product_models + souhrn do shop_products
 * (model_match_level, fit_generic, models_parsed_at).
 *
 * VÝCHOZÍ JE DRY-RUN: jen čte a vypíše, kolik řádků a vazeb by zápis vytvořil.
 * Zapisuje se jen s --write. Je idempotentní: u každého řádku smaže vazby
 * source='name' a vloží je znovu (source='description' se nedotýká).
 *
 *   npx tsx scripts/write-product-models.ts            # dry-run
 *   npx tsx scripts/write-product-models.ts --write    # zápis (až po schválení)
 *
 * Zpracuje řádky s match_status pending/auto/manual; ignored a řádky, které
 * nově vyřazují pravidla merch / Simson (itemQuality.ts), přeskočí.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { nameExclusion } from '../src/lib/feed/itemQuality';
import { buildProductModels, type ProductModels } from '../src/lib/models/productModels';

const PAGE_SIZE = 1_000;
const CHUNK = 200;
const STATUSES = ['pending', 'auto', 'manual'];

export type SourceRow = { id: string; shop_id: string; name: string };

export type WritePlan = {
  rows: { id: string; shopId: string; name: string; models: ProductModels }[];
  skipped: { merch: number; simson_only: number };
};

/** Čistá část: z řádků vyrobí plán zápisu (testovatelná bez DB). */
export function buildWritePlan(source: SourceRow[]): WritePlan {
  const plan: WritePlan = { rows: [], skipped: { merch: 0, simson_only: 0 } };
  for (const row of source) {
    const excluded = nameExclusion(row.name);
    if (excluded) {
      plan.skipped[excluded] += 1;
      continue;
    }
    plan.rows.push({
      id: row.id,
      shopId: row.shop_id,
      name: row.name,
      models: buildProductModels(row.name, row.shop_id),
    });
  }
  return plan;
}

export function summarizePlan(plan: WritePlan): string {
  const byLevel: Record<string, number> = {};
  const linksByLevel: Record<string, number> = { type: 0, nickname: 0 };
  let links = 0;
  let withGeneric = 0;
  for (const row of plan.rows) {
    byLevel[row.models.modelMatchLevel] = (byLevel[row.models.modelMatchLevel] ?? 0) + 1;
    for (const link of row.models.links) {
      links += 1;
      linksByLevel[link.matchLevel] += 1;
    }
    if (row.models.fitGeneric.length > 0) withGeneric += 1;
  }
  const rowsWithLinks = plan.rows.filter((r) => r.models.links.length > 0).length;
  return [
    `Řádků k aktualizaci shop_products: ${plan.rows.length}`,
    `Přeskočeno pravidly: merch ${plan.skipped.merch}, Simson ${plan.skipped.simson_only}`,
    `Řádků s ≥1 vazbou na model: ${rowsWithLinks}`,
    `Vazeb shop_product_models celkem: ${links} (type ${linksByLevel.type}, nickname ${linksByLevel.nickname})`,
    `model_match_level: ${['type', 'nickname', 'displacement', 'brand', 'none']
      .map((level) => `${level} ${byLevel[level] ?? 0}`)
      .join(', ')}`,
    `Řádků s fit_generic: ${withGeneric}`,
  ].join('\n');
}

async function fetchRows(client: SupabaseClient): Promise<SourceRow[]> {
  const rows: SourceRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await client
      .from('shop_products')
      .select('id, shop_id, name')
      .in('match_status', STATUSES)
      .order('id')
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`Načtení shop_products selhalo: ${error.message}`);
    rows.push(...((data ?? []) as SourceRow[]));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
}

async function write(client: SupabaseClient, plan: WritePlan): Promise<void> {
  const { data: models, error } = await client.from('models').select('id');
  if (error) throw new Error(`Načtení models selhalo: ${error.message}`);
  const known = new Set((models ?? []).map((m) => m.id as string));
  const missing = new Set(
    plan.rows.flatMap((r) => r.models.links.map((l) => l.modelId)).filter((id) => !known.has(id)),
  );
  if (missing.size > 0) {
    throw new Error(
      `V tabulce models chybí: ${[...missing].join(', ')} - nejdřív aplikuj migrace 012-014.`,
    );
  }

  const parsedAt = new Date().toISOString();
  for (let i = 0; i < plan.rows.length; i += CHUNK) {
    const chunk = plan.rows.slice(i, i + CHUNK);
    const ids = chunk.map((r) => r.id);

    const del = await client
      .from('shop_product_models')
      .delete()
      .in('shop_product_id', ids)
      .eq('source', 'name');
    if (del.error) throw new Error(`Mazání vazeb selhalo: ${del.error.message}`);

    const links = chunk.flatMap((r) =>
      r.models.links.map((l) => ({
        shop_product_id: r.id,
        model_id: l.modelId,
        match_level: l.matchLevel,
        source: l.source,
        matched_text: l.matchedText,
      })),
    );
    if (links.length > 0) {
      const ins = await client.from('shop_product_models').insert(links);
      if (ins.error) throw new Error(`Vkládání vazeb selhalo: ${ins.error.message}`);
    }

    for (const row of chunk) {
      const upd = await client
        .from('shop_products')
        .update({
          model_match_level: row.models.modelMatchLevel,
          fit_generic: row.models.fitGeneric,
          models_parsed_at: parsedAt,
        })
        .eq('id', row.id);
      if (upd.error) throw new Error(`Update shop_products ${row.id} selhal: ${upd.error.message}`);
    }
    console.log(`Zapsáno ${Math.min(i + CHUNK, plan.rows.length)}/${plan.rows.length}`);
  }
}

async function main() {
  const { createServiceRoleClient } = await import('../src/lib/supabase/server');
  const client = createServiceRoleClient();
  const plan = buildWritePlan(await fetchRows(client));
  console.log(summarizePlan(plan));
  if (!process.argv.includes('--write')) {
    console.log('\nDRY-RUN: nic se nezapsalo (zápis jen s --write).');
    return;
  }
  await write(client, plan);
  console.log('Hotovo.');
}

if (process.argv[1]?.endsWith('write-product-models.ts')) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
