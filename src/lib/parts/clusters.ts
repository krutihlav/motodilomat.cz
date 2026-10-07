import { parseOfferName, type OfferVariant, type ParsedOffer } from './parseOfferName';

export type FitGenericEntry = { brand: string; displacement?: number | null };

export type ClusterSource = {
  id: string;
  shopId: string;
  name: string;
  price: number | null;
  /** shop_product_models.model_id */
  modelIds: string[];
  /** shop_products.fit_generic */
  fitGeneric: FitGenericEntry[] | null;
};

export type ClusterItem = ClusterSource & { parsed: ParsedOffer; partWords: Set<string> };

export type PairBasis = 'model' | 'fit_generic' | 'no_fit';

export type PairClass = 'A' | 'B';

export type ClusterPair = {
  class: PairClass;
  a: ClusterItem;
  b: ClusterItem;
  basis: PairBasis;
  /** společné modely (basis = model), jinak klíč fit_generic */
  shared: string[];
  jaccard: number;
  /** poměr vyšší/nižší cena, null = některá cena chybí */
  priceRatio: number | null;
  /** proč pár není A (jen u B), případně zajímavé okolnosti */
  reasons: string[];
};

export type ClusterGroup = {
  partType: string;
  items: ClusterItem[];
  /** sjednocení společných modelů / fit klíčů přes páry shluku */
  shared: string[];
  pairs: number;
};

export type ClusterResult = {
  items: number;
  /** páry (z různých shopů, shodný model/fit) s Jaccard ≥ minJaccard, které se vyhodnocovaly */
  candidates: number;
  pairs: ClusterPair[];
  countA: number;
  countB: number;
  /** zahozeno pro konflikt varianty (oba atribut mají, hodnoty se liší) */
  droppedConflict: number;
  /** konflikty podle atributu (pár se počítá u každého konfliktního atributu) */
  conflictsByAttribute: Record<string, number>;
  byBasis: Record<PairBasis, { A: number; B: number }>;
  /** nabídky s víc rozdílnými partnery z jednoho shopu v A; jejich páry jsou přesunuty do B (ambiguous) */
  ambiguousItems: number;
  ambiguousPairs: number;
  /** shluky A (souvislé komponenty párů A): jeden díl -> všechny jeho nabídky */
  clusters: ClusterGroup[];
  /** zahozeno pro konflikt podle základu páru */
  droppedByBasis: Record<PairBasis, number>;
  /** páry se základem no_fit podle dvojice shopů ("javarna × motomax") */
  noFitByShopPair: Record<string, { A: number; B: number }>;
};

export type ClusterOptions = {
  maxPriceRatio?: number;
  minJaccard?: number;
};

export const VARIANT_ATTRIBUTES: (keyof OfferVariant)[] = [
  'dimension',
  'voltage',
  'side',
  'position',
  'finish',
  'color',
  'teeth',
  'pack',
  'size',
  'ref',
  'code',
  'with',
];

export function buildClusterItems(sources: ClusterSource[]): ClusterItem[] {
  return sources.map((source) => {
    const parsed = parseOfferName(source.name, { shopId: source.shopId });
    return {
      ...source,
      parsed,
      partWords: new Set(parsed.partType.split(' ').filter(Boolean)),
    };
  });
}

/** Klíč fit_generic: seřazené "brand|objem". '' = bez údaje. */
export function fitKey(fit: FitGenericEntry[] | null): string {
  return (fit ?? [])
    .map((entry) => `${entry.brand}|${entry.displacement ?? ''}`)
    .sort()
    .join(';');
}

/** Množina čísel z hodnoty rozměru: "m4x0.7-76" -> {4, 0.7, 76}. */
export function numberSet(value: string): Set<number> {
  return new Set([...value.matchAll(/\d+(?:\.\d+)?/g)].map((m) => Number(m[0])));
}

function sameSet<T>(a: Set<T>, b: Set<T>): boolean {
  return a.size === b.size && [...a].every((x) => b.has(x));
}

/**
 * Porovná dvě varianty. conflicts = atributy, které mají obě strany a hodnoty se liší;
 * oneSided = atributy, které má jen jedna strana. dimension se porovnává jako množina čísel,
 * ref a code jako množina tokenů.
 */
export function compareVariants(
  a: OfferVariant,
  b: OfferVariant,
): { conflicts: string[]; oneSided: string[] } {
  const conflicts: string[] = [];
  const oneSided: string[] = [];
  for (const key of VARIANT_ATTRIBUTES) {
    const va = a[key];
    const vb = b[key];
    if (va === null && vb === null) continue;
    if (va === null || vb === null) {
      oneSided.push(key);
      continue;
    }
    const equal =
      key === 'dimension'
        ? sameSet(numberSet(String(va)), numberSet(String(vb)))
        : key === 'ref' || key === 'code' || key === 'with'
          ? sameSet(new Set(String(va).split(' ')), new Set(String(vb).split(' ')))
          : va === vb;
    if (!equal) conflicts.push(key);
  }
  return { conflicts, oneSided };
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const word of a) if (b.has(word)) inter += 1;
  return inter / (a.size + b.size - inter);
}

