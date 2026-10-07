#!/usr/bin/env tsx
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createServiceRoleClient } from '../src/lib/supabase/server';
import { fetchText, waitForRateLimit } from '../src/lib/crawl/httpClient';
import { isAllowed, parseRobots } from '../src/lib/crawl/robots';
import { parseSitemapDocument, prioritizeProductSitemaps, resolveSitemapUrls } from '../src/lib/crawl/sitemap';
import { detectPlatform } from '../src/lib/crawl/platform';
import { isLikelyProductUrl } from '../src/lib/crawl/productUrl';
import { isRelevantSlug } from '../src/lib/crawl/slugRelevance';
import { shuffle } from '../src/lib/util/shuffle';

/**
 * Dry-run předfiltru relevance podle slugu. Stahuje JEN homepage, robots.txt a
 * soubory sitemap (žádné produktové stránky) a z DB jen čte - nic nezapisuje.
 * Rate limit 1 req / 3 s / doménu zajišťuje httpClient.
 *
 * Použití: tsx scripts/dry-run-sitemap-prefilter.ts <shop_id> [--out=DIR]
 */

const MAX_SITEMAP_FILES = 400; // pojistka proti nekonečné smyčce, ne omezení katalogu
const SAMPLE_SIZE = 20;

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname.replace(/^www\./, '')}${parsed.pathname.replace(/\/+$/, '')}`.toLowerCase();
  } catch {
    return url;
  }
}

type SitemapFile = { url: string; kind: string; urls: number };

/** Projde celou sitemapu (i vnořené indexy) bez stropu počtu URL. */
async function fetchAllSitemapUrls(
  roots: string[],
): Promise<{ urls: string[]; files: SitemapFile[]; failed: string[] }> {
  const visited = new Set<string>();
  const queue = [...roots];
  const urls: string[] = [];
  const files: SitemapFile[] = [];
  const failed: string[] = [];

  while (queue.length > 0 && visited.size < MAX_SITEMAP_FILES) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    await waitForRateLimit(new URL(current).hostname);
    const response = await fetchText(current, { timeoutMs: 60_000 });
    if (!response || response.status >= 400) {
      failed.push(`${current} -> ${response ? response.status : 'bez odpovědi'}`);
      continue;
    }

    const { rootTag, locs } = parseSitemapDocument(response.text);
    files.push({ url: current, kind: rootTag ?? 'neznámý', urls: locs.length });
    if (rootTag === 'sitemapindex') {
      queue.push(...prioritizeProductSitemaps(locs));
    } else {
      urls.push(...locs);
    }
  }
  if (queue.length > 0) {
    failed.push(`přeskočeno ${queue.length} sitemap (limit ${MAX_SITEMAP_FILES} souborů)`);
  }
  return { urls, files, failed };
}

async function loadDbUrls(shopId: string): Promise<{ url: string; name: string }[]> {
  const client = createServiceRoleClient();
  const rows: { url: string; name: string }[] = [];
  const pageSize = 1_000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await client
      .from('shop_products')
      .select('url, name')
      .eq('shop_id', shopId)
      .order('id')
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`Čtení shop_products selhalo: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) return rows;
  }
}

