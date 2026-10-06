#!/usr/bin/env tsx
/**
 * Dry-run rozkladu názvů nabídek (partType + varianty) nad shop_products
 * s match_status <> 'ignored'. NIC NEZAPISUJE - jen čte a píše report.
 *
 *   npx tsx scripts/dry-run-parts.ts [--out report.md] [--json report.json]
 *   npx tsx scripts/dry-run-parts.ts --input rows.txt   # řádky "shop~~název"
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { buildPartsReport, renderPartsReport, type OfferRow } from '../src/lib/parts/partsReport';

const PAGE_SIZE = 1_000;

function arg(name: string): string | undefined {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? process.argv[at + 1] : undefined;
}

function readFile(path: string): OfferRow[] {
  return readFileSync(path, 'utf8')
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => {
      const [shopId, ...rest] = line.split('~~');
      return { shopId, name: rest.join('~~') };
    });
}

async function readSupabase(): Promise<OfferRow[]> {
  const { createServiceRoleClient } = await import('../src/lib/supabase/server');
  const client = createServiceRoleClient();
  const rows: OfferRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await client
      .from('shop_products')
      .select('shop_id, name')
      .neq('match_status', 'ignored')
      .order('id')
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`Načtení shop_products selhalo: ${error.message}`);
    for (const row of data ?? [])
      rows.push({ shopId: row.shop_id as string, name: row.name as string });
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
}

async function main() {
  const input = arg('input');
  const rows = input ? readFile(input) : await readSupabase();
  const report = buildPartsReport(rows);
  const markdown = renderPartsReport(report);
  const out = arg('out');
  if (out) writeFileSync(out, markdown);
  else console.log(markdown);
  const json = arg('json');
  if (json) writeFileSync(json, JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