export function priceRatio(a: number | null, b: number | null): number | null {
  if (a === null || b === null || a <= 0 || b <= 0) return null;
  return Math.max(a, b) / Math.min(a, b);
}

/** Skupiny kandidátů: podle sdíleného modelu; bez modelu podle shodného fit_generic. */
function buckets(items: ClusterItem[]): Map<string, ClusterItem[]> {
  const map = new Map<string, ClusterItem[]>();
  const add = (key: string, item: ClusterItem) => map.set(key, [...(map.get(key) ?? []), item]);
  for (const item of items) {
    if (item.modelIds.length > 0) {
      for (const modelId of new Set(item.modelIds)) add(`model|${modelId}`, item);
    } else {
      add(`fit|${fitKey(item.fitGeneric)}`, item);
    }
  }
  return map;
}

export function findClusterPairs(
  sources: ClusterSource[] | ClusterItem[],
  options: ClusterOptions = {},
): ClusterResult {
  const { maxPriceRatio = 2.5, minJaccard = 0.5 } = options;
  const items =
    sources.length > 0 && 'parsed' in sources[0]
      ? (sources as ClusterItem[])
      : buildClusterItems(sources as ClusterSource[]);

  const seen = new Set<string>();
  const pairs: ClusterPair[] = [];
  const result: ClusterResult = {
    items: items.length,
    candidates: 0,
    pairs,
    countA: 0,
    countB: 0,
    droppedConflict: 0,
    conflictsByAttribute: {},
    byBasis: {
      model: { A: 0, B: 0 },
      fit_generic: { A: 0, B: 0 },
      no_fit: { A: 0, B: 0 },
    },
    droppedByBasis: { model: 0, fit_generic: 0, no_fit: 0 },
    ambiguousItems: 0,
    ambiguousPairs: 0,
    clusters: [],
    noFitByShopPair: {},
  };

  for (const [key, members] of buckets(items)) {
    const isModel = key.startsWith('model|');
    for (let i = 0; i < members.length; i += 1) {
      const a = members[i];
      if (a.partWords.size === 0) continue;
      for (let j = i + 1; j < members.length; j += 1) {
        const b = members[j];
        if (a.shopId === b.shopId || b.partWords.size === 0) continue;
        const pairKey = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
        if (seen.has(pairKey)) continue;

        const sim = jaccard(a.partWords, b.partWords);
        if (sim < minJaccard) continue;
        seen.add(pairKey);
        result.candidates += 1;

        const basis: PairBasis = isModel ? 'model' : key === 'fit|' ? 'no_fit' : 'fit_generic';
        const { conflicts, oneSided } = compareVariants(a.parsed.variant, b.parsed.variant);
        if (conflicts.length > 0) {
          result.droppedConflict += 1;
          result.droppedByBasis[basis] += 1;
          for (const attribute of conflicts) {
            result.conflictsByAttribute[attribute] =
              (result.conflictsByAttribute[attribute] ?? 0) + 1;
          }
          continue;
        }

        const ratio = priceRatio(a.price, b.price);
        const sameType = a.parsed.partType === b.parsed.partType;
        const isA = sameType && oneSided.length === 0 && ratio !== null && ratio <= maxPriceRatio;
        const reasons: string[] = [];
        if (!sameType) reasons.push(`jaccard ${sim.toFixed(2)}`);
        if (oneSided.length > 0) reasons.push(`chybí: ${oneSided.join(',')}`);
        if (ratio === null) reasons.push('cena chybí');
        else if (ratio > maxPriceRatio) reasons.push(`cena ×${ratio.toFixed(1)}`);

        const shared = isModel
          ? [...new Set(a.modelIds)].filter((id) => new Set(b.modelIds).has(id))
          : [key.slice('fit|'.length)];
        pairs.push({
          class: isA ? 'A' : 'B',
          a,
          b,
          basis,
          shared,
          jaccard: sim,
          priceRatio: ratio,
          reasons,
        });
        if (isA) result.countA += 1;
        else result.countB += 1;
        result.byBasis[basis][isA ? 'A' : 'B'] += 1;
        if (basis === 'no_fit') {
          const shopPair = [a.shopId, b.shopId].sort().join(' × ');
          const entry = (result.noFitByShopPair[shopPair] ??= { A: 0, B: 0 });
          entry[isA ? 'A' : 'B'] += 1;
        }
      }
    }
  }
  markAmbiguous(result);
  result.clusters = buildClusters(result.pairs);
  return result;
}

