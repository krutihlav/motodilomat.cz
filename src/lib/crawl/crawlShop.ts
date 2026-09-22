import type { FeedItem } from '../feed/types';
import type { CrawledProduct } from './types';
import { fetchRobots, isAllowed } from './robots';
import { fetchText, waitForRateLimit } from './httpClient';
import { fetchSitemapUrls, resolveSitemapUrls } from './sitemap';
import { extractProduct } from './jsonld';

function toFeedItem(product: CrawledProduct): FeedItem {
  return {
    itemId: product.url,
    productName: product.name,
    priceVat: product.priceVat,
    priceCurrency: product.priceCurrency,
    url: product.url,
    imgUrl: product.imageUrl,
    ean: product.ean,
    mpn: product.mpn,
    description: product.description,
    inStock: product.inStock,
  };
}

/**
 * Crawlne e-shop od `baseUrl`: najde sitemapu, projde produktové URL a pro
 * každou, u které jde stránka stáhnout a obsahuje JSON-LD Product, vyprodukuje
 * FeedItem. Respektuje robots.txt (nedovolené URL přeskočí) a rate limit
 * 1 request / 3 s / doménu (viz httpClient.ts).
 */
export async function* crawlShop(baseUrl: string): AsyncGenerator<FeedItem> {
  const robots = await fetchRobots(baseUrl);
  if (!robots.crawlAllowed) {
    console.error(`Crawl zakázán robots.txt pro ${baseUrl} - přeskakuji.`);
    return;
  }

  const sitemapUrls = resolveSitemapUrls(baseUrl, robots.rules.sitemaps);
  const productUrls: string[] = [];
  for (const sitemapUrl of sitemapUrls) {
    productUrls.push(...(await fetchSitemapUrls(sitemapUrl)));
  }

  for (const productUrl of productUrls) {
    let parsed: URL;
    try {
      parsed = new URL(productUrl);
    } catch {
      continue;
    }

    if (!isAllowed(robots.rules, parsed.pathname)) {
      continue;
    }

    await waitForRateLimit(parsed.hostname);
    const response = await fetchText(productUrl);
    if (!response || response.status >= 400) {
      continue;
    }

    const product = extractProduct(response.text, productUrl);
    if (product) {
      yield toFeedItem(product);
    }
  }
}
