#!/usr/bin/env tsx
/**
 * Náhled (read-only): které pending řádky by nová pravidla kvality (merch,
 * Simson bez naší značky) přesunula na ignored. S --apply je opravdu přesune
 * (match_status='ignored'); --apply spouštěj až po schválení seznamu.
 *
 *   npx tsx scripts/preview-quality-ignored.ts
 *   npx tsx scripts/preview-quality-ignored.ts --apply
 */
import { nameExclusion } from '../src/lib/feed/itemQuality';

const PAGE_SIZE = 1_000;

async function main() {
  const { createServiceRoleClient } = await import('../src/lib/supabase/server');
  const client = createServiceRoleClient();
  const hits: { id: string; shop: string; reason: string; name: string }[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await client
      .from('shop_products')
      .select('id, shop_id, name')
      .eq('match_status', 'pending')
      .is('part_id', null)
      .order('id')
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      const reason = nameExclusion(row.name as string);
      if (reason)
        hits.push({
          id: row.id as string,
          shop: row.shop_id as string,
          reason,
          name: row.name as string,
        });
    }
    if (!data || data.length < PAGE_SIZE) break;
  }

  const count = (key: 'shop' | 'reason') =>
    Object.entries(
      hits.reduce<Record<string, number>>(
        (acc, h) => ({ ...acc, [h[key]]: (acc[h[key]] ?? 0) + 1 }),
        {},
      ),
    )
      .map(([k, v]) => `${k} ${v}`)
      .join(', ');
  console.log(
    `pending -> ignored: ${hits.length} řádků (podle důvodu: ${count('reason')}; podle shopu: ${count('shop')})\n`,
  );
  for (const h of hits.sort(
    (a, b) => a.reason.localeCompare(b.reason) || a.name.localeCompare(b.name),
  )) {
    console.log(`[${h.shop}] ${h.reason}: ${h.name}`);
  }

  if (process.argv.includes('--apply')) {
    for (let i = 0; i < hits.length; i += 200) {
      const ids = hits.slice(i, i + 200).map((h) => h.id);
      const { error } = await client
        .from('shop_products')
        .update({ match_status: 'ignored' })
        .in('id', ids)
        .eq('match_status', 'pending');
      if (error) throw new Error(error.message);
    }
    console.log(`\nPřesunuto na ignored: ${hits.length}`);
  } else {
    console.log('\nNÁHLED: nic se nezměnilo (změna jen s --apply).');
  }
}

async function printCounts() {
  const { createServiceRoleClient } = await import('../src/lib/supabase/server');
  const client = createServiceRoleClient();
  const counts: Record<string, Record<string, number>> = {};
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await client
      .from('shop_products')
      .select('shop_id, match_status')
      .order('id')
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      const shop = row.shop_id as string;
      const status = (row.match_status as string) ?? 'null';
      counts[shop] ??= {};
      counts[shop][status] = (counts[shop][status] ?? 0) + 1;
    }
    if (!data || data.length < PAGE_SIZE) break;
  }
  console.log('\nPočty match_status po shopech:');
  for (const shop of Object.keys(counts).sort()) {
    console.log(`  ${shop}: ${JSON.stringify(counts[shop])}`);
  }
}

main()
  .then(printCounts)
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
