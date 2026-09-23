import type { FeedItem } from '../feed/types';
import type { CrawledProduct } from './types';
import { fetchRobots, isAllowed } from './robots';
import { fetchText, waitForRateLimit } from './httpClient';
import { fetchSitemapUrls, resolveSitemapUrls } from './sitemap';
import { extractProductEvidence } from './productEvidence';
import type { MicrodataProduct } from './microdata';
import { RequestBudget, type Budget } from './requestBudget';
import { detectPlatform } from './platform';
import { isLikelyProductUrl } from './productUrl';
import { shuffle } from '../util/shuffle';

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
 * Microdata extraktor negarantuje `name`/`priceVat` na typové úrovni (obojí
 * je v MicrodataProduct volitelné), i když extractMicrodataProduct() bez
 * ceny vrací null - u name žádnou takovou záruku nedává. Vrací null, pokud
 * chybí buď jedno, stejně jako mapProductNode() u JSON-LD.
 */
function microdataToCrawledProduct(
  product: MicrodataProduct,
  pageUrl: string,
): CrawledProduct | null {
  if (!product.name || product.priceVat === undefined) {
    return null;
  }

  return {
    url: product.url ?? pageUrl,
    name: product.name,
    priceVat: product.priceVat,
    priceCurrency: product.priceCurrency,
    inStock: product.inStock,
    imageUrl: product.imageUrl,
    sku: product.sku,
    mpn: product.mpn,
    ean: product.ean,
    description: product.description,
  };
}

/**
 * Crawlne e-shop od `baseUrl`: zjistí platformu z homepage, najde sitemapu,
 * vyfiltruje a zamíchá produktové URL (stejný postup jako probe-shops.ts) a
 * pro každou, u které jde stránka stáhnout a obsahuje JSON-LD nebo aspoň
 * microdata Product (viz extractProductEvidence - stejná priorita jako
 * probe-shops.ts), vyprodukuje FeedItem. Respektuje robots.txt (nedovolené
 * URL přeskočí), rate limit 1 request / 3 s / doménu (viz httpClient.ts) a
 * `maxRequests` (viz DEFAULT_MAX_REQUESTS_PER_SHOP výše).
 */
export async function* crawlShop(
  baseUrl: string,
  maxRequests: number = DEFAULT_MAX_REQUESTS_PER_SHOP,
): AsyncGenerator<FeedItem> {
  const budget: Budget = new RequestBudget(maxRequests);

  const hostname = new URL(baseUrl).hostname;
  await waitForRateLimit(hostname);
  const homepage = await fetchText(baseUrl);
  budget.consume();
  const platform = homepage ? detectPlatform(homepage.text, homepage.headers) : 'unknown';

  const robots = await fetchRobots(baseUrl, budget);
  if (!robots.crawlAllowed) {
    console.error(`Crawl zakázán robots.txt pro ${baseUrl} - přeskakuji.`);
    return;
  }

  const sitemapUrls = resolveSitemapUrls(baseUrl, robots.rules.sitemaps);
  const candidateUrls: string[] = [];
  for (const sitemapUrl of sitemapUrls) {
    if (budget.exhausted) {
      break;
    }
    candidateUrls.push(...(await fetchSitemapUrls(sitemapUrl, budget)));
  }

  const productLikeUrls = shuffle(
    candidateUrls.filter((url) => isLikelyProductUrl(url, platform)),
  );
  // Když filtr nic nenašel (neznámá platforma / netypický sitemap), zkus
  // aspoň náhodný vzorek z celé sitemapy - lepší slabý pokus než žádný.
  const productUrls = productLikeUrls.length > 0 ? productLikeUrls : shuffle(candidateUrls);

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

    const evidence = extractProductEvidence(response.text, productUrl);
    if (evidence?.kind === 'jsonld') {
      yield toFeedItem(evidence.product);
    } else if (evidence?.kind === 'microdata') {
      const product = microdataToCrawledProduct(evidence.product, productUrl);
      if (product) {
        yield toFeedItem(product);
      }
    }
  }
}
