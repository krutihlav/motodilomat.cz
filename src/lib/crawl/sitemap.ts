import sax from 'sax';
import { fetchText, waitForRateLimit } from './httpClient';

const MAX_SITEMAPS = 20;
const MAX_URLS = 5_000;

/** Vytáhne <loc> hodnoty z jednoho sitemap XML dokumentu (urlset nebo sitemapindex). */
export function parseSitemapLocs(xml: string): string[] {
  const parser = sax.parser(false, { trim: true, lowercase: true });
  const locs: string[] = [];
  let inLoc = false;
  let buffer = '';

  parser.onopentag = (node) => {
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
  return locs;
}

function looksLikeSitemapIndex(locs: string[]): boolean {
  return locs.some((loc) => /sitemap.*\.xml(\.gz)?$/i.test(loc));
}

/**
 * Načte sitemapu (a rekurzivně sitemap indexy, max MAX_SITEMAPS souborů) a
 * vrátí všechny <loc> URL, které v nich najde (max MAX_URLS). Respektuje
 * rate limit 1 request / 3 s / doménu.
 */
export async function fetchSitemapUrls(sitemapUrl: string): Promise<string[]> {
  const visited = new Set<string>();
  const queue = [sitemapUrl];
  const urls: string[] = [];

  while (queue.length > 0 && visited.size < MAX_SITEMAPS && urls.length < MAX_URLS) {
    const current = queue.shift()!;
    if (visited.has(current)) {
      continue;
    }
    visited.add(current);

    const url = new URL(current);
    await waitForRateLimit(url.hostname);

    const response = await fetchText(current);
    if (!response || response.status >= 400) {
      continue;
    }

    const locs = parseSitemapLocs(response.text);

    if (looksLikeSitemapIndex(locs) && !current.includes('urlset')) {
      // Sitemap index odkazující na další sitemapy (typicky /sitemap.xml -> /sitemap-products.xml, ...).
      const nested = locs.filter((loc) => /\.xml(\.gz)?(\?.*)?$/i.test(loc));
      if (nested.length === locs.length && locs.length > 0) {
        queue.push(...nested);
        continue;
      }
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
