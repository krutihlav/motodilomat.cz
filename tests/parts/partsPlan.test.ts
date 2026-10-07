import { describe, expect, it } from 'vitest';
import { findClusterPairs, type ClusterSource } from '../../src/lib/parts/clusters';
import {
  buildPartPlans,
  lastCategoryLevel,
  pickCategory,
  renderPartPlans,
  shortestName,
  shortHash,
  slugify,
  stripShopMarkers,
  UNCATEGORIZED,
} from '../../src/lib/parts/partsPlan';

let seq = 0;
const src = (
  shopId: string,
  name: string,
  price: number,
  modelIds: string[],
  extra: Partial<ClusterSource> = {},
): ClusterSource => {
  seq += 1;
  return {
    id: `p-${String(seq).padStart(4, '0')}`,
    shopId,
    name,
    price,
    modelIds,
    fitGeneric: null,
    ...extra,
  };
};

describe('pomocné funkce', () => {
  it('slugify: bez diakritiky, spojovníky, bez okrajových', () => {
    expect(slugify('Šroub setrvačníku Babetta 207')).toBe('sroub-setrvacniku-babetta-207');
    expect(slugify('  Páčka (klíč) - 17mm!  ')).toBe('packa-klic-17mm');
    expect(slugify('x'.repeat(200)).length).toBeLessThanOrEqual(80);
  });

  it('shortHash je stabilní a krátký', () => {
    expect(shortHash('a|b|c')).toBe(shortHash('a|b|c'));
    expect(shortHash('a|b|c')).not.toBe(shortHash('a|b|d'));
    expect(shortHash('a|b|c')).toMatch(/^[0-9a-f]{8}$/);
  });

  it('stripShopMarkers odstraní *M, *JIKOV a ,,CZ', () => {
    expect(stripShopMarkers('Šroub setrvačníku BABETTA 228, 207  *M')).toBe(
      'Šroub setrvačníku BABETTA 228, 207',
    );
    expect(stripShopMarkers('Indukční cívka 12V s objímkou  ,,CZ')).toBe(
      'Indukční cívka 12V s objímkou',
    );
    expect(stripShopMarkers('Tryska M4 x 0,7 - 76 *JIKOV karb.')).toBe(
      'Tryska M4 x 0,7 - 76 karb.',
    );
  });

  it('shortestName: nejkratší název bez značek, při shodě abecedně', () => {
    expect(
      shortestName([
        'Šroub setrvačníku BABETTA 228, 207  *M',
        'Šroub setrvačníku Babetta 207',
        'Šroub setrvačníku Babetta 207 skladem',
      ]),
    ).toBe('Šroub setrvačníku Babetta 207');
    // *M se do délky nepočítá
    expect(shortestName(['Kryt A  *M', 'Kryt BB'])).toBe('Kryt A');
  });

  it('lastCategoryLevel: poslední úroveň, bez Nově naskladněno / Akce / Výprodej', () => {
    expect(lastCategoryLevel('Díly univerzální > Bowdeny, Náhony > Bowdeny')).toBe('Bowdeny');
    expect(lastCategoryLevel('Díly univerzální > Gumové díly')).toBe('Gumové díly');
    expect(lastCategoryLevel('Novinky, Nově naskladněno, Akce > Nově naskladněno')).toBeNull();
    expect(lastCategoryLevel('Novinky, Nově naskladněno, Akce > Akce')).toBeNull();
    expect(lastCategoryLevel('Díly > Výprodej')).toBeNull();
    expect(lastCategoryLevel(null)).toBeNull();
    expect(lastCategoryLevel('')).toBeNull();
  });
});

describe('pickCategory', () => {
  const clusterOf = (...sources: ClusterSource[]) => findClusterPairs(sources).clusters[0].items;

  it('bere kategorii jen z nabídek Motomaxu, nejčastější poslední úroveň', () => {
    const items = clusterOf(
      src('motomax', 'Šroub setrvačníku BABETTA 207  *M', 60, ['babetta-207'], {
        categoryText: 'Díly Babetta > Star M134/Stella > Motor > Spojka',
      }),
      src('javarna', 'Šroub setrvačníku Babetta 207', 50, ['babetta-207'], {
        categoryText: 'Šrouby > Jiné',
      }),
    );
    expect(pickCategory(items)).toBe('Spojka');
  });

  it('bez Motomaxu nebo jen s vyřazenými kategoriemi je "Nezařazeno"', () => {
    const noMotomax = clusterOf(
      src('jawa-korda', 'Šroub setrvačníku Babetta 207', 40, ['babetta-207'], {
        categoryText: 'A > B',
      }),
      src('javarna', 'Šroub setrvačníku Babetta 207', 50, ['babetta-207'], {
        categoryText: 'A > C',
      }),
    );
    expect(pickCategory(noMotomax)).toBe(UNCATEGORIZED);
    const onlyNew = clusterOf(
      src('motomax', 'Šroub setrvačníku BABETTA 207  *M', 60, ['babetta-207'], {
        categoryText: 'Novinky, Nově naskladněno, Akce > Nově naskladněno',
      }),
      src('javarna', 'Šroub setrvačníku Babetta 207', 50, ['babetta-207']),
    );
    expect(pickCategory(onlyNew)).toBe(UNCATEGORIZED);
  });
});