function robotsSummary(text: string) {
  const rules = parseRobots(text);
  const lines = text.split(/\r?\n/).map((l) => l.replace(/#.*$/, '').trim());
  const allDisallow = lines.filter((l) => /^disallow\s*:/i.test(l));
  const allDelay = lines.filter((l) => /^crawl-delay\s*:/i.test(l));
  return { rules, allDisallow, allDelay };
}

async function main() {
  const args = process.argv.slice(2);
  const shopId = args.find((a) => !a.startsWith('--'));
  const outDir = args.find((a) => a.startsWith('--out='))?.slice('--out='.length) ?? `out/${shopId}`;
  if (!shopId) {
    console.error('Použití: tsx scripts/dry-run-sitemap-prefilter.ts <shop_id> [--out=DIR]');
    process.exit(1);
  }
  mkdirSync(outDir, { recursive: true });

  const client = createServiceRoleClient();
  const { data: shop, error } = await client
    .from('shops')
    .select('id, name, base_url')
    .eq('id', shopId)
    .maybeSingle();
  if (error || !shop?.base_url) {
    throw new Error(`Shop "${shopId}" nenalezen nebo bez base_url: ${error?.message ?? ''}`);
  }
  const baseUrl: string = shop.base_url;
  const hostname = new URL(baseUrl).hostname;

  // 1) robots.txt (celý text se ukládá)
  await waitForRateLimit(hostname);
  const robotsResponse = await fetchText(new URL('/robots.txt', baseUrl).toString());
  const robotsText = robotsResponse && robotsResponse.status < 400 ? robotsResponse.text : '';
  writeFileSync(path.join(outDir, 'robots.txt'), robotsText || '(robots.txt nedostupný)\n');
  const robots = robotsSummary(robotsText);

  // 2) homepage jen kvůli platformě (isLikelyProductUrl)
  await waitForRateLimit(hostname);
  const homepage = await fetchText(baseUrl);
  const platform = homepage ? detectPlatform(homepage.text, homepage.headers) : 'unknown';

  // 3) celá sitemapa bez stropu
  const sitemapRoots = resolveSitemapUrls(baseUrl, robots.rules.sitemaps);
  const { urls: rawUrls, files, failed } = await fetchAllSitemapUrls(sitemapRoots);
  const unique = [...new Map(rawUrls.map((u) => [normalizeUrl(u), u])).values()];
  const productLike = unique.filter((u) => isLikelyProductUrl(u, platform));
  const robotsBlocked = productLike.filter((u) => {
    try {
      return !isAllowed(robots.rules, new URL(u).pathname);
    } catch {
      return false;
    }
  });
  const passed = productLike.filter(isRelevantSlug);
  const dropped = productLike.filter((u) => !isRelevantSlug(u));
  writeFileSync(path.join(outDir, 'sitemap-urls.txt'), unique.join('\n') + '\n');
  writeFileSync(path.join(outDir, 'prefilter-passed.txt'), passed.join('\n') + '\n');
  writeFileSync(path.join(outDir, 'prefilter-dropped.txt'), dropped.join('\n') + '\n');

  // 4) validace na URL z DB (v DB jsou jen položky, které prošly isRelevantItem)
  const dbRows = await loadDbUrls(shopId);
  const dbPassed = dbRows.filter((r) => isRelevantSlug(r.url));
  const dbLost = dbRows.filter((r) => !isRelevantSlug(r.url));
  const sitemapKeys = new Set(unique.map(normalizeUrl));
  const dbInSitemap = dbRows.filter((r) => sitemapKeys.has(normalizeUrl(r.url)));
  const sample = <T>(items: T[]) => shuffle(items).slice(0, SAMPLE_SIZE);

  const result = {
    shopId,
    baseUrl,
    platform,
    robots: {
      status: robotsResponse ? robotsResponse.status : 'bez odpovědi',
      disallow: robots.allDisallow,
      crawlDelay: robots.allDelay,
      sitemaps: robots.rules.sitemaps,
      ourGroupDisallowCount: robots.rules.disallow.length,
      ourGroupCrawlDelaySeconds: robots.rules.crawlDelaySeconds ?? null,
    },
    sitemapFiles: files,
    sitemapFailed: failed,
    counts: {
      sitemapUrlsRaw: rawUrls.length,
      sitemapUrlsUnique: unique.length,
      productLike: productLike.length,
      productLikeBlockedByRobots: robotsBlocked.length,
      slugPassed: passed.length,
      slugDropped: dropped.length,
    },
    dbValidation: {
      dbRows: dbRows.length,
      dbUrlsFoundInSitemap: dbInSitemap.length,
      passed: dbPassed.length,
      lost: dbLost.length,
      recallPercent: dbRows.length ? +((dbPassed.length / dbRows.length) * 100).toFixed(1) : null,
    },
    samples: {
      passed: sample(passed),
      dropped: sample(dropped),
      dbLost: sample(dbLost).map((r) => `${r.url}  | ${r.name}`),
    },
  };
  writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(result, null, 2));

  const md = [
    `## ${shopId} (${baseUrl}, platforma: ${platform})`,
    '',
    `- robots.txt: HTTP ${result.robots.status}, Disallow řádků: ${robots.allDisallow.length}, Crawl-delay: ${robots.allDelay.join(' / ') || '—'}`,
    `- Sitemapy: ${files.length} souborů, selhalo/přeskočeno: ${failed.length ? failed.join('; ') : '0'}`,
    `- URL v sitemapě: ${rawUrls.length} (unikátních ${unique.length}), produktově vypadajících ${productLike.length}, z toho zakázaných robots.txt ${robotsBlocked.length}`,
    `- Předfiltr (slug): **pustil ${passed.length}**, vyřadil ${dropped.length}`,
    `- Validace na DB: ${dbRows.length} řádků, pustil ${dbPassed.length}, **ztratil ${dbLost.length}** (recall ${result.dbValidation.recallPercent ?? '—'} %), v sitemapě nalezeno ${dbInSitemap.length}`,
    '',
    `### Disallow (celý robots.txt je v artefaktu)`,
    '```',
    ...robots.allDisallow.slice(0, 60),
    '```',
    `### ${SAMPLE_SIZE} URL, které předfiltr pustil`,
    '```',
    ...result.samples.passed,
    '```',
    `### ${SAMPLE_SIZE} URL, které předfiltr vyřadil`,
    '```',
    ...result.samples.dropped,
    '```',
    `### ${SAMPLE_SIZE} řádků z DB, které by předfiltr ztratil`,
    '```',
    ...result.samples.dbLost,
    '```',
    '',
  ].join('\n');
  writeFileSync(path.join(outDir, 'summary.md'), md);
  console.log(md);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
