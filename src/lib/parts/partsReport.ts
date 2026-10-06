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
  samples: { shopId: string; name: string; parsed: ParsedOffer }[];
  emptyPartType: { total: number; items: OfferRow[] };
};

export const VARIANT_KEYS: (keyof OfferVariant)[] = [
  'dimension',
  'voltage',
  'side',
  'position',
  'finish',
  'color',
  'teeth',
  'pack',
];

export type BuildOptions = {
  topLimit?: number;
  sampleSize?: number;
  emptyLimit?: number;
  seed?: number;
};

export function buildPartsReport(rows: OfferRow[], options: BuildOptions = {}): PartsReport {
  const { topLimit = 150, sampleSize = 60, emptyLimit = 300, seed = 20261006 } = options;
  const shops = [...new Set(rows.map((r) => r.shopId))].sort();
  const rowsByShop: Record<string, number> = { all: rows.length };
  const coverage: Record<string, Record<string, number>> = {};
  for (const key of [...VARIANT_KEYS, 'qualityTags', 'partType']) {
    coverage[key] = Object.fromEntries(['all', ...shops].map((s) => [s, 0]));
  }
  const types = new Map<string, { total: number; byShop: Record<string, number> }>();
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
