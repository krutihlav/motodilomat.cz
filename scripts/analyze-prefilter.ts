#!/usr/bin/env tsx
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createServiceRoleClient } from '../src/lib/supabase/server';
import { isBrandLikeName } from '../src/lib/crawl/brandName';
import { isRelevantSlug, slugText } from '../src/lib/crawl/slugRelevance';
import { CANONICAL_MODELS } from '../src/lib/models/seed';
import { normalize } from '../src/lib/feed/relevanceFilter';
import { shuffle } from '../src/lib/util/shuffle';

/**
 * Offline analýza artefaktu dry-run-sitemap-prefilter (sitemap-urls.txt):
 * vzory produktových URL, varianty předfiltru a recall na URL z DB.
 * Na shopy neposílá žádné requesty; z DB jen čte.
 *
 * Použití: tsx scripts/analyze-prefilter.ts <shop_id> --dir=<složka artefaktu>
 */

const SECONDS_PER_REQUEST = 3.0; // naměřeno: 177 URL / 535 s při refreshi

type DbRow = { url: string; name: string };

const pathOf = (url: string): string => {
  try {
    return new URL(url).pathname;
  } catch {
    return '';
  }
};
const keyOf = (url: string): string => pathOf(url).replace(/\/+$/, '').toLowerCase();
const depthOf = (url: string): number => pathOf(url).split('/').filter(Boolean).length;

async function loadDbRows(shopId: string): Promise<DbRow[]> {
  const client = createServiceRoleClient();
  const rows: DbRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await client
      .from('shop_products')
      .select('url, name')
      .eq('shop_id', shopId)
      .order('id')
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) return rows;
  }
}

// ---------- tokenizace slugu ----------

function tokensOf(url: string): string[] {
  const base = normalize(slugText(url))
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  const out = new Set<string>(base);
  for (const token of base) {
    // j350 -> j, 350; cz125 -> cz, 125; b207 -> b, 207; 150c -> 150, c
    for (const part of token.match(/[a-z]+|\d+/g) ?? []) out.add(part);
    // slepená dvě trojciferná čísla (634638 -> 634, 638)
    if (/^\d{6}$/.test(token)) {
      out.add(token.slice(0, 3));
      out.add(token.slice(3));
    }
  }
  return [...out];
}

const TYPE_NUMBERS = new Set(
  CANONICAL_MODELS.flatMap((m) => m.typeNumbers).filter((t) => /^\d{3}$/.test(t)),
);

/** Předpony slov (tvary: pionyra, peraku, kyvacky, babetty...). */
const OWN_PREFIXES = [
  'jaw', 'babet', 'pionyr', 'perak', 'kyvack', 'panelk', 'stadion', 'jawett', 'cezet',
  'velorex', 'mustang', 'sportk', 'californian', 'mototechn',
];
/** Celé tokeny (zkratky), které samy o sobě nesou naši značku/model. */
const OWN_TOKENS = new Set([
  'cz', 'bab', 'pio', 'per', 'kyv', 'pan', 'bct', 'bd', 's11', 's22', 's23', 'jikov',
]);

function hasOwnToken(tokens: string[]): boolean {
  return tokens.some(
    (t) =>
      OWN_TOKENS.has(t) ||
      OWN_PREFIXES.some((p) => t.startsWith(p)) ||
      /^j\d{3}$/.test(t) || // j350, j250
      /^b2\d\d$/.test(t) || // b207, b210, b225
      /^cz\d{3}/.test(t), // cz125, cz150c
  );
}

/** (a) původní předfiltr + zkratky, tvary a typová čísla ze seedu. */
function variantA(url: string): boolean {
  if (isRelevantSlug(url)) return true;
  const tokens = tokensOf(url);
  return hasOwnToken(tokens) || tokens.some((t) => TYPE_NUMBERS.has(t));
}

/** Cizí značky/modely - slova celá (po tokenizaci). */
const FOREIGN_TOKENS = new Set([
  'simson', 'mz', 'mza', 'etz', 'ts', 'tatran', 'korado', 'sr50', 'sr80', 'bvf', 'skoda',
  's50', 's51', 's53', 's60', 's70', 's85', 'schwalbe', 'star', 'duo', 'kr51', 'sperber',
  'habicht', 'mzt', 'zundapp', 'kreidler', 'honda', 'yamaha', 'suzuki', 'kawasaki',
  'minsk', 'iz', 'ural', 'dnepr', 'peugeot', 'piaggio', 'vespa', 'puch', 'mokick',
  'enduro', 'pitbike',
]);
const FOREIGN_PREFIXES = ['simson', 'korado', 'tatran', 'ruda'];