/** Jsou dvě nabídky "totéž": stejný partType, shodná varianta (bez chybějících/konfliktních atributů) i poznámka? */
function sameOffer(x: ClusterItem, y: ClusterItem): boolean {
  if (x.parsed.partType !== y.parsed.partType) return false;
  const { conflicts, oneSided } = compareVariants(x.parsed.variant, y.parsed.variant);
  return (
    conflicts.length === 0 &&
    oneSided.length === 0 &&
    x.parsed.variant.note === y.parsed.variant.note
  );
}

/**
 * Nejednoznačnost: má-li nabídka v A víc partnerů z jednoho shopu a ti se mezi sebou liší
 * (partType, varianta nebo note), jdou všechny její páry z A do B (důvod ambiguous).
 * Partneři lišící se jen tagy a cenou jsou v pořádku.
 */
function markAmbiguous(result: ClusterResult): void {
  const partners = new Map<string, Map<string, ClusterItem[]>>();
  const add = (owner: ClusterItem, partner: ClusterItem) => {
    const byShop = partners.get(owner.id) ?? new Map<string, ClusterItem[]>();
    byShop.set(partner.shopId, [...(byShop.get(partner.shopId) ?? []), partner]);
    partners.set(owner.id, byShop);
  };
  for (const pair of result.pairs) {
    if (pair.class !== 'A') continue;
    add(pair.a, pair.b);
    add(pair.b, pair.a);
  }
  const ambiguous = new Set<string>();
  for (const [ownerId, byShop] of partners) {
    for (const list of byShop.values()) {
      if (list.length < 2) continue;
      const differs = list.some((x, i) => list.slice(i + 1).some((y) => !sameOffer(x, y)));
      if (differs) ambiguous.add(ownerId);
    }
  }
  result.ambiguousItems = ambiguous.size;
  for (const pair of result.pairs) {
    if (pair.class !== 'A' || !(ambiguous.has(pair.a.id) || ambiguous.has(pair.b.id))) continue;
    pair.class = 'B';
    pair.reasons.push('ambiguous');
    result.countA -= 1;
    result.countB += 1;
    result.byBasis[pair.basis].A -= 1;
    result.byBasis[pair.basis].B += 1;
    result.ambiguousPairs += 1;
    if (pair.basis === 'no_fit') {
      const entry = result.noFitByShopPair[[pair.a.shopId, pair.b.shopId].sort().join(' × ')];
      entry.A -= 1;
      entry.B += 1;
    }
  }
}

/** Shluky = souvislé komponenty grafu párů A (union-find). */
export function buildClusters(pairs: ClusterPair[]): ClusterGroup[] {
  const parent = new Map<string, string>();
  const find = (id: string): string => {
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root)!;
    parent.set(id, root);
    return root;
  };
  const items = new Map<string, ClusterItem>();
  const aPairs = pairs.filter((p) => p.class === 'A');
  for (const pair of aPairs) {
    for (const item of [pair.a, pair.b]) {
      items.set(item.id, item);
      if (!parent.has(item.id)) parent.set(item.id, item.id);
    }
    parent.set(find(pair.a.id), find(pair.b.id));
  }
  const groups = new Map<string, ClusterGroup>();
  for (const [id, item] of items) {
    const root = find(id);
    const group = groups.get(root) ?? {
      partType: item.parsed.partType,
      items: [],
      shared: [],
      pairs: 0,
    };
    group.items.push(item);
    groups.set(root, group);
  }
  for (const pair of aPairs) {
    const group = groups.get(find(pair.a.id))!;
    group.pairs += 1;
    for (const shared of pair.shared) if (!group.shared.includes(shared)) group.shared.push(shared);
  }
  const result = [...groups.values()];
  for (const group of result) {
    group.items.sort((x, y) => x.shopId.localeCompare(y.shopId) || x.name.localeCompare(y.name));
    group.shared.sort();
  }
  return result.sort(
    (x, y) =>
      x.partType.localeCompare(y.partType) ||
      y.items.length - x.items.length ||
      x.items[0].name.localeCompare(y.items[0].name),
  );
}

const money = (price: number | null) => (price === null ? '?' : `${price} Kč`);
const esc = (text: string) => text.replace(/\|/g, '\\|');

