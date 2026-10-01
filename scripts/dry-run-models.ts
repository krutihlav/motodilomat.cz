#!/usr/bin/env tsx
/**
 * Dry-run parseru modelů nad pending řádky shop_products. NIC NEZAPISUJE -
 * jen čte a vypíše markdown report (pokrytí po shopech a úrovních, ukázky,
 * řádky bez shody, nerozřešené tokeny, podezřelé případy).
 *
 *   npx tsx scripts/dry-run-models.ts                      # čte Supabase (service role, read-only)
 *   npx tsx scripts/dry-run-models.ts --input rows.txt     # řádky "počet~~shop~~název"
 *       [--no-cue shop=N,shop=N] [--out report.md]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { buildReport, renderReport, type DryRunRow } from '../src/lib/models/dryRunReport';

const PAGE_SIZE = 1_000;

function arg(name: string): string | undefined {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? process.argv[at + 1] : undefined;
}

function readFile(path: string): DryRunRow[] {
  return readFileSync(path, 'utf8')
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => {
      const [count, shopId, ...rest] = line.split('~~');
      return { shopId, name: rest.join('~~'), count: Number(count) };
    });
}

async function readSupabase(): Promise<DryRunRow[]> {
  const { createServiceRoleClient } = await import('../src/lib/supabase/server');
  const client = createServiceRoleClient();
  const counts = new Map<string, DryRunRow>();
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await client
      .from('shop_products')
      .select('shop_id, name')
      .eq('match_status', 'pending')
      .order('id')
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`Načtení shop_products selhalo: ${error.message}`);
    for (const row of data ?? []) {
      const key = `${row.shop_id}~~${row.name}`;
      const entry = counts.get(key) ?? {
        shopId: row.shop_id as string,
        name: row.name as string,
        count: 0,
      };
      entry.count += 1;
      counts.set(key, entry);
    }
    if (!data || data.length < PAGE_SIZE) break;
  }
  return [...counts.values()];
}

async function main() {
  const input = arg('input');
  const rows = input ? readFile(input) : await readSupabase();
  const noCueByShop = Object.fromEntries(
    (arg('no-cue') ?? '')
      .split(',')
      .filter(Boolean)
      .map((pair) => {
        const [shop, n] = pair.split('=');
        return [shop, Number(n)];
      }),
  );
  const markdown = renderReport(buildReport(rows, { noCueByShop }));
  const out = arg('out');
  if (out) writeFileSync(out, markdown);
  else console.log(markdown);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
