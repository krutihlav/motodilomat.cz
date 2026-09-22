#!/usr/bin/env tsx
import { appendFileSync } from 'node:fs';
import { createServiceRoleClient } from '../src/lib/supabase/server';
import { fetchRobots } from '../src/lib/crawl/robots';
import { resolveSitemapUrls, fetchSitemapUrls } from '../src/lib/crawl/sitemap';
import { fetchText, waitForRateLimit } from '../src/lib/crawl/httpClient';
import { extractProduct } from '../src/lib/crawl/jsonld';
import { detectPlatform } from '../src/lib/crawl/platform';
import { COMMON_FEED_PATHS } from '../src/lib/crawl/feedPaths';
import type { Platform } from '../src/lib/crawl/types';

const SAMPLE_PRODUCT_COUNT = 3;
const MAX_SITEMAP_URLS_TO_TRY = 30;

type ProbeShop = {
  id: string;
  name: string;
  baseUrl: string;
};

type ProductProbe = {
  url: string;
  ok: boolean;
  name?: string;
  price?: number;
  inStock?: boolean;
  sku?: string;
  mpn?: string;
};

type ProbeResult = {
  shop: ProbeShop;
  robotsFetched: boolean;
  crawlAllowed: boolean;
  sitemapUrls: string[];
  sitemapProductCount: number;
  platform: Platform;
  foundFeedPaths: string[];
  products: ProductProbe[];
  error?: string;
};

async function probeFeedPaths(baseUrl: string): Promise<string[]> {
  const found: string[] = [];
  const hostname = new URL(baseUrl).hostname;

  for (const path of COMMON_FEED_PATHS) {
    const url = new URL(path, baseUrl).toString();
    await waitForRateLimit(hostname);
    const response = await fetchText(url, { timeoutMs: 8_000 });
    const contentType = response?.headers.get('content-type') ?? '';
    if (response && response.status === 200 && /xml/i.test(contentType)) {
      found.push(path);
    }
  }

  return found;
}

async function probeShop(shop: ProbeShop): Promise<ProbeResult> {
  const result: ProbeResult = {
    shop,
    robotsFetched: false,
    crawlAllowed: true,
    sitemapUrls: [],
    sitemapProductCount: 0,
    platform: 'unknown',
    foundFeedPaths: [],
    products: [],
  };

  try {
    const robots = await fetchRobots(shop.baseUrl);
    result.robotsFetched = robots.fetched;
    result.crawlAllowed = robots.crawlAllowed;

    const hostname = new URL(shop.baseUrl).hostname;
    await waitForRateLimit(hostname);
    const homepage = await fetchText(shop.baseUrl, { timeoutMs: 10_000 });
    if (homepage) {
      result.platform = detectPlatform(homepage.text, homepage.headers);
    }

    if (!robots.crawlAllowed) {
      return result;
    }

    result.foundFeedPaths = await probeFeedPaths(shop.baseUrl);

    const sitemapUrls = resolveSitemapUrls(shop.baseUrl, robots.rules.sitemaps);
    const candidateUrls: string[] = [];
    for (const sitemapUrl of sitemapUrls) {
      candidateUrls.push(...(await fetchSitemapUrls(sitemapUrl)));
    }
    result.sitemapUrls = sitemapUrls;
    result.sitemapProductCount = candidateUrls.length;

    for (const productUrl of candidateUrls.slice(0, MAX_SITEMAP_URLS_TO_TRY)) {
      if (result.products.length >= SAMPLE_PRODUCT_COUNT) {
        break;
      }

      await waitForRateLimit(new URL(productUrl).hostname);
      const page = await fetchText(productUrl, { timeoutMs: 10_000 });
      if (!page || page.status >= 400) {
        continue;
      }

      const product = extractProduct(page.text, productUrl);
      if (product) {
        result.products.push({
          url: productUrl,
          ok: true,
          name: product.name,
          price: product.priceVat,
          inStock: product.inStock,
          sku: product.sku,
          mpn: product.mpn,
        });
      }
    }
  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err);
  }

  return result;
}

function renderMarkdown(results: ProbeResult[]): string {
  const lines: string[] = [];
  lines.push('# Probe shopů (crawl)');
  lines.push('');
  lines.push(
    '| Shop | robots.txt | Crawl povolen | Platforma | Sitemapy | Produktů v sitemapě | Feed cesty nalezeny | Ověřené produkty (JSON-LD) |',
  );
  lines.push('|---|---|---|---|---|---|---|---|');

  for (const r of results) {
    const verifiedProducts =
      r.products.length > 0
        ? r.products
            .map(
              (p) =>
                `✅ ${p.name} (${p.price} Kč, ${p.inStock ? 'skladem' : 'není skladem'}${p.sku ? `, sku=${p.sku}` : ''}${p.mpn ? `, mpn=${p.mpn}` : ''})`,
            )
            .join('<br>')
        : '—';

    lines.push(
      `| [${r.shop.name}](${r.shop.baseUrl}) | ${r.robotsFetched ? 'nalezen' : 'chybí'} | ${r.crawlAllowed ? '✅ ano' : '❌ ne'} | ${r.platform} | ${r.sitemapUrls.join(', ') || '—'} | ${r.sitemapProductCount} | ${r.foundFeedPaths.join(', ') || '—'} | ${verifiedProducts} |`,
    );

    if (r.error) {
      lines.push(`| | chyba: ${r.error} | | | | | | |`);
    }
  }

  lines.push('');
  lines.push(`_Vygenerováno ${new Date().toISOString()}_`);
  return lines.join('\n');
}

async function loadShops(): Promise<ProbeShop[]> {
  const client = createServiceRoleClient();
  const { data, error } = await client
    .from('shops')
    .select('id, name, base_url')
    .not('base_url', 'is', null);

  if (error) {
    throw new Error(`Nepodařilo se načíst shopy: ${error.message}`);
  }

  return (data ?? [])
    .filter((row): row is { id: string; name: string; base_url: string } => Boolean(row.base_url))
    .map((row) => ({ id: row.id, name: row.name, baseUrl: row.base_url }));
}

async function main() {
  const shops = await loadShops();

  if (shops.length === 0) {
    console.log('Žádný shop s vyplněným base_url.');
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
