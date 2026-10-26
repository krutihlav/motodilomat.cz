#!/usr/bin/env tsx
/**
 * Fronta pro ruční schvalování dvojic (pair_queue, migrace 027): B páry ze shlukování,
 * které ještě nemají rozhodnutí v pair_reviews, seřazené podle rankB.
 *
 *   npx tsx scripts/write-pair-queue.ts            # dry-run: jen počty a prvních 20 dvojic
 *   npx tsx scripts/write-pair-queue.ts --write    # přepíše pair_queue
 *
 * Fronta je odvozená data – zápis ji celou smaže a naplní znovu. Rozhodnutí (pair_reviews)
 * se nikdy nemažou.
 */
import { rankB } from '../src/lib/parts/clusters';
import { clusterWithLearning, loadReviews, queueRows, renderLearnReport } from '../src/lib/parts/reviews';
import { loadSources } from './write-parts';

const CHUNK = 500;

async function main() {
  const { createServiceRoleClient } = await import('../src/lib/supabase/server');
  const client = createServiceRoleClient();
  const sources = await loadSources(client);
  const reviews = await loadReviews(client);
  const { result, learn } = clusterWithLearning(sources, reviews);
  console.log(renderLearnReport(learn));
  const rows = queueRows(rankB(result.pairs), reviews);

  console.log(`Nabídek: ${result.items}, A párů: ${result.countA}, B párů: ${result.countB}`);
  console.log(`Ruční rozhodnutí: ${reviews.size}, do fronty: ${rows.length}`);
  const byId = new Map(sources.map((s) => [s.id, s]));
  for (const row of rows.slice(0, 20)) {
    const a = byId.get(row.offer_a)!;
    const b = byId.get(row.offer_b)!;
    console.log(`#${row.rank} [${row.reasons.join(', ')}] ${a.shopId}: ${a.name} (${a.price} Kč) <> ${b.shopId}: ${b.name} (${b.price} Kč)`);
  }

  if (!process.argv.includes('--write')) {
    console.log('DRY-RUN: pair_queue se nezměnila (zápis jen s --write).');
    return;
  }
  const { error: delError } = await client.from('pair_queue').delete().gte('rank', 0);
  if (delError) throw new Error(`Smazání pair_queue selhalo: ${delError.message}`);
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await client.from('pair_queue').insert(rows.slice(i, i + CHUNK));
    if (error) throw new Error(`Zápis pair_queue selhal: ${error.message}`);
  }
  console.log(`Zapsáno ${rows.length} dvojic do pair_queue.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
