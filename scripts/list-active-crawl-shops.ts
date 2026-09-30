#!/usr/bin/env tsx
import {createServiceRoleClient} from '../src/lib/supabase/server';

/**
 * Vypíše (jeden na řádek) id všech shopů se source_type='crawl',
 * crawl_enabled=true a vyplněným base_url. Používá GitHub Actions workflow
 * import-crawl.yml k sestavení seznamu shopů pro denní crawl. crawl_enabled
 * znamená souhlas e-shopu (viz docs/decisions.md), takže shop bez souhlasu
 * se do seznamu nikdy nedostane.
 */
async function main() {
  const client = createServiceRoleClient();

  const {data, error} = await client
    .from('shops')
    .select('id')
    .eq('source_type', 'crawl')
    .eq('crawl_enabled', true)
    .not('base_url', 'is', null);

  if (error) {
    console.error(`Nepodařilo se načíst seznam shopů: ${error.message}`);
    process.exit(1);
  }

  for (const row of data ?? []) {
    console.log(row.id);
  }
}

main();
