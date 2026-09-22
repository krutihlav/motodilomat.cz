#!/usr/bin/env tsx
import {createServiceRoleClient} from '../src/lib/supabase/server';

/**
 * Vypíše (jeden na řádek) id všech shopů s feed_permission=true a vyplněným
 * feed_url. Používá GitHub Actions workflow import-feeds.yml k sestavení
 * seznamu shopů, pro které se spustí import.
 */
async function main() {
  const client = createServiceRoleClient();

  const {data, error} = await client
    .from('shops')
    .select('id')
    .eq('feed_permission', true)
    .not('feed_url', 'is', null);

  if (error) {
    console.error(`Nepodařilo se načíst seznam shopů: ${error.message}`);
    process.exit(1);
  }

  for (const row of data ?? []) {
    console.log(row.id);
  }
}

main();