function hasForeign(tokens: string[]): boolean {
  return tokens.some((t) => FOREIGN_TOKENS.has(t) || FOREIGN_PREFIXES.some((p) => t.startsWith(p)));
}

/** (b1) pustit vše kromě cizích značek. */
function variantB1(url: string): boolean {
  return !hasForeign(tokensOf(url));
}

/** (b2) pustit vše kromě cizích značek, pokud URL nenese zároveň naši značku/typ. */
function variantB2(url: string): boolean {
  const tokens = tokensOf(url);
  if (!hasForeign(tokens)) return true;
  return variantA(url);
}

// ---------- vzory produktových URL ----------

type ProductPattern = { name: string; test: (url: string) => boolean };

function derivePattern(shopId: string, allUrls: string[]): ProductPattern {
  if (shopId === 'jawa-korda') {
    return { name: '/…_z<číslo>/ (kategorie jsou _k<číslo>)', test: (u) => /_z\d+\/?$/.test(pathOf(u)) };
  }
  if (shopId === 'motojelinek') {
    return { name: 'cesta začíná /p/', test: (u) => pathOf(u).startsWith('/p/') };
  }
  // motokramek (a obecně): produkt = jednosegmentová cesta, která není prvním segmentem
  // žádné hlubší URL (tj. není to kategorie s podkategoriemi/filtry).
  const parents = new Set<string>();
  for (const u of allUrls) {
    const segs = pathOf(u).split('/').filter(Boolean);
    if (segs.length >= 2) parents.add(segs[0].toLowerCase());
  }
  return {
    name: 'jednosegmentová cesta, která není nadřazenou kategorií hlubších URL',
    test: (u) => {
      const segs = pathOf(u).split('/').filter(Boolean);
      return segs.length === 1 && !parents.has(segs[0].toLowerCase());
    },
  };
}

function pct(part: number, whole: number): string {
  return whole ? `${((part / whole) * 100).toFixed(1)} %` : '—';
}
function hours(requests: number): string {
  return `${((requests * SECONDS_PER_REQUEST) / 3600).toFixed(1)} h`;
}

