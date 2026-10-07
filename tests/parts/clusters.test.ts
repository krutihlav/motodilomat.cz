import { describe, expect, it } from 'vitest';
import {
  compareVariants,
  findClusterPairs,
  fitKey,
  jaccard,
  numberSet,
  priceRatio,
  rankB,
  renderClusterReport,
  type ClusterSource,
} from '../../src/lib/parts/clusters';
import { parseOfferName } from '../../src/lib/parts/parseOfferName';

let seq = 0;
const src = (
  shopId: string,
  name: string,
  price: number | null,
  modelIds: string[] = ['pionyr-20'],
  fitGeneric: ClusterSource['fitGeneric'] = null,
): ClusterSource => {
  seq += 1;
  return { id: `id-${String(seq).padStart(4, '0')}`, shopId, name, price, modelIds, fitGeneric };
};

describe('pomocné funkce', () => {
  it('numberSet bere čísla z rozměru', () => {
    expect([...numberSet('m4x0.7-76')].sort((a, b) => a - b)).toEqual([0.7, 4, 76]);
    expect(numberSet('16a').has(16)).toBe(true);
  });

  it('dimension se porovnává jako množina čísel, ne jako řetězec', () => {
    const a = parseOfferName('Tryska M4 x 0,7 - 76 *JIKOV karb.', { shopId: 'motomax' }).variant;
    const b = parseOfferName('Tryska M4x0,7 - 76 Jikov', { shopId: 'motokramek' }).variant;
    expect(compareVariants(a, b).conflicts).toEqual([]);
    const d = parseOfferName('Středící pouzdro karteru 10 x 30  JAWA 50 - 550', {
      shopId: 'motomax',
    });
    const e = parseOfferName('Středící pouzdro karteru 30x10 Jawa 50', { shopId: 'jawa-korda' });
    expect(d.variant.dimension).not.toBe(e.variant.dimension);
    expect(compareVariants(d.variant, e.variant).conflicts).toEqual([]);
    const c = parseOfferName('Tryska M4 x 0,7 - 95 Jawa - Dellorto', {
      shopId: 'motokramek',
    }).variant;
    expect(compareVariants(a, c).conflicts).toEqual(['dimension', 'ref']);
  });

  it('compareVariants: chybějící atribut na jedné straně není konflikt', () => {
    const a = parseOfferName('Držák světla zadní Jawa 50', { shopId: 'javarna' }).variant;
    const b = parseOfferName('Držák světla Jawa 50', { shopId: 'motomax' }).variant;
    expect(compareVariants(a, b)).toEqual({ conflicts: [], oneSided: ['position'] });
  });

  it('jaccard, priceRatio, fitKey', () => {
    expect(jaccard(new Set(['a', 'b']), new Set(['b', 'c']))).toBeCloseTo(1 / 3);
    expect(jaccard(new Set(), new Set())).toBe(0);
    expect(priceRatio(100, 250)).toBe(2.5);
    expect(priceRatio(null, 5)).toBeNull();
    expect(fitKey([{ brand: 'Jawa', displacement: 350 }, { brand: 'ČZ' }])).toBe('Jawa|350;ČZ|');
    expect(fitKey(null)).toBe('');
  });
});

