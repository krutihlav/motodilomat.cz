import { parseModels, type MatchLevel, type ParseResult } from './parseModels';
import { CANONICAL_MODELS, type CanonicalModel } from './seed';

/** Jedna (případně sloučená) položka dry-runu; count = kolik shop_products řádků sdílí název. */
export type DryRunRow = { shopId: string; name: string; count: number };

export type LevelKey = MatchLevel | 'none';
export const LEVEL_ORDER: LevelKey[] = ['type', 'nickname', 'displacement', 'brand', 'none'];

export const SUSPICIOUS_MODEL_LIMIT = 6;

export type RowResult = DryRunRow & { parse: ParseResult };

export type DryRunReport = {
  totalRows: number;
  byShop: Record<string, Record<LevelKey, number>>;
  totals: Record<LevelKey, number>;
  samples: RowResult[];
  noMatch: { count: number; samples: RowResult[] };
  unresolved: { brand: string; kind: string; token: string; count: number }[];
  tooManyModels: RowResult[];
  conflicts: RowResult[];
};

const emptyLevels = (): Record<LevelKey, number> => ({
  type: 0,
  nickname: 0,
  displacement: 0,
  brand: 0,
  none: 0,
});

/** Deterministický PRNG (mulberry32), aby šel report zopakovat. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sample<T>(items: T[], size: number, random: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, size);
}

/** Konflikt = modely z různých značek nebo řad (např. Babetta + Jawa 50 + Stadion). */
export function findConflict(slugs: string[], models: readonly CanonicalModel[]): string[] | null {
  const bySlug = new Map(models.map((m) => [m.slug, m]));
  const families = new Set(slugs.map((s) => bySlug.get(s)?.family).filter((f): f is string => !!f));
  return families.size > 1 ? [...families].sort() : null;
}

export function buildReport(
  rows: DryRunRow[],
  options: {
    /** řádky bez jakéhokoli klíčového slova v názvu (nepředány parseru, počítají se jako 'none') */
    noCueByShop?: Record<string, number>;
    seed?: number;
    models?: readonly CanonicalModel[];
  } = {},
): DryRunReport {
  const models = options.models ?? CANONICAL_MODELS;
  const random = seededRandom(options.seed ?? 20260930);
  const results: RowResult[] = rows.map((row) => ({
    ...row,
    parse: parseModels(row.name, { shopId: row.shopId, models }),
  }));

  const byShop: Record<string, Record<LevelKey, number>> = {};
  const totals = emptyLevels();
  let totalRows = 0;
  const unresolvedMap = new Map<
    string,
    { brand: string; kind: string; token: string; count: number }
  >();

  for (const result of results) {
    const key: LevelKey = result.parse.level ?? 'none';
    byShop[result.shopId] ??= emptyLevels();
    byShop[result.shopId][key] += result.count;
    totals[key] += result.count;
    totalRows += result.count;
    for (const token of result.parse.unresolved) {
      const id = `${token.brand}|${token.kind}|${token.token}`;
      const entry = unresolvedMap.get(id) ?? { ...token, count: 0 };
      entry.count += result.count;
      unresolvedMap.set(id, entry);
    }
  }
  for (const [shopId, count] of Object.entries(options.noCueByShop ?? {})) {
    byShop[shopId] ??= emptyLevels();
    byShop[shopId].none += count;
    totals.none += count;
    totalRows += count;
  }

  const matched = results.filter((r) => r.parse.level !== null);
  const unmatched = results.filter((r) => r.parse.level === null);
  const noCueTotal = Object.values(options.noCueByShop ?? {}).reduce((a, b) => a + b, 0);

  return {
    totalRows,
    byShop,
    totals,
    samples: sample(matched, 30, random),
    noMatch: {
      count: unmatched.reduce((sum, r) => sum + r.count, 0) + noCueTotal,
      samples: sample(unmatched, 20, random),
    },
    unresolved: [...unresolvedMap.values()].sort(
      (a, b) => b.count - a.count || a.token.localeCompare(b.token),
    ),
    tooManyModels: results.filter((r) => r.parse.models.length > SUSPICIOUS_MODEL_LIMIT),
    conflicts: results.filter(
      (r) =>
        findConflict(
          r.parse.models.map((m) => m.slug),
          models,
        ) !== null,
    ),
  };
}

