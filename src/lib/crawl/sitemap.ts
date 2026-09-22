import sax from 'sax';
import { fetchText, waitForRateLimit } from './httpClient';
import type { Budget } from './requestBudget';

const MAX_SITEMAPS = 20;
const MAX_URLS = 5_000;

export type ParsedSitemap = {
  /** Kořenový element bez namespace ('sitemapindex' | 'urlset' | null, když se nenašel). */
  rootTag: string | null;
  locs: string[];
};

/** Vytáhne <loc> hodnoty a kořenový tag z jednoho sitemap XML dokumentu. */
export function parseSitemapDocument(xml: string): ParsedSitemap {
  const parser = sax.parser(false, { trim: true, lowercase: true });
  const locs: string[] = [];
  let rootTag: string | null = null;
  let inLoc = false;
  let buffer = '';

  parser.onopentag = (node) => {
    if (rootTag === null) {
      rootTag = node.name.includes(':') ? node.name.split(':').pop()! : node.name;
    }
    if (node.name === 'loc') {
      inLoc = true;
      buffer = '';
    }
  };

  parser.ontext = (text) => {
    if (inLoc) {
      buffer += text;
    }
  };

  parser.onclosetag = (name) => {
    if (name === 'loc') {
      const value = buffer.trim();
      if (value) {
        locs.push(value);
      }
      inLoc = false;
      buffer = '';
    }
  };

  parser.onerror = () => {
    parser.resume();
  };

  parser.write(xml).close();
  return { rootTag, locs };
}

/** Zpětně kompatibilní zkratka - jen <loc> hodnoty bez ohledu na typ dokumentu. */
export function parseSitemapLocs(xml: string): string[] {
  return parseSitemapDocument(xml).locs;
}

/**
 * Seřadí kandidátní dílčí sitemapy tak, aby ty s "produktovým" jménem
 * (sitemap-produkty.xml, product-sitemap.xml, sitemap_items.xml, ...) šly
 * první - u sitemap indexů s desítkami souborů se tím nevyplýtvá rozpočet
 * requestů na kategorie/blog/obrázky dřív, než dojde na produkty.
 */
export function prioritizeProductSitemaps(urls: string[]): string[] {
  // "item" by matchovalo i uvnitř samotného slova "sitemap" - proto jen "items"/"polozky".
  const PRODUCT_HINTS = /produ|zbozi|polozk|items|katalog|catalog/i;
  const DEPRIORITIZE_HINTS = /image|img|blog|clanek|clanky|news|novinky|stranky?|page/i;

  const score = (url: string): number => {
    if (PRODUCT_HINTS.test(url)) return 0;
    if (DEPRIORITIZE_HINTS.test(url)) return 2;
    return 1;
  };

  return [...urls].sort((a, b) => score(a) - score(b));
}

/**
 * Načte sitemapu (a rekurzivně sitemap indexy, max MAX_SITEMAPS souborů) a
 * vrátí všechny <loc> URL, které v nich najde (max MAX_URLS). Respektuje
 * rate limit 1 request / 3 s / doménu a volitelný sdílený `budget` (probe-shops.ts).
 * Index vs. urlset se pozná podle kořenového XML elementu, ne podle jména URL.
 */
export async function fetchSitemapUrls(sitemapUrl: string, budget?: Budget): Promise<string[]> {
  const visited = new Set<string>();
  const queue = [sitemapUrl];
  const urls: string[] = [];

  while (
    queue.length > 0 &&
    visited.size < MAX_SITEMAPS &&
    urls.length < MAX_URLS &&
    !budget?.exhausted
  ) {
    const current = queue.shift()!;
    if (visited.has(current)) {
      continue;
    }
    visited.add(current);

    const url = new URL(current);
    await waitForRateLimit(url.hostname);

    const response = await fetchText(current);
    budget?.consume();
    if (!response || response.status >= 400) {
      continue;
    }

    const { rootTag, locs } = parseSitemapDocument(response.text);

    if (rootTag === 'sitemapindex') {
      queue.push(...prioritizeProductSitemaps(locs));
      continue;
    }

    urls.push(...locs);
  }

  return urls.slice(0, MAX_URLS);
}

/** Najde sitemapu(y) k prozkoumání - z robots.txt, jinak default `/sitemap.xml`. */
export function resolveSitemapUrls(baseUrl: string, robotsSitemaps: string[]): string[] {
  if (robotsSitemaps.length > 0) {
    return robotsSitemaps;
  }
  return [new URL('/sitemap.xml', baseUrl).toString()];
}