describe('findClusterPairs', () => {
  it('A: stejný partType, jiný shop, společný model, symetrické atributy, cena ≤ 2,5', () => {
    const result = findClusterPairs([
      src('jawa-korda', 'Šroub setrvačníku Babetta 207', 40, ['babetta-207']),
      src('motomax', 'Šroub setrvačníku BABETTA 228, 207  *M', 60, ['babetta-207', 'babetta-228']),
    ]);
    expect(result.countA).toBe(1);
    expect(result.countB).toBe(0);
    expect(result.pairs[0]).toMatchObject({ class: 'A', basis: 'model', shared: ['babetta-207'] });
  });

  it('stejný shop se nepáruje', () => {
    const result = findClusterPairs([
      src('motomax', 'Šroub setrvačníku BABETTA 207', 40, ['babetta-207']),
      src('motomax', 'Šroub setrvačníku BABETTA 207  *M', 41, ['babetta-207']),
    ]);
    expect(result.pairs).toHaveLength(0);
  });

  it('nesdílený model se nepáruje', () => {
    const result = findClusterPairs([
      src('jawa-korda', 'Šroub setrvačníku Babetta 207', 40, ['babetta-207']),
      src('motomax', 'Šroub setrvačníku BABETTA 210  *M', 40, ['babetta-210']),
    ]);
    expect(result.candidates).toBe(0);
  });

  it('B: cena mimo poměr 2,5 / chybějící cena', () => {
    const result = findClusterPairs([
      src('jawa-korda', 'Šroub setrvačníku Babetta 207', 10, ['babetta-207']),
      src('motomax', 'Šroub setrvačníku BABETTA 207  *M', 60, ['babetta-207']),
      src('javarna', 'Šroub setrvačníku Babetta 207', null, ['babetta-207']),
    ]);
    const reasons = result.pairs.map((p) => p.reasons.join('|')).sort();
    expect(result.countA).toBe(0);
    expect(reasons).toEqual(['cena chybí', 'cena chybí', 'cena ×6.0']);
  });

  it('B: chybějící atribut na jedné straně', () => {
    const result = findClusterPairs([
      src('javarna', 'Držák světla zadní Jawa Pionýr 20', 100, ['pionyr-20']),
      src('motomax', 'Držák světla JAWA 50 - 20  *M', 110, ['pionyr-20']),
    ]);
    expect(result.countA).toBe(0);
    expect(result.pairs[0]).toMatchObject({ class: 'B', reasons: ['chybí: position'] });
  });

  it('B: podobný partType (Jaccard ≥ 0,5), ne stejný', () => {
    const result = findClusterPairs([
      src('javarna', 'Kryt řetězu Jawa Pionýr 20', 100, ['pionyr-20']),
      src('motomax', 'Kryt řetězu plastový JAWA 50 - 20  *M', 105, ['pionyr-20']),
    ]);
    expect(result.countB).toBe(1);
    expect(result.pairs[0].reasons[0]).toMatch(/^jaccard 0\.\d\d/);
  });

  it('Jaccard pod 0,5 se nevyhodnocuje', () => {
    const result = findClusterPairs([
      src('javarna', 'Kryt řetězu Jawa Pionýr 20', 100, ['pionyr-20']),
      src('motomax', 'Píst JAWA 50 - 20  *M', 100, ['pionyr-20']),
    ]);
    expect(result.candidates).toBe(0);
  });

  it('konflikt varianty = pár se zahodí a spočítá', () => {
    const result = findClusterPairs([
      src('jawa-korda', 'Píst Jawa Pionýr 20 38,75 / 14,1', 200),
      src('motomax', 'Píst JAWA 50 - 20  38,50 / 14,1  *M', 210),
      src('javarna', 'Píst Jawa Pionýr 20 38,75 / 14,1', 205),
    ]);
    expect(result.droppedConflict).toBe(2);
    expect(result.conflictsByAttribute).toEqual({ dimension: 2 });
    expect(result.countA).toBe(1);
  });

  it('bez modelu: shodný fit_generic (včetně prázdného) páruje, různý ne', () => {
    const jawa350 = [{ brand: 'Jawa', displacement: 350 }];
    const result = findClusterPairs([
      src('jawa-korda', 'Žárovka Jawa 350 12V 10W', 20, [], jawa350),
      src('motomax', 'Žárovka JAWA 350 12V 10W', 25, [], jawa350),
      src('javarna', 'Žárovka ČZ 125 12V 10W', 25, [], [{ brand: 'ČZ', displacement: 125 }]),
      src('motokramek', 'Žárovka 12V 10W', 22, [], null),
      src('motojelinek', 'Žárovka 12V 10W', 24, [], []),
    ]);
    const bases = result.pairs.map((p) => p.basis).sort();
    expect(bases).toEqual(['fit_generic', 'no_fit']);
    expect(result.byBasis.fit_generic.A).toBe(1);
    expect(result.byBasis.no_fit.A).toBe(1);
  });

  it('pár ve více skupinách (víc společných modelů) se počítá jednou', () => {
    const result = findClusterPairs([
      src('jawa-korda', 'Kryt nádrže Jawa 50 pionýr 20 21', 100, ['pionyr-20', 'pionyr-21']),
      src('motomax', 'Kryt nádrže JAWA 50 - 20, 21  *M', 100, ['pionyr-20', 'pionyr-21']),
    ]);
    expect(result.pairs).toHaveLength(1);
    expect(result.pairs[0].shared).toEqual(['pionyr-20', 'pionyr-21']);
  });
});

