import { describe, expect, it } from 'vitest';
import { buildClusterItems, findClusterPairs, pairKey, type ClusterSource, type PairDecision } from '../../src/lib/parts/clusters';
import { learnFromReviews } from '../../src/lib/parts/reviews';

let n = 0;
const src = (shopId: string, name: string, price: number, modelIds: string[]): ClusterSource => ({
  id: `00000000-0000-0000-0000-${String(++n).padStart(12, '0')}`,
  shopId,
  name,
  price,
  modelIds,
  fitGeneric: null,
});

describe('learnFromReviews', () => {
  it('slovo opakovaně jen u „stejný díl“ = nezáleží na něm; pak se páruje samo', () => {
    const items = buildClusterItems([
      src('a', 'Kolo náhrada Jawa 50 Pionýr 20', 3000, ['pionyr-20']),
      src('b', 'Kolo replika Jawa 50 Pionýr 20', 3200, ['pionyr-20']),
      src('a', 'Blatník náhrada Jawa 50 Pionýr 20', 900, ['pionyr-20']),
      src('b', 'Blatník replika Jawa 50 Pionýr 20', 950, ['pionyr-20']),
      src('a', 'Řídítka náhrada Jawa 50 Pionýr 20', 1200, ['pionyr-20']),
      src('b', 'Řídítka replika Jawa 50 Pionýr 20', 1100, ['pionyr-20']),
      src('c', 'Sedlo náhrada Jawa 50 Pionýr 20', 2000, ['pionyr-20']),
      src('d', 'Sedlo replika Jawa 50 Pionýr 20', 2100, ['pionyr-20']),
    ]);
    const reviews = new Map<string, PairDecision>([
      [pairKey(items[0].id, items[1].id), 'same'],
      [pairKey(items[2].id, items[3].id), 'same'],
      [pairKey(items[4].id, items[5].id), 'same'],
    ]);
    const learn = learnFromReviews(items, reviews);
    expect([...learn.rules.neutralWords]).toEqual(["replik"]);
    // sedlo nikdo neschvaloval – projde díky naučenému slovu
    const result = findClusterPairs(items.slice(6), { learned: learn.rules });
    expect(result.countA).toBe(1);
    expect(result.pairs[0].relaxed).toContain('naučeno: slova');
  });

  it('protichůdná rozhodnutí se nenaučí', () => {
    const items = buildClusterItems([
      src('a', 'Kolo náhrada Jawa 50 Pionýr 20', 3000, ['pionyr-20']),
      src('b', 'Kolo replika Jawa 50 Pionýr 20', 3200, ['pionyr-20']),
      src('a', 'Blatník náhrada Jawa 50 Pionýr 20', 900, ['pionyr-20']),
      src('b', 'Blatník replika Jawa 50 Pionýr 20', 950, ['pionyr-20']),
      src('a', 'Řídítka náhrada Jawa 50 Pionýr 20', 1200, ['pionyr-20']),
      src('b', 'Řídítka replika Jawa 50 Pionýr 20', 1100, ['pionyr-20']),
      src('a', 'Sedlo náhrada Jawa 50 Pionýr 20', 2000, ['pionyr-20']),
      src('b', 'Sedlo replika Jawa 50 Pionýr 20', 2100, ['pionyr-20']),
    ]);
    const reviews = new Map<string, PairDecision>([
      [pairKey(items[0].id, items[1].id), 'same'],
      [pairKey(items[2].id, items[3].id), 'same'],
      [pairKey(items[4].id, items[5].id), 'same'],
      [pairKey(items[6].id, items[7].id), 'different'],
    ]);
    expect(learnFromReviews(items, reviews).rules.neutralWords.size).toBe(0);
  });
});
