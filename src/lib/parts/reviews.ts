import type {SupabaseClient} from '@supabase/supabase-js';
import {buildClusterItems, compareVariants, findClusterPairs, pairKey, typeDiff, type ClusterItem, type ClusterPair, type ClusterResult, type ClusterSource, type LearnedRules, type PairDecision} from './clusters';

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

/** Prahy učení: kolik shodných rozhodnutí je potřeba a že nesmí být žádné opačné. */
export const LEARN_MIN_WORD = 3;
export const LEARN_MIN_ATTR = 2;

export type LearnReport = {
  rules: LearnedRules;
  /** důkazy pro report: slovo/atribut → počet rozhodnutí stejný / jiný */
  wordVotes: Map<string, {same: number; different: number}>;
  attrVotes: Map<string, {same: number; different: number}>;
};

/**
 * Naučí se z ručních rozhodnutí:
 * - slovo v typu dílu, ve kterém se lišily dvojice označené „stejný díl“ (aspoň 3×) a nikdy
 *   dvojice „jiný díl“ → na slově nezáleží (neutralWords),
 * - slovo, které se lišilo jen u dvojic „jiný díl“ (aspoň 3×) a nikdy u „stejný“ → dělá jiný
 *   díl (blockWords),
 * - údaj (atribut varianty) jen u jedné nabídky téhož typu dílu, u „stejný“ aspoň 2× a nikdy
 *   u „jiný“ → u tohoto typu nevadí (softAttrsByType).
 * Rozhodnutí „jiný díl“ s velkým rozdílem ceny (×2,5+) se pro slova nepočítají – tam rozhodla cena.
 */
export function learnFromReviews(items: ClusterItem[], reviews: Map<string, PairDecision>): LearnReport {
  const byId = new Map(items.map((i) => [i.id, i]));
  const wordVotes = new Map<string, {same: number; different: number}>();
  const attrVotes = new Map<string, {same: number; different: number}>();
  const vote = (map: typeof wordVotes, key: string, kind: 'same' | 'different') => {
    const v = map.get(key) ?? {same: 0, different: 0};
    v[kind] += 1;
    map.set(key, v);
  };
  for (const [key, decision] of reviews) {
    if (decision === 'skip') continue;
    const [ida, idb] = key.split('|');
    const a = byId.get(ida);
    const b = byId.get(idb);
    if (!a || !b) continue;
    const ratio = a.price && b.price ? Math.max(a.price, b.price) / Math.min(a.price, b.price) : null;
    const priceDecided = decision === 'different' && ratio !== null && ratio > 2.5;
    if (!priceDecided) for (const w of typeDiff(a, b)) vote(wordVotes, w, decision);
    if (a.parsed.partType === b.parsed.partType) {
      for (const attr of compareVariants(a.parsed.variant, b.parsed.variant).oneSided) {
        vote(attrVotes, `${a.parsed.partType}|${attr}`, decision);
      }
    }
  }
  const neutralWords = new Set<string>();
  const blockWords = new Set<string>();
  for (const [w, v] of wordVotes) {
    if (v.same >= LEARN_MIN_WORD && v.different === 0) neutralWords.add(w);
    if (v.different >= LEARN_MIN_WORD && v.same === 0) blockWords.add(w);
  }
  const softAttrsByType = new Map<string, Set<string>>();
  for (const [k, v] of attrVotes) {
    if (v.same < LEARN_MIN_ATTR || v.different > 0) continue;
    const [type, attr] = k.split('|');
    softAttrsByType.set(type, new Set([...(softAttrsByType.get(type) ?? []), attr]));
  }
  return {rules: {neutralWords, blockWords, softAttrsByType}, wordVotes, attrVotes};
}

export function renderLearnReport(r: LearnReport): string {
  const out = ['## Naučeno z ručních rozhodnutí', ''];
  const fmt = (v: {same: number; different: number}) => `stejný ${v.same}× / jiný ${v.different}×`;
  out.push(`- slova, na kterých nezáleží: ${[...r.rules.neutralWords].map((w) => `${w} (${fmt(r.wordVotes.get(w)!)})`).join(', ') || '—'}`);
  out.push(`- slova, která dělají jiný díl: ${[...r.rules.blockWords].map((w) => `${w} (${fmt(r.wordVotes.get(w)!)})`).join(', ') || '—'}`);
  const attrs = [...r.rules.softAttrsByType].flatMap(([t, set]) => [...set].map((a) => `${t}: ${a} (${fmt(r.attrVotes.get(`${t}|${a}`)!)})`));
  out.push(`- údaje, které u typu dílu nevadí: ${attrs.join('; ') || '—'}`);
  const pending = [...r.wordVotes].filter(([w, v]) => !r.rules.neutralWords.has(w) && !r.rules.blockWords.has(w) && v.same + v.different >= 2);
  out.push(`- zatím nerozhodnuté (málo rozhodnutí nebo protichůdná): ${pending.slice(0, 40).map(([w, v]) => `${w} (${fmt(v)})`).join(', ') || '—'}`);
  return `${out.join('\n')}\n`;
}

/** Shlukování s ručními rozhodnutími i pravidly naučenými z nich (pro skripty). */
export function clusterWithLearning(
  sources: ClusterSource[],
  reviews: Map<string, PairDecision>,
): {result: ClusterResult; learn: LearnReport} {
  const items = buildClusterItems(sources);
  const learn = learnFromReviews(items, reviews);
  return {result: findClusterPairs(items, {reviews, learned: learn.rules}), learn};
}