async function main() {
  const args = process.argv.slice(2);
  const shopId = args.find((a) => !a.startsWith('--'));
  const dir = args.find((a) => a.startsWith('--dir='))?.slice('--dir='.length);
  if (!shopId || !dir) {
    console.error('Použití: tsx scripts/analyze-prefilter.ts <shop_id> --dir=<složka>');
    process.exit(1);
  }

  const raw = readFileSync(path.join(dir, 'sitemap-urls.txt'), 'utf-8').split('\n').filter(Boolean);
  const unique = [...new Map(raw.map((u) => [keyOf(u), u])).values()];
  const dbRows = await loadDbRows(shopId);
  const genuine = dbRows.filter((r) => !isBrandLikeName(r.name));

  console.log(`\n===== ${shopId} =====`);
  console.log(`URL v sitemap-urls.txt: ${raw.length}, unikátních (podle cesty): ${unique.length}`);

  const depthHist = new Map<number, number>();
  for (const u of unique) depthHist.set(depthOf(u), (depthHist.get(depthOf(u)) ?? 0) + 1);
  console.log(
    'Hloubka cesty (počet segmentů -> URL): ' +
      [...depthHist.entries()].sort((a, b) => a[0] - b[0]).map(([d, n]) => `${d}:${n}`).join(', '),
  );
  const dbDepth = new Map<number, number>();
  for (const r of dbRows) dbDepth.set(depthOf(r.url), (dbDepth.get(depthOf(r.url)) ?? 0) + 1);
  console.log(
    'Hloubka cesty u URL z DB: ' +
      [...dbDepth.entries()].sort((a, b) => a[0] - b[0]).map(([d, n]) => `${d}:${n}`).join(', '),
  );

  // 1) vzor produktové URL
  const pattern = derivePattern(shopId, unique);
  const products = unique.filter(pattern.test);
  const nonProducts = unique.filter((u) => !pattern.test(u));
  console.log(`\n-- 1) Vzor produktové URL: ${pattern.name}`);
  console.log(`Produktových URL: ${products.length}, ostatních (kategorie/filtry/stránky): ${nonProducts.length}`);
  const dbMissPattern = dbRows.filter((r) => !pattern.test(r.url));
  console.log(`DB URL, které vzor nepovažuje za produkt: ${dbMissPattern.length} z ${dbRows.length}`);
  for (const r of dbMissPattern.slice(0, 20)) console.log(`   ${r.url} | ${r.name}`);
  console.log('Ukázka produktových URL:');
  for (const u of shuffle(products).slice(0, 12)) console.log(`   ${pathOf(u)}`);
  console.log('Ukázka ostatních URL:');
  for (const u of shuffle(nonProducts).slice(0, 12)) console.log(`   ${pathOf(u)}`);

  if (shopId === 'motojelinek') {
    const variants = products.filter((u) => /^\/p\/[^/]+\/\d+\/?$/.test(pathOf(u)));
    const slugs = new Set(products.map((u) => pathOf(u).split('/')[2]));
    console.log(`/p/<slug>/<číslo> (varianty?): ${variants.length}; unikátních slugů /p/<slug>: ${slugs.size}`);
  }
  // DB URL, které jsou produkt, ale vzor je jako produkt ve sitemapě nenašel
  const productKeys = new Set(products.map(keyOf));
  const dbNotInProducts = dbRows.filter((r) => !productKeys.has(keyOf(r.url)));
  console.log(`DB URL, které nejsou v množině produktů ze sitemapy: ${dbNotInProducts.length}`);

  // 2) varianty předfiltru nad produktovými URL
  const variants: [string, (u: string) => boolean][] = [
    ['0: původní (jen RELEVANT_KEYWORDS)', isRelevantSlug],
    ['a: povolená slova + zkratky/tvary/typová čísla', variantA],
    ['b1: vše kromě cizích značek', variantB1],
    ['b2: vše kromě cizích značek, pokud nemá zároveň naši značku/typ', variantB2],
  ];
  console.log(`\n-- 2) Varianty předfiltru (nad ${products.length} produktovými URL)`);
  console.log(`   DB: ${dbRows.length} řádků, z toho ${genuine.length} s „pravým“ názvem (bez brand-like názvů typu CZ / HUN / JAWA Moto)`);
  const times: string[] = [];
  for (const [name, fn] of variants) {
    const passed = products.filter(fn);
    const lostAll = dbRows.filter((r) => !fn(r.url));
    const lostGenuine = genuine.filter((r) => !fn(r.url));
    console.log(`\n[${name}]`);
    console.log(`  pustil ${passed.length} z ${products.length} produktových URL (${pct(passed.length, products.length)})`);
    console.log(
      `  recall DB: všechny řádky ${dbRows.length - lostAll.length}/${dbRows.length} = ${pct(dbRows.length - lostAll.length, dbRows.length)}, ` +
        `pravé názvy ${genuine.length - lostGenuine.length}/${genuine.length} = ${pct(genuine.length - lostGenuine.length, genuine.length)}`,
    );
    for (const r of lostGenuine) console.log(`    ztraceno (pravý název): ${pathOf(r.url)} | ${r.name}`);
    if (lostAll.length !== lostGenuine.length) {
      console.log(`    (+ ${lostAll.length - lostGenuine.length} ztracených řádků s brand-like názvem)`);
    }
    times.push(`${name}: ${passed.length} requestů ≈ ${hours(passed.length)}`);
  }

  // slova v produktových URL, která nepustí varianta (a) - kandidáti na další zkratky / cizí značky
  const notA = products.filter((u) => !variantA(u));
  const freq = new Map<string, number>();
  for (const u of notA) for (const t of new Set(tokensOf(u))) freq.set(t, (freq.get(t) ?? 0) + 1);
  console.log(`\nNejčastější tokeny v ${notA.length} produktových URL, které varianta (a) nepustila:`);
  console.log(
    '  ' +
      [...freq.entries()].filter(([t]) => t.length > 1 && !/^\d+$/.test(t)).sort((x, y) => y[1] - x[1]).slice(0, 80).map(([t, n]) => `${t}:${n}`).join(' '),
  );
  const passedB1notA = products.filter((u) => variantB1(u) && !variantA(u));
  console.log(`\nUkázka 25 URL, které pustí (b1), ale ne (a) – z ${passedB1notA.length}:`);
  for (const u of shuffle(passedB1notA).slice(0, 25)) console.log(`   ${pathOf(u)}`);

  // 3) doba crawlu
  console.log(`\n-- 3) Doba crawlu při ${SECONDS_PER_REQUEST} s/request (+ ~15 requestů režie: homepage, robots, sitemapy)`);
  console.log(`   všechny produktové URL: ${products.length} requestů ≈ ${hours(products.length)}`);
  for (const t of times) console.log(`   ${t}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
