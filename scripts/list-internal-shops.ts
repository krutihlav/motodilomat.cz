#!/usr/bin/env tsx
import {createServiceRoleClient} from '../src/lib/supabase/server';

/**
 * Vypíše (jeden na řádek, "id<TAB>source_type") shopy s internal_sync=true,
 * které mají zdroj (feed_url u feedu, base_url u crawlu). Používá workflow
 * import-internal-nightly.yml. internal_sync NENÍ souhlas e-shopu - data se
 * importují s --internal a zůstávají neveřejná (viz docs/decisions.md 2026-10-21).
 */
async function main() {
  const client = createServiceRoleClient();

  const {data, error} = await client
    .from('shops')
    .select('id, source_type, feed_url, base_url')
    .eq('internal_sync', true)
    .order('id');

  if (error) {
    console.error(`Nepodařilo se načíst seznam shopů: ${error.message}`);
    process.exit(1);
  }

  for (const row of data ?? []) {
    const hasSource = row.source_type === 'feed' ? !!row.feed_url : !!row.base_url;
    if (hasSource) console.log(`${row.id}\t${row.source_type}`);
  }
}

main();
