#!/usr/bin/env tsx
/**
 * Dry-run shlukování nabídek mezi shopy (páry A/B). NIC NEZAPISUJE - jen čte
 * shop_products (match_status <> 'ignored') a shop_product_models a vypíše report.
 *
 *   npx tsx scripts/dry-run-clusters.ts [--out clusters-report.md] [--top-b 200]
 */
import { writeFileSync } from 'node:fs';
import {
  findClusterPairs,
  renderClusterReport,
  type ClusterSource,
  type FitGenericEntry,
} from '../src/lib/parts/clusters';

const PAGE_SIZE = 1_000;

function arg(name: string): string | undefined {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? process.argv[at + 1] : undefined;
}

async function main() {
  const { createServiceRoleClient } = await import('../src/lib/supabase/server');
  const client = createServiceRoleClient();

  const sources: ClusterSource[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await client
      .from('shop_products')
      .select('id, shop_id, name, price, fit_generic')
      .neq('match_status', 'ignored')
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

  const report = renderClusterReport(findClusterPairs(sources), {
    topB: Number(arg('top-b') ?? 200),
  });
  const out = arg('out');
  if (out) writeFileSync(out, report);
  console.log(report);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