describe('no_fit a konflikty podle atributu', () => {
  const data = [
    src('jawa-korda', 'Žárovka 12V 10W', 20, [], null),
    src('motomax', 'Žárovka 12V 10W', 25, [], []),
    src('motokramek', 'Žárovka 12V 10W', 22, [], null),
    src('javarna', 'Žárovka 6V 10W', 22, [], null),
    src('motomax', 'Píst Jawa Pionýr 20 38,75 / 14,1', 200),
    src('javarna', 'Píst Jawa Pionýr 20 38,50 / 14,1', 200),
  ];
  const result = findClusterPairs(data);

  it('počítá no_fit páry po dvojicích shopů (A i B) a konflikty po základech', () => {
    expect(result.byBasis.no_fit).toEqual({ A: 3, B: 0 });
    expect(result.noFitByShopPair).toEqual({
      'jawa-korda × motokramek': { A: 1, B: 0 },
      'jawa-korda × motomax': { A: 1, B: 0 },
      'motokramek × motomax': { A: 1, B: 0 },
    });
    // 6V proti 12V: konflikt voltage u tří no_fit párů; písty: konflikt dimension u modelu
    expect(result.conflictsByAttribute).toEqual({ voltage: 3, dimension: 1 });
    expect(result.droppedByBasis).toEqual({ model: 1, fit_generic: 0, no_fit: 3 });
    expect(result.droppedConflict).toBe(4);
  });

  it('report má tabulku konfliktů po atributech a sekci no_fit po shopech', () => {
    const md = renderClusterReport(result);
    expect(md).toContain('## Zahozeno pro konflikt varianty podle atributu');
    expect(md).toContain('| voltage | 3 |');
    expect(md).toContain('| dimension | 1 |');
    expect(md).toContain('Zahozeno podle základu: model 1, fit_generic 0, no_fit 3');
    expect(md).toContain('## no_fit: páry bez modelu i bez fit_generic (3)');
    expect(md).toContain('| jawa-korda × motomax | 1 | 0 | 1 |');
    expect(md).toContain('| motokramek × motomax | 1 | 0 | 1 |');
  });

  it('bez no_fit párů vypíše prázdnou tabulku', () => {
    const md = renderClusterReport(findClusterPairs([src('motomax', 'Píst Jawa Pionýr 20', 100)]));
    expect(md).toContain('## no_fit: páry bez modelu i bez fit_generic (0)');
    expect(md).toContain('| — | 0 | 0 | 0 |');
  });
});

describe('renderClusterReport', () => {
  const result = findClusterPairs([
    src('jawa-korda', 'Šroub setrvačníku Babetta 207', 40, ['babetta-207']),
    src('motomax', 'Šroub setrvačníku BABETTA 207  *M', 60, ['babetta-207']),
    src('javarna', 'Šroub setrvačníku Babetta 207 skladem', 400, ['babetta-207']),
    src('motokramek', 'Píst Jawa Pionýr 20 38,75 / 14,1', 200),
    src('motojelinek', 'Píst Jawa Pionýr 20 38,50 / 14,1', 200),
  ]);

  it('vypíše počty A/B, konflikty, všechny páry A a top B s důvodem', () => {
    const md = renderClusterReport(result, { topB: 1 });
    expect(md).toContain('- A: **1**');
    expect(md).toContain('- B: **2**');
    expect(md).toContain('- zahozeno pro konflikt varianty: **1**');
    expect(md).toContain('## Páry A (1)');
    expect(md).toContain('`jawa-korda` Šroub setrvačníku Babetta 207 — 40 Kč');
    expect(md).toContain('`motomax` Šroub setrvačníku BABETTA 207  *M — 60 Kč');
    expect(md).toContain('## Top 1 párů B z 2 (s důvodem)');
    expect(md).toMatch(/cena ×\d/);
  });

  it('rankB řadí podle podobnosti a počtu důvodů', () => {
    const ranked = rankB(result.pairs);
    expect(ranked).toHaveLength(2);
    expect(ranked[0].priceRatio!).toBeLessThanOrEqual(ranked[1].priceRatio!);
  });
});
