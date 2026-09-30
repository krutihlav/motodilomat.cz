import type { FeedItem } from '../feed/types';
import { fetchText, waitForRateLimit } from './httpClient';
import { fetchRobots, isAllowed } from './robots';
import { extractProductEvidence } from './productEvidence';
import { RequestBudget } from './requestBudget';
import { microdataToCrawledProduct, toFeedItem } from './crawlShop';

export type KnownUrl = { shopItemId: string; url: string };

export type RefreshOutcome =
  | { kind: 'item'; shopItemId: string; url: string; item: FeedItem }
  /** HTTP 404/410 - stránka už neexistuje. */
  | { kind: 'not_found'; shopItemId: string; url: string }
  /** Stránka se stáhla, ale nenašel se Product (JSON-LD/microdata). */
  | { kind: 'no_product'; shopItemId: string; url: string }
  /** Síťová chyba, 5xx nebo jiná 4xx - neznámý stav, řádek se nemění. */
  | { kind: 'error'; shopItemId: string; url: string }
  | { kind: 'disallowed'; shopItemId: string; url: string };

export type RefreshDependencies = {
  fetchText?: typeof fetchText;
  waitForRateLimit?: typeof waitForRateLimit;
  fetchRobots?: typeof fetchRobots;
};

/**
 * Jednorázový režim "refresh known URLs": místo sitemapy a náhodného výběru
 * projde přesně zadané URL (existující řádky shop_products), se stejným rate
 * limitem (1 req / 3 s / doménu), robots.txt a stropem requestů jako
 * crawlShop. Pro každou URL vyprodukuje výsledek, aby volající mohl
 * rozlišit opravenou položku od 404 / chyby. `itemId` a `url` položky se
 * přepíší na uložené hodnoty, takže upsert přepíše existující řádek
 * (a nevznikne duplicita, i když stránka uvádí jinou kanonickou URL).
 */
export async function* refreshKnownUrls(
  baseUrl: string,
  known: KnownUrl[],
  maxRequests: number = known.length + 10,
  deps: RefreshDependencies = {},
): AsyncGenerator<RefreshOutcome> {
  const fetchPage = deps.fetchText ?? fetchText;
  const wait = deps.waitForRateLimit ?? waitForRateLimit;
  const robotsFetcher = deps.fetchRobots ?? fetchRobots;

  const budget = new RequestBudget(maxRequests);
  const robots = await robotsFetcher(baseUrl, budget);
  if (!robots.crawlAllowed) {
    console.error(`Crawl zakázán robots.txt pro ${baseUrl} - přeskakuji.`);
    return;
  }

  for (const { shopItemId, url } of known) {
    if (budget.exhausted) {
      console.warn(`Refresh: vyčerpán strop ${maxRequests} requestů, zbylé URL se nezpracují.`);
      return;
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      yield { kind: 'error', shopItemId, url };
      continue;
    }

    if (!isAllowed(robots.rules, parsed.pathname)) {
      yield { kind: 'disallowed', shopItemId, url };
      continue;
    }

    await wait(parsed.hostname);
    const response = await fetchPage(url);
    budget.consume();

    if (!response) {
      yield { kind: 'error', shopItemId, url };
      continue;
    }
    if (response.status === 404 || response.status === 410) {
      yield { kind: 'not_found', shopItemId, url };
      continue;
    }
    if (response.status >= 400) {
      yield { kind: 'error', shopItemId, url };
      continue;
    }

    const evidence = extractProductEvidence(response.text, url);
    let item: FeedItem | null = null;
    if (evidence?.kind === 'jsonld') {
      item = toFeedItem(evidence.product);
    } else if (evidence?.kind === 'microdata') {
      const product = microdataToCrawledProduct(evidence.product, url);
      item = product ? toFeedItem(product) : null;
    }

    if (item) {
      yield { kind: 'item', shopItemId, url, item: { ...item, itemId: shopItemId, url } };
    } else {
      yield { kind: 'no_product', shopItemId, url };
    }
  }
}
