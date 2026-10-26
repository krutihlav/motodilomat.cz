import type {SupabaseClient} from '@supabase/supabase-js';
import {pairKey, type ClusterPair, type PairDecision} from './clusters';

const PAGE_SIZE = 1_000;

/** Ruční rozhodnutí z pair_reviews (migrace 027) jako mapa pairKey -> rozhodnutí. */
export async function loadReviews(client: SupabaseClient): Promise<Map<string, PairDecision>> {
  const out = new Map<string, PairDecision>();
  for (let from = 0; ; from += PAGE_SIZE) {
    const {data, error} = await client
      .from('pair_reviews')
      .select('offer_a, offer_b, decision')
      .order('offer_a')
      .order('offer_b')
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`Načtení pair_reviews selhalo: ${error.message}`);
    for (const row of data ?? []) {
      out.set(pairKey(row.offer_a as string, row.offer_b as string), row.decision as PairDecision);
    }
    if (!data || data.length < PAGE_SIZE) break;
  }
  return out;
}

export type QueueRow = {
  offer_a: string;
  offer_b: string;
  rank: number;
  reasons: string[];
  shared: string[];
  jaccard: number;
  price_ratio: number | null;
};

/**
 * Řádky fronty pro ruční kontrolu: B páry bez rozhodnutí. Nahoře stejný typ dílu (nejspíš jen
 * chybí údaj), v rámci toho dražší díly – tam je srovnání ceny nejvíc vidět.
 */
export function queueRows(rankedB: ClusterPair[], reviews: Map<string, PairDecision>): QueueRow[] {
  // 2 = stejný typ dílu, 1 = stejné hlavní slovo (pružina ↔ pružina), 0 = jiné hlavní slovo
  // (pružina ↔ pojistka – skoro vždy jiný díl, jde na konec)
  const tier = (p: ClusterPair) =>
    p.a.parsed.partType === p.b.parsed.partType ? 2 : p.a.headWord !== null && p.a.headWord === p.b.headWord ? 1 : 0;
  const maxPrice = (p: ClusterPair) => Math.max(p.a.price ?? 0, p.b.price ?? 0);
  const ordered = [...rankedB].sort((x, y) => tier(y) - tier(x) || maxPrice(y) - maxPrice(x));
  const rows: QueueRow[] = [];
  for (const pair of ordered) {
    const [a, b] = pair.a.id < pair.b.id ? [pair.a.id, pair.b.id] : [pair.b.id, pair.a.id];
    if (reviews.has(pairKey(a, b))) continue;
    rows.push({
      offer_a: a,
      offer_b: b,
      rank: rows.length + 1,
      reasons: pair.reasons,
      shared: pair.shared,
      jaccard: Math.round(pair.jaccard * 1000) / 1000,
      price_ratio: pair.priceRatio === null ? null : Math.round(pair.priceRatio * 100) / 100,
    });
  }
  return rows;
}