const pct = (part: number, total: number) =>
  total === 0 ? '0 %' : `${((part / total) * 100).toFixed(1)} %`;

function describe(result: RowResult): string {
  const { parse } = result;
  const models = parse.models.map((m) => `${m.slug}`).join(', ');
  const generic = parse.generic
    .filter((g) => g.level === parse.level)
    .map((g) => (g.displacement ? `${g.brand} ${g.displacement} ccm` : g.brand))
    .join(', ');
  return `${result.name} → ${models || generic || '—'} → ${parse.level ?? 'none'}`;
}

export function renderReport(
  report: DryRunReport,
  models: readonly CanonicalModel[] = CANONICAL_MODELS,
): string {
  const out: string[] = [];
  out.push('# Dry-run: párování dílů podle modelu (nic se nezapisuje)', '');
  out.push(`Celkem pending řádků: **${report.totalRows}**`, '');

  out.push('## Pokrytí po shopech a match_level', '');
  out.push(`| shop | řádků | ${LEVEL_ORDER.join(' | ')} | pokryto modelem (type+nickname) |`);
  out.push(`|---|---:|${LEVEL_ORDER.map(() => '---:').join('|')}|---:|`);
  const shops = Object.keys(report.byShop).sort();
  const row = (label: string, levels: Record<LevelKey, number>) => {
    const total = LEVEL_ORDER.reduce((sum, k) => sum + levels[k], 0);
    out.push(
      `| ${label} | ${total} | ${LEVEL_ORDER.map((k) => `${levels[k]} (${pct(levels[k], total)})`).join(' | ')} | ${pct(levels.type + levels.nickname, total)} |`,
    );
  };
  for (const shop of shops) row(shop, report.byShop[shop]);
  row('**celkem**', report.totals);
  out.push('');

  out.push('## 30 náhodných ukázek (název → modely → úroveň)', '');
  for (const sample of report.samples) out.push(`- ${describe(sample)}`);
  out.push('');

  out.push(`## Řádky bez shody: ${report.noMatch.count}`, '', '20 ukázek:', '');
  for (const sample of report.noMatch.samples) out.push(`- [${sample.shopId}] ${sample.name}`);
  out.push('');

  out.push('## Nerozřešené tokeny (četnost v řádcích)', '');
  out.push('| značka/kontext | typ | token | řádků |', '|---|---|---|---:|');
  for (const token of report.unresolved.slice(0, 80)) {
    out.push(`| ${token.brand || '—'} | ${token.kind} | ${token.token} | ${token.count} |`);
  }
  if (report.unresolved.length > 80)
    out.push(`| … | | dalších ${report.unresolved.length - 80} tokenů | |`);
  out.push('');

  out.push('## Podezřelé případy', '');
  out.push(
    `### Jeden díl na víc než ${SUSPICIOUS_MODEL_LIMIT} modelů: ${report.tooManyModels.length} názvů`,
    '',
  );
  for (const r of report.tooManyModels.slice(0, 30))
    out.push(`- ${describe(r)} (${r.parse.models.length} modelů)`);
  out.push('', `### Konflikty mezi řadami: ${report.conflicts.length} názvů`, '');
  for (const r of report.conflicts.slice(0, 30)) {
    const families = findConflict(
      r.parse.models.map((m) => m.slug),
      models,
    );
    out.push(`- ${describe(r)} [${families?.join(' + ')}]`);
  }
  out.push('');
  return out.join('\n');
}
