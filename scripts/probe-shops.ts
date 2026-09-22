#!/usr/bin/env tsx
import { appendFileSync } from 'node:fs';
import { createServiceRoleClient } from '../src/lib/supabase/server';
import { fetchRobots, type RobotsStatus } from '../src/lib/crawl/robots';
import { resolveSitemapUrls, fetchSitemapUrls } from '../src/lib/crawl/sitemap';
import { fetchText, waitForRateLimit } from '../src/lib/crawl/httpClient';
import { extractProductEvidence } from '../src/lib/crawl/productEvidence';
import { detectPlatform } from '../src/lib/crawl/platform';
import { COMMON_FEED_PATHS } from '../src/lib/crawl/feedPaths';
import { isLikelyProductUrl, platformFeedPaths } from '../src/lib/crawl/productUrl';
import { RequestBudget } from '../src/lib/crawl/requestBudget';
import type { Platform } from '../src/lib/crawl/types';

const TARGET_VERIFIED_PRODUCTS = 3;
const MAX_REQUESTS_PER_SHOP = 40;
const MAX_FEED_PATH_REQUESTS = 12;
const SITEMAP_RESERVE_FOR_PRODUCTS = 5;

type ProbeShop = {
  id: string;
  name: string;
  baseUrl: string;
};

type ProductProbe = {
  url: string;
  evidence: 'jsonld' | 'microdata';
  name?: string;
  price?: number;
  currency?: string;
  inStock?: boolean;
  sku?: string;
  mpn?: string;
};

type ProbeResult = {
  shop: ProbeShop;
  reachable: boolean;
  robotsStatus: RobotsStatus;
  crawlAllowed: boolean;
  platform: Platform;
  sitemapUrls: string[];
  sitemapCandidateCount: number;
  productLikeCandidateCount: number;
  foundFeedPaths: string[];
  products: ProductProbe[];
  weakSignalCount: number;
  requestsUsed: number;
  error?: string;
};

/** Fisher-Yates - pro "náhodný vzorek napříč celou sitemapou", ne jen prvních N. */
function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

async function probeFeedPaths(
  baseUrl: string,
  paths: string[],
  budget: RequestBudget,
): Promise<string[]> {
  const found: string[] = [];
  const hostname = new URL(baseUrl).hostname;

  for (const path of paths) {
    if (budget.exhausted) {
      break;
    }

    const url = new URL(path, baseUrl).toString();
    await waitForRateLimit(hostname);
    const response = await fetchText(url, { timeoutMs: 8_000 });
    budget.consume();

    const contentType = response?.headers.get('content-type') ?? '';
    if (response && response.status === 200 && /xml/i.test(contentType)) {
      found.push(path);
    }
  }

  return found;
}

async function probeShop(shop: ProbeShop): Promise<ProbeResult> {
  const budget = new RequestBudget(MAX_REQUESTS_PER_SHOP);
  const result: ProbeResult = {
    shop,
    reachable: false,
    robotsStatus: 'unknown',
    crawlAllowed: true,
    platform: 'unknown',
    sitemapUrls: [],
    sitemapCandidateCount: 0,
    productLikeCandidateCount: 0,
    foundFeedPaths: [],
    products: [],
    weakSignalCount: 0,
    requestsUsed: 0,
  };

  try {
    const robots = await fetchRobots(shop.baseUrl, budget);
    result.robotsStatus = robots.status;
    result.crawlAllowed = robots.crawlAllowed;
    if (robots.status !== 'unknown') {
      result.reachable = true;
    }

    if (!budget.exhausted) {
      const hostname = new URL(shop.baseUrl).hostname;
      await waitForRateLimit(hostname);
      const homepage = await fetchText(shop.baseUrl, { timeoutMs: 10_000 });
      budget.consume();
      if (homepage) {
        result.platform = detectPlatform(homepage.text, homepage.headers);
        result.reachable = true;
      }
    }

    if (!result.reachable) {
      result.error = 'Shop nedosažitelný (robots.txt i homepage se nepodařilo stáhnout).';
      return result;
    }

    if (!robots.crawlAllowed) {
      return result;
    }

    const feedPathCandidates = [...COMMON_FEED_PATHS, ...platformFeedPaths(result.platform)].slice(
      0,
      MAX_FEED_PATH_REQUESTS,
    );
    result.foundFeedPaths = await probeFeedPaths(shop.baseUrl, feedPathCandidates, budget);

    if (budget.exhausted) {
      return result;
    }

    const sitemapUrls = resolveSitemapUrls(shop.baseUrl, robots.rules.sitemaps);
    result.sitemapUrls = sitemapUrls;

    const sitemapBudget = budget.withReserve(SITEMAP_RESERVE_FOR_PRODUCTS);
    const candidateUrls: string[] = [];
    for (const sitemapUrl of sitemapUrls) {
      if (sitemapBudget.exhausted) {
        break;
      }
      candidateUrls.push(...(await fetchSitemapUrls(sitemapUrl, sitemapBudget)));
    }
    result.sitemapCandidateCount = candidateUrls.length;

    const productLikeUrls = shuffle(
      candidateUrls.filter((url) => isLikelyProductUrl(url, result.platform)),
    );
    result.productLikeCandidateCount = productLikeUrls.length;

    // Když filtr nic nenašel (neznámá platforma / netypický sitemap), zkus
    // aspoň náhodný vzorek z celé sitemapy - lepší slabý pokus než žádný.
    const sampleUrls = productLikeUrls.length > 0 ? productLikeUrls : shuffle(candidateUrls);

    for (const productUrl of sampleUrls) {
      if (result.products.length >= TARGET_VERIFIED_PRODUCTS || budget.exhausted) {
        break;
      }

      let parsed: URL;
      try {
        parsed = new URL(productUrl);
      } catch {
        continue;
      }

      await waitForRateLimit(parsed.hostname);
      const page = await fetchText(productUrl, { timeoutMs: 10_000 });
      budget.consume();
      if (!page || page.status >= 400) {
        continue;
      }

      const evidence = extractProductEvidence(page.text, productUrl);
      if (evidence?.kind === 'jsonld') {
        result.products.push({
          url: productUrl,
          evidence: 'jsonld',
          name: evidence.product.name,
          price: evidence.product.priceVat,
          currency: evidence.product.priceCurrency,
          inStock: evidence.product.inStock,
          sku: evidence.product.sku,
          mpn: evidence.product.mpn,
        });
      } else if (evidence?.kind === 'microdata') {
        result.products.push({
          url: productUrl,
          evidence: 'microdata',
          name: evidence.product.name,
          price: evidence.product.priceVat,
          currency: evidence.product.priceCurrency,
          inStock: evidence.product.inStock,
        });
      } else if (evidence?.kind === 'og-type-only') {
        result.weakSignalCount += 1;
      }
    }
  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err);
  } finally {
    result.requestsUsed = MAX_REQUESTS_PER_SHOP - budget.remaining;
  }

  return result;
}

