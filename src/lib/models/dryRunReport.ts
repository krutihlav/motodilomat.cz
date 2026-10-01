import { parseModels, type MatchLevel, type ParseResult } from './parseModels';
import { nameExclusion } from '../feed/itemQuality';
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
  /** Totéž bez řádků, které nová pravidla vyřadí (merch, Simson bez naší značky). */
  filtered: {
    excluded: { merch: number; simson_only: number };
    byShop: Record<string, Record<LevelKey, number>>;
    totals: Record<LevelKey, number>;
    totalRows: number;
    /** řádků s ≥1 vazbou na model a vazeb shop_product_models, které by zápis vytvořil */
    rowsWithLinks: number;
    links: { total: number; type: number; nickname: number };
    rowsWithGeneric: number;
  };
  extras: {
    /** nezařazený token "206": počet řádků a až 10 různých názvů */
    token206: { rows: number; names: string[] };
    /** díly mapované zároveň na Jawettu a Stadion */
    jawettaAndStadion: number;
    /** díly s vazbou na víc objemů ČZ */
    multipleCzDisplacements: number;
    /** řádky s "350 OHC" (moderní Jawa, flag modern_jawa) */
    modernOhc: number;
  };
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

  const filtered: DryRunReport['filtered'] = {
    excluded: { merch: 0, simson_only: 0 },
    byShop: {},
    totals: emptyLevels(),
    totalRows: 0,
    rowsWithLinks: 0,
    links: { total: 0, type: 0, nickname: 0 },
    rowsWithGeneric: 0,
  };
  for (const result of results) {
    const excluded = nameExclusion(result.name);
    if (excluded) {
      filtered.excluded[excluded] += result.count;
      continue;
    }
    const key: LevelKey = result.parse.level ?? 'none';
    filtered.byShop[result.shopId] ??= emptyLevels();
    filtered.byShop[result.shopId][key] += result.count;
    filtered.totals[key] += result.count;
    filtered.totalRows += result.count;
    if (result.parse.models.length > 0) filtered.rowsWithLinks += result.count;
    if (result.parse.generic.length > 0) filtered.rowsWithGeneric += result.count;
    for (const hit of result.parse.models) {
      filtered.links.total += result.count;
      filtered.links[hit.level] += result.count;
    }
  }
  // Řádky bez klíčového slova se parseru nepředávají (nemají shodu); nepatří k merchi ani Simsonu.
  for (const [shopId, count] of Object.entries(options.noCueByShop ?? {})) {
    filtered.byShop[shopId] ??= emptyLevels();
    filtered.byShop[shopId].none += count;
    filtered.totals.none += count;
    filtered.totalRows += count;
  }

  const bySlug = new Map(models.map((m) => [m.slug, m]));
  const extras: DryRunReport['extras'] = {
    token206: { rows: 0, names: [] },
    jawettaAndStadion: 0,
    multipleCzDisplacements: 0,
    modernOhc: 0,
  };
  for (const result of results) {
    const slugs = result.parse.models.map((m) => m.slug);
    if (result.parse.unresolved.some((u) => u.token === '206')) {
      extras.token206.rows += result.count;
      if (extras.token206.names.length < 10)
        extras.token206.names.push(`[${result.shopId}] ${result.name}`);
    }
    if (slugs.some((s) => s.startsWith('jawetta')) && slugs.some((s) => s.startsWith('stadion'))) {
      extras.jawettaAndStadion += result.count;
    }
    const czDisplacements = new Set(
      slugs
        .map((s) => bySlug.get(s))
        .filter((m) => m && (m.brand === 'ČZ' || m.family === 'Jawa-ČZ') && m.family !== 'Čezeta')
        .map((m) => m!.displacement),
    );
    if (czDisplacements.size > 1) extras.multipleCzDisplacements += result.count;
    if (/\b350\s*ohc\b/i.test(result.name)) extras.modernOhc += result.count;
  }

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
    filtered,
    extras,
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

  const f = report.filtered;
  out.push('## Po vyřazení merche a Simsonu (nová pravidla kvality)', '');
  out.push(
    `Vyřazeno: merch ${f.excluded.merch}, Simson bez naší značky ${f.excluded.simson_only}. Zbývá **${f.totalRows}** řádků.`,
    '',
  );
  out.push(`| shop | řádků | ${LEVEL_ORDER.join(' | ')} | pokryto modelem (type+nickname) |`);
  out.push(`|---|---:|${LEVEL_ORDER.map(() => '---:').join('|')}|---:|`);
  const rowF = (label: string, levels: Record<LevelKey, number>) => {
    const total = LEVEL_ORDER.reduce((sum, k) => sum + levels[k], 0);
    out.push(
      `| ${label} | ${total} | ${LEVEL_ORDER.map((k) => `${levels[k]} (${pct(levels[k], total)})`).join(' | ')} | ${pct(levels.type + levels.nickname, total)} |`,
    );
  };
  for (const shop of Object.keys(f.byShop).sort()) rowF(shop, f.byShop[shop]);
  rowF('**celkem**', f.totals);
  out.push('');
  out.push('### Co by zápis vytvořil', '');
  out.push(
    `- shop_products k aktualizaci (model_match_level, fit_generic): **${f.totalRows}** řádků`,
  );
  out.push(`- řádků s ≥1 vazbou na konkrétní model: **${f.rowsWithLinks}**`);
  out.push(
    `- vazeb shop_product_models: **${f.links.total}** (type ${f.links.type}, nickname ${f.links.nickname})`,
  );
  out.push(`- řádků s fit_generic (displacement / brand): **${f.rowsWithGeneric}**`);
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

  const { extras } = report;
  out.push('## Doplňující čísla', '');
  out.push(`- Díly mapované zároveň na Jawettu a Stadion: **${extras.jawettaAndStadion}** řádků`);
  out.push(`- Díly s vazbou na víc objemů ČZ: **${extras.multipleCzDisplacements}** řádků`);
  out.push(`- Řádky s „350 OHC“ (moderní Jawa, flag modern_jawa): **${extras.modernOhc}**`);
  out.push(`- Token „206“ (nezařazený): **${extras.token206.rows}** řádků, příklady názvů:`, '');
  for (const name of extras.token206.names) out.push(`  - ${name}`);
  out.push('');
  return out.join('\n');
}