/** Pořadí B párů: nejdřív stejný partType, pak podle Jaccardu; dál méně důvodů a menší rozdíl cen. */
export function rankB(pairs: ClusterPair[]): ClusterPair[] {
  const sameType = (p: ClusterPair) => p.a.parsed.partType === p.b.parsed.partType;
  return pairs
    .filter((p) => p.class === 'B')
    .sort(
      (x, y) =>
        Number(sameType(y)) - Number(sameType(x)) ||
        y.jaccard - x.jaccard ||
        x.reasons.length - y.reasons.length ||
        (x.priceRatio ?? Infinity) - (y.priceRatio ?? Infinity) ||
        x.a.name.localeCompare(y.a.name),
    );
}

export function renderClusterReport(
  result: ClusterResult,
  options: { topB?: number } = {},
): string {
  const { topB = 200 } = options;
  const out: string[] = ['# Dry-run shlukování nabídek mezi shopy', ''];
  out.push(
    `Nabídek: **${result.items}**, vyhodnocených párů (jiný shop, shodný model/fit, Jaccard ≥ 0,5): **${result.candidates}**`,
  );
  out.push(`- A: **${result.countA}** párů ve **${result.clusters.length}** shlucích`);
  out.push(`- B: **${result.countB}**`);
  out.push(`- zahozeno pro konflikt varianty: **${result.droppedConflict}**`);
  out.push(
    `- podle základu: ${(['model', 'fit_generic', 'no_fit'] as const)
      .map((b) => `${b} A ${result.byBasis[b].A} / B ${result.byBasis[b].B}`)
      .join('; ')}`,
  );

  out.push('', '## Zahozeno pro konflikt varianty podle atributu', '');
  out.push(
    `Pár se počítá u každého konfliktního atributu (součet může být větší než ${result.droppedConflict}).`,
    '',
    '| atribut | párů |',
    '|---|---:|',
  );
  const conflicts = Object.entries(result.conflictsByAttribute).sort(
    (x, y) => y[1] - x[1] || x[0].localeCompare(y[0]),
  );
  for (const [attribute, n] of conflicts) out.push(`| ${attribute} | ${n} |`);
  if (conflicts.length === 0) out.push('| — | 0 |');
  out.push(
    '',
    `Zahozeno podle základu: ${(['model', 'fit_generic', 'no_fit'] as const)
      .map((b) => `${b} ${result.droppedByBasis[b]}`)
      .join(', ')}`,
  );

  const noFit = Object.entries(result.noFitByShopPair).sort(
    (x, y) => y[1].A + y[1].B - (x[1].A + x[1].B) || x[0].localeCompare(y[0]),
  );
  out.push(
    '',
    `## no_fit: páry bez modelu i bez fit_generic (${result.byBasis.no_fit.A + result.byBasis.no_fit.B})`,
    '',
    '| shopy | A | B | celkem |',
    '|---|---:|---:|---:|',
  );
  for (const [shops, n] of noFit) out.push(`| ${shops} | ${n.A} | ${n.B} | ${n.A + n.B} |`);
  if (noFit.length === 0) out.push('| — | 0 | 0 | 0 |');

  const clusterItems = result.clusters.reduce((sum, group) => sum + group.items.length, 0);
  out.push(
    '',
    `## Shluky A (${result.clusters.length} shluků, ${clusterItems} nabídek, ${result.countA} párů)`,
    '',
  );
  if (result.ambiguousItems > 0) {
    out.push(
      `Nejednoznačné: ${result.ambiguousItems} nabídek má v A víc rozdílných partnerů z jednoho shopu, jejich ${result.ambiguousPairs} párů je v B (důvod ambiguous).`,
      '',
    );
  }
  for (const group of result.clusters) {
    const shops = [...new Set(group.items.map((item) => item.shopId))].join(', ');
    out.push(
      `### ${esc(group.partType)} — ${group.items.length} nabídek (${shops}) [${esc(group.shared.join(', ') || '—')}]`,
    );
    for (const item of group.items) {
      out.push(`- \`${item.shopId}\` ${esc(item.name)} — ${money(item.price)}`);
    }
    out.push('');
  }

  const bRanked = rankB(result.pairs);
  out.push(
    '',
    `## Top ${Math.min(topB, bRanked.length)} párů B z ${bRanked.length} (s důvodem)`,
    '',
  );
  for (const pair of bRanked.slice(0, topB)) {
    out.push(
      `- ${pair.reasons.join('; ') || '—'} | ${esc(pair.a.parsed.partType)} ↔ ${esc(pair.b.parsed.partType)} [${pair.basis}: ${esc(pair.shared.join(', ') || '—')}]`,
      `  - \`${pair.a.shopId}\` ${esc(pair.a.name)} — ${money(pair.a.price)}`,
      `  - \`${pair.b.shopId}\` ${esc(pair.b.name)} — ${money(pair.b.price)}`,
    );
  }
  return `${out.join('\n')}\n`;
}