function formatRobotsStatus(status: RobotsStatus): string {
  if (status === 'found') return 'nalezen';
  if (status === 'not_found') return 'chybí (404)';
  return 'neznámo (timeout/5xx)';
}

function formatProduct(p: ProductProbe): string {
  const bits = [
    p.price !== undefined ? `${p.price} ${p.currency ?? 'Kč'}` : undefined,
    p.inStock === undefined ? undefined : p.inStock ? 'skladem' : 'není skladem',
    p.sku ? `sku=${p.sku}` : undefined,
    p.mpn ? `mpn=${p.mpn}` : undefined,
  ].filter(Boolean);
  return `✅ [${p.evidence}] ${p.name ?? p.url} (${bits.join(', ')})`;
}

function renderMarkdown(results: ProbeResult[]): string {
  const lines: string[] = [];
  lines.push('# Probe shopů (crawl) v2');
  lines.push('');
  lines.push(
    '| Shop | Dosažitelný | robots.txt | Crawl povolen | Platforma | Produktových URL (vzorek) | Feed cesty nalezeny | Ověřené produkty | Slabý signál (og:type) | Requestů |',
  );
  lines.push('|---|---|---|---|---|---|---|---|---|---|');

  for (const r of results) {
    const verifiedProducts =
      r.products.length > 0 ? r.products.map(formatProduct).join('<br>') : '—';

    lines.push(
      `| [${r.shop.name}](${r.shop.baseUrl}) | ${r.reachable ? '✅ ano' : '❌ ne'} | ${formatRobotsStatus(r.robotsStatus)} | ${r.crawlAllowed ? '✅ ano' : '❌ ne'} | ${r.platform} | ${r.productLikeCandidateCount}/${r.sitemapCandidateCount} | ${r.foundFeedPaths.join(', ') || '—'} | ${verifiedProducts} | ${r.weakSignalCount} | ${r.requestsUsed}/${MAX_REQUESTS_PER_SHOP} |`,
    );

    if (r.error) {
      lines.push(`| | | chyba: ${r.error} | | | | | | | |`);
    }
  }

  lines.push('');
  lines.push(
    `_Vzorek produktových URL je náhodný napříč celou sitemapou (max ${TARGET_VERIFIED_PRODUCTS} ověřené produkty nebo ${MAX_REQUESTS_PER_SHOP} requestů/shop, podle toho, co nastane dřív)._`,
  );
  lines.push(`_Vygenerováno ${new Date().toISOString()}_`);
  return lines.join('\n');
}

async function loadShops(shopIdFilter?: string): Promise<ProbeShop[]> {
  const client = createServiceRoleClient();
  let query = client.from('shops').select('id, name, base_url').not('base_url', 'is', null);
  if (shopIdFilter) {
    query = query.eq('id', shopIdFilter);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Nepodařilo se načíst shopy: ${error.message}`);
  }

  return (data ?? [])
    .filter((row): row is { id: string; name: string; base_url: string } => Boolean(row.base_url))
    .map((row) => ({ id: row.id, name: row.name, baseUrl: row.base_url }));
}

async function main() {
  const shopIdFilter = process.argv[2] || process.env.SHOP_ID || undefined;
  const shops = await loadShops(shopIdFilter);

  if (shops.length === 0) {
    console.log(
      shopIdFilter
        ? `Shop "${shopIdFilter}" nemá vyplněný base_url (nebo neexistuje).`
        : 'Žádný shop s vyplněným base_url.',
    );
    return;
  }

  const results: ProbeResult[] = [];
  for (const shop of shops) {
    console.log(`::group::Probe: ${shop.name} (${shop.baseUrl})`);
    const result = await probeShop(shop);
    results.push(result);
    console.log(JSON.stringify(result, null, 2));
    console.log('::endgroup::');
  }

  const markdown = renderMarkdown(results);
  console.log(markdown);

  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath) {
    appendFileSync(summaryPath, `${markdown}\n`);
  }
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
