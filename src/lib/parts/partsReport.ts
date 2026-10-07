import { seededRandom } from '../models/dryRunReport';
import { parseOfferName, type OfferVariant, type ParsedOffer } from './parseOfferName';

export type OfferRow = { shopId: string; name: string };

export type PartsReport = {
  total: number;
  shops: string[];
  rowsByShop: Record<string, number>;
  /** Podíl řádků s vyplněným atributem: [atribut][shop|'all'] = počet */
  coverage: Record<string, Record<string, number>>;
  /** partType -> { total, byShop } seřazeno podle total sestupně, max `topLimit` */
  topPartTypes: { partType: string; total: number; byShop: Record<string, number> }[];
  distinctPartTypes: number;
  /** qualityTag -> počty, top `tagLimit` */
  topQualityTags: { tag: string; total: number; byShop: Record<string, number> }[];
  /** variant.ref / variant.code -> počty (víc hodnot v jedné nabídce se počítá zvlášť), top `tagLimit` */
  topRefs: { value: string; total: number; byShop: Record<string, number> }[];
  topCodes: { value: string; total: number; byShop: Record<string, number> }[];
  /** partType, které se liší přesně jedním slovem (záměna nebo přidané/chybějící slovo) */
  nearPairs: NearPair[];
  samples: { shopId: string; name: string; parsed: ParsedOffer }[];
  emptyPartType: { total: number; items: OfferRow[] };
};

export type NearPair = {
  a: string;
  b: string;
  countA: number;
  countB: number;
  /** slova, ve kterých se liší: [jen v a, jen v b] ('' = chybí) */
  diff: [string, string];
};

/**
 * Dvojice partType lišící se jedním slovem: stejný počet slov a jedno jiné,
 * nebo jedno slovo navíc. Seřazeno podle součtu počtů nabídek.
 */
export function findNearPairs(counts: Map<string, number>, limit = 100): NearPair[] {
  const sets = new Map([...counts.keys()].map((t) => [t, t.split(' ').filter(Boolean)]));
  // klíč = typ bez jednoho slova (nebo celý typ) -> typy, které ho obsahují
  const byKey = new Map<string, string[]>();
  const add = (key: string, type: string) => byKey.set(key, [...(byKey.get(key) ?? []), type]);
  for (const [type, words] of sets) {
    if (words.length < 1) continue;
    add(`full|${type}`, type);
    for (let i = 0; i < words.length; i += 1) {
      add(`minus|${words.filter((_, j) => j !== i).join(' ')}`, type);
    }
  }
  const seen = new Set<string>();
  const pairs: NearPair[] = [];
  const push = (a: string, b: string) => {
    const key = a < b ? `${a}\n${b}` : `${b}\n${a}`;
    if (a === b || seen.has(key)) return;
    seen.add(key);
    const wa = new Set(sets.get(a));
    const wb = new Set(sets.get(b));
    const onlyA = [...wa].filter((w) => !wb.has(w));
    const onlyB = [...wb].filter((w) => !wa.has(w));
    if (onlyA.length > 1 || onlyB.length > 1 || onlyA.length + onlyB.length === 0) return;
    const countA = counts.get(a) ?? 0;
    const countB = counts.get(b) ?? 0;
    // kanonické pořadí: častější typ první (při shodě abecedně)
    const swap = countB > countA || (countB === countA && b < a);
    pairs.push(
      swap
        ? { a: b, b: a, countA: countB, countB: countA, diff: [onlyB[0] ?? '', onlyA[0] ?? ''] }
        : { a, b, countA, countB, diff: [onlyA[0] ?? '', onlyB[0] ?? ''] },
    );
  };
  for (const [key, types] of byKey) {
    if (key.startsWith('minus|')) {
      const rest = key.slice('minus|'.length);
      // záměna jednoho slova (aspoň jedno společné slovo, jinak by se párovaly všechny jednoslovné typy)
      if (rest !== '') {
        for (let i = 0; i < types.length; i += 1)
          for (let j = i + 1; j < types.length; j += 1) push(types[i], types[j]);
      }
      // přidané slovo: typ == zbytek
      if (counts.has(rest)) for (const t of types) push(t, rest);
    }
  }
  return pairs
    .sort((x, y) => y.countA + y.countB - (x.countA + x.countB) || x.a.localeCompare(y.a))
    .slice(0, limit);
}

