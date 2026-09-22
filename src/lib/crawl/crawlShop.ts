import type { FeedItem } from '../feed/types';
import type { CrawledProduct } from './types';
import { fetchRobots, isAllowed } from './robots';
import { fetchText, waitForRateLimit } from './httpClient';
import { fetchSitemapUrls, resolveSitemapUrls } from './sitemap';
import { extractProduct } from './jsonld';
import { RequestBudget, type Budget } from './requestBudget';

/**
 * Výchozí strop requestů na shop (robots.txt + sitemapy + produktové stránky
 * dohromady) - při rate limitu 1 req/3s/doménu drží jeden běh crawlShop pod
 * ~2.5 minuty i pro shop s desetitisícovou sitemapou (bez stropu by crawlShop
 * bez filtru product-like URL prošel *celou* sitemapu, což u velkých katalogů
 * znamená hodiny běhu a tisíce requestů na živý web).
 */
export const DEFAULT_MAX_REQUESTS_PER_SHOP = 50;

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
 * FeedItem. Respektuje robots.txt (nedovolené URL přeskočí), rate limit
 * 1 request / 3 s / doménu (viz httpClient.ts) a `maxRequests` (viz
 * DEFAULT_MAX_REQUESTS_PER_SHOP výše).
 */
export async function* crawlShop(
  baseUrl: string,
  maxRequests: number = DEFAULT_MAX_REQUESTS_PER_SHOP,
): AsyncGenerator<FeedItem> {
  const budget: Budget = new RequestBudget(maxRequests);

  const robots = await fetchRobots(baseUrl, budget);
  if (!robots.crawlAllowed) {
    console.error(`Crawl zakázán robots.txt pro ${baseUrl} - přeskakuji.`);
    return;
  }

  const sitemapUrls = resolveSitemapUrls(baseUrl, robots.rules.sitemaps);
  const productUrls: string[] = [];
  for (const sitemapUrl of sitemapUrls) {
    if (budget.exhausted) {
      break;
    }
    productUrls.push(...(await fetchSitemapUrls(sitemapUrl, budget)));
  }

  for (const productUrl of productUrls) {
    if (budget.exhausted) {
      break;
    }

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
    budget.consume();
    if (!response || response.status >= 400) {
      continue;
    }

    const product = extractProduct(response.text, productUrl);
    if (product) {
      yield toFeedItem(product);
    }
  }
}