describe('buildPartPlans', () => {
  const sources = () => [
    src('jawa-korda', 'Šroub setrvačníku Babetta 207', 40, ['babetta-207'], {
      matchStatus: 'pending',
    }),
    src('motomax', 'Šroub setrvačníku BABETTA 228, 207  *M', 60, ['babetta-207', 'babetta-228'], {
      matchStatus: 'pending',
      categoryText: 'Díly Babetta > Babetta 207/228 > Motor > Setrvačník',
    }),
    src('javarna', 'Kryt řetězu Jawa Pionýr 20', 100, ['pionyr-20'], { matchStatus: 'auto' }),
    src('motokramek', 'Kryt řetězu Jawa Pionýr 20 - 2ks', 105, ['pionyr-20'], {
      matchStatus: 'pending',
    }),
  ];

  it('z každého shluku A vyrobí díl: název, slug s hashem, kategorie, modely, nabídky', () => {
    const plans = buildPartPlans(findClusterPairs(sources()).clusters);
    expect(plans).toHaveLength(1);
    const plan = plans[0];
    expect(plan.name).toBe('Šroub setrvačníku Babetta 207');
    expect(plan.slug).toBe(`sroub-setrvacniku-babetta-207-${shortHash(plan.clusterKey)}`);
    expect(plan.category).toBe('Setrvačník');
    expect(plan.models).toEqual(['babetta-207', 'babetta-228']);
    expect(plan.offers.map((o) => o.shopId).sort()).toEqual(['jawa-korda', 'motomax']);
    expect(plan.clusterKey).toBe('setrvacnik sroub||babetta-207,babetta-228');
  });

  it('cluster_key nezávisí na pořadí nabídek a obsahuje partType + variantu + modely', () => {
    const a = buildPartPlans(findClusterPairs(sources()).clusters);
    const b = buildPartPlans(findClusterPairs([...sources()].reverse()).clusters);
    expect(a[0].clusterKey).toBe(b[0].clusterKey);
    const withVariant = buildPartPlans(
      findClusterPairs([
        src('jawa-korda', 'Píst Jawa Pionýr 20 38,75 / 14,1', 200, ['pionyr-20']),
        src('motomax', 'Píst JAWA 50 - 20  38,75 / 14,1', 210, ['pionyr-20']),
      ]).clusters,
    );
    expect(withVariant[0].clusterKey).toBe('pist|dimension=14.1,38.75|pionyr-20');
    expect(withVariant[0].variant).toEqual({ dimension: '14.1,38.75' });
  });

  it('nabídky mimo povolené stavy (manual, ignored) se do dílů nedostanou', () => {
    const list = [
      src('jawa-korda', 'Šroub setrvačníku Babetta 207', 40, ['babetta-207'], {
        matchStatus: 'manual',
      }),
      src('motomax', 'Šroub setrvačníku BABETTA 207  *M', 60, ['babetta-207'], {
        matchStatus: 'pending',
      }),
    ];
    expect(buildPartPlans(findClusterPairs(list).clusters)).toEqual([]);
  });

  it('renderPartPlans vypíše name, slug, category, modely a nabídky', () => {
    const plans = buildPartPlans(findClusterPairs(sources()).clusters);
    const md = renderPartPlans(plans, { existing: 0, staleAuto: 3 });
    expect(md).toContain('Dílů: **1**, nabídek k přiřazení: **2**');
    expect(md).toContain('### 1. Šroub setrvačníku Babetta 207');
    expect(md).toContain(`slug: \`${plans[0].slug}\``);
    expect(md).toContain('category: Setrvačník');
    expect(md).toContain('modely: babetta-207, babetta-228');
    expect(md).toContain('`motomax` Šroub setrvačníku BABETTA 228, 207  *M — 60 Kč [pending]');
    expect(md).toContain('nových: 1');
    expect(md).toContain('mimo dnešní shluky (nechávám beze změny): 3');
    expect(renderPartPlans(plans, { columnsMissing: true })).toContain('migrace 015');
  });
});