export const VARIANT_KEYS: (keyof OfferVariant)[] = [
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
];

export type BuildOptions = {
  topLimit?: number;
  sampleSize?: number;
  emptyLimit?: number;
  tagLimit?: number;
  pairLimit?: number;
  seed?: number;
};

export function buildPartsReport(rows: OfferRow[], options: BuildOptions = {}): PartsReport {
  const {
    topLimit = 150,
    sampleSize = 60,
    emptyLimit = 300,
    tagLimit = 40,
    pairLimit = 100,
    seed = 20261006,
  } = options;
  const shops = [...new Set(rows.map((r) => r.shopId))].sort();
  const rowsByShop: Record<string, number> = { all: rows.length };
  const coverage: Record<string, Record<string, number>> = {};
  for (const key of [...VARIANT_KEYS, 'qualityTags', 'partType']) {
    coverage[key] = Object.fromEntries(['all', ...shops].map((s) => [s, 0]));
  }
  const types = new Map<string, { total: number; byShop: Record<string, number> }>();
  const tagCounts = new Map<string, { total: number; byShop: Record<string, number> }>();
  const refCounts = new Map<string, { total: number; byShop: Record<string, number> }>();
  const codeCounts = new Map<string, { total: number; byShop: Record<string, number> }>();
  const parsedRows: { row: OfferRow; parsed: ParsedOffer }[] = [];
  const empty: OfferRow[] = [];

  for (const row of rows) {
    rowsByShop[row.shopId] = (rowsByShop[row.shopId] ?? 0) + 1;
    const parsed = parseOfferName(row.name, { shopId: row.shopId });
    parsedRows.push({ row, parsed });
    const bump = (key: string) => {
      coverage[key].all += 1;
      coverage[key][row.shopId] += 1;
    };
    for (const key of VARIANT_KEYS) if (parsed.variant[key] !== null) bump(key);
    if (parsed.qualityTags.length > 0) bump('qualityTags');
    for (const [value, counts] of [
      [parsed.variant.ref, refCounts],
      [parsed.variant.code, codeCounts],
    ] as const) {
      for (const item of value?.split(' ') ?? []) {
        const entry = counts.get(item) ?? { total: 0, byShop: {} };
        entry.total += 1;
        entry.byShop[row.shopId] = (entry.byShop[row.shopId] ?? 0) + 1;
        counts.set(item, entry);
      }
    }
    for (const tag of parsed.qualityTags) {
      const entry = tagCounts.get(tag) ?? { total: 0, byShop: {} };
      entry.total += 1;
      entry.byShop[row.shopId] = (entry.byShop[row.shopId] ?? 0) + 1;
      tagCounts.set(tag, entry);
    }
    if (parsed.partType === '') {
      empty.push(row);
      continue;
    }
    bump('partType');
    const entry = types.get(parsed.partType) ?? { total: 0, byShop: {} };
    entry.total += 1;
    entry.byShop[row.shopId] = (entry.byShop[row.shopId] ?? 0) + 1;
    types.set(parsed.partType, entry);
  }

  const topPartTypes = [...types.entries()]
    .map(([partType, v]) => ({ partType, ...v }))
    .sort((a, b) => b.total - a.total || a.partType.localeCompare(b.partType))
    .slice(0, topLimit);

  const topQualityTags = [...tagCounts.entries()]
    .map(([tag, v]) => ({ tag, ...v }))
    .sort((a, b) => b.total - a.total || a.tag.localeCompare(b.tag))
    .slice(0, tagLimit);
  const top = (counts: typeof refCounts) =>
    [...counts.entries()]
      .map(([value, v]) => ({ value, ...v }))
      .sort((a, b) => b.total - a.total || a.value.localeCompare(b.value))
      .slice(0, tagLimit);
  const nearPairs = findNearPairs(
    new Map([...types.entries()].map(([t, v]) => [t, v.total])),
    pairLimit,
  );

  const random = seededRandom(seed);
  const pool = [...parsedRows];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const samples = pool.slice(0, sampleSize).map(({ row, parsed }) => ({ ...row, parsed }));

  return {
    total: rows.length,
    shops,
    rowsByShop,
    coverage,
    topPartTypes,
    distinctPartTypes: types.size,
    topQualityTags,
    topRefs: top(refCounts),
    topCodes: top(codeCounts),
    nearPairs,
    samples,
    emptyPartType: { total: empty.length, items: empty.slice(0, emptyLimit) },
  };
}

const pct = (n: number, total: number) =>
  total === 0 ? '0 %' : `${((n / total) * 100).toFixed(1)} %`;
const esc = (s: string) => s.replace(/\|/g, '\\|');

export function renderPartsReport(report: PartsReport): string {
  const cols = ['all', ...report.shops];
  const out: string[] = ['# Dry-run: rozklad názvů nabídek na díl a varianty', ''];
  out.push(
    `Řádků (match_status <> 'ignored'): **${report.total}**, unikátních partType: **${report.distinctPartTypes}**`,
    '',
  );

  out.push(
    '## Pokrytí atributů',
    '',
    `| atribut | ${cols.join(' | ')} |`,
    `|---|${cols.map(() => '---:').join('|')}|`,
  );
  out.push(`| (řádků) | ${cols.map((c) => report.rowsByShop[c] ?? 0).join(' | ')} |`);
  for (const [key, byShop] of Object.entries(report.coverage)) {
    out.push(
      `| ${key} | ${cols.map((c) => `${byShop[c]} (${pct(byShop[c], report.rowsByShop[c] ?? 0)})`).join(' | ')} |`,
    );
  }

  out.push('', `## Top ${report.topPartTypes.length} partType (počty podle shopů)`, '');
  out.push(
    `| # | partType | celkem | ${report.shops.join(' | ')} |`,
    `|---:|---|---:|${report.shops.map(() => '---:').join('|')}|`,
  );
  report.topPartTypes.forEach((t, i) => {
    out.push(
      `| ${i + 1} | ${esc(t.partType)} | ${t.total} | ${report.shops.map((s) => t.byShop[s] ?? 0).join(' | ')} |`,
    );
  });

  out.push('', `## Top ${report.topQualityTags.length} qualityTags`, '');
  out.push(
    `| tag | celkem | ${report.shops.join(' | ')} |`,
    `|---|---:|${report.shops.map(() => '---:').join('|')}|`,
  );
  for (const t of report.topQualityTags) {
    out.push(
      `| ${esc(t.tag)} | ${t.total} | ${report.shops.map((s) => t.byShop[s] ?? 0).join(' | ')} |`,
    );
  }

  for (const [title, items] of [
    ['variant.ref', report.topRefs],
    ['variant.code', report.topCodes],
  ] as const) {
    out.push('', `## Top ${items.length} ${title}`, '');
    out.push(
      `| hodnota | celkem | ${report.shops.join(' | ')} |`,
      `|---|---:|${report.shops.map(() => '---:').join('|')}|`,
    );
    for (const t of items) {
      out.push(
        `| ${esc(t.value)} | ${t.total} | ${report.shops.map((s) => t.byShop[s] ?? 0).join(' | ')} |`,
      );
    }
  }

  out.push('', `## Dvojice partType lišící se jedním slovem (top ${report.nearPairs.length})`, '');
  out.push('| partType A | n | partType B | n | rozdíl |', '|---|---:|---|---:|---|');
  for (const pr of report.nearPairs) {
    out.push(
      `| ${esc(pr.a)} | ${pr.countA} | ${esc(pr.b)} | ${pr.countB} | ${pr.diff[0] || '∅'} ↔ ${pr.diff[1] || '∅'} |`,
    );
  }

  out.push('', `## ${report.samples.length} náhodných rozkladů`, '');
  for (const s of report.samples) {
    const variant = Object.entries(s.parsed.variant)
      .filter(([, v]) => v !== null)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ');
    out.push(`- \`${s.shopId}\` ${esc(s.name)}`);
    out.push(
      `  - partType: **${s.parsed.partType || '∅'}**; variant: ${variant || '—'}; tags: ${s.parsed.qualityTags.join(', ') || '—'}`,
    );
  }

  out.push('', `## Nabídky s prázdným partType (${report.emptyPartType.total})`, '');
  if (report.emptyPartType.total > report.emptyPartType.items.length) {
    out.push(`Vypsáno prvních ${report.emptyPartType.items.length}.`, '');
  }
  for (const item of report.emptyPartType.items) out.push(`- \`${item.shopId}\` ${esc(item.name)}`);
  return `${out.join('\n')}\n`;
}
