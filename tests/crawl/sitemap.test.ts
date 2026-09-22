import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  parseSitemapDocument,
  parseSitemapLocs,
  prioritizeProductSitemaps,
  resolveSitemapUrls,
} from '../../src/lib/crawl/sitemap';

const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures');

function readFixture(name: string): string {
  return readFileSync(path.join(FIXTURES_DIR, name), 'utf-8');
}

describe('parseSitemapLocs', () => {
  it('extracts product URLs from a urlset sitemap', () => {
    const locs = parseSitemapLocs(readFixture('sitemap-products.xml'));

    expect(locs).toEqual([
      'https://testovaci-eshop.example/karburator-jikov-2917',
      'https://testovaci-eshop.example/retez-simson-s51',
      'https://testovaci-eshop.example/svicka-ngk-b6hs',
    ]);
  });

  it('extracts nested sitemap URLs from a sitemapindex', () => {
    const locs = parseSitemapLocs(readFixture('sitemap-index.xml'));

    expect(locs).toEqual([
      'https://testovaci-eshop.example/sitemap-products.xml',
      'https://testovaci-eshop.example/sitemap-pages.xml',
    ]);
  });
});

describe('parseSitemapDocument', () => {
  it('identifies the root tag as urlset for a plain product sitemap', () => {
    const { rootTag, locs } = parseSitemapDocument(readFixture('sitemap-products.xml'));
    expect(rootTag).toBe('urlset');
    expect(locs).toHaveLength(3);
  });

  it('identifies the root tag as sitemapindex for a sitemap index', () => {
    const { rootTag, locs } = parseSitemapDocument(readFixture('sitemap-index.xml'));
    expect(rootTag).toBe('sitemapindex');
    expect(locs).toHaveLength(2);
  });

  it('detects index vs. urlset from the root element even when URLs do not follow naming conventions', () => {
    // Regression: dřívější heuristika hádala index/urlset podle jména <loc> URL
    // (matchovala "sitemap*.xml"), takže obyčejný urlset s produkty, jejichž
    // vlastní <loc> URL sitemapy neobsahuje "urlset", mohl být mylně považován
    // za index. Teď se to pozná ze skutečného kořenového elementu.
    const urlsetWithUnusualLocs = `<?xml version="1.0"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url><loc>https://example.com/produkt-sitemap-styl-nazvu.xml</loc></url>
      </urlset>`;

    const { rootTag, locs } = parseSitemapDocument(urlsetWithUnusualLocs);
    expect(rootTag).toBe('urlset');
    expect(locs).toEqual(['https://example.com/produkt-sitemap-styl-nazvu.xml']);
  });
});

describe('prioritizeProductSitemaps', () => {
  it('sorts product-hinted sitemaps before neutral and deprioritized ones', () => {
    const sorted = prioritizeProductSitemaps([
      'https://example.com/sitemap-blog.xml',
      'https://example.com/sitemap-images.xml',
      'https://example.com/sitemap-produkty.xml',
      'https://example.com/sitemap-stranky.xml',
      'https://example.com/sitemap-other.xml',
    ]);

    expect(sorted[0]).toBe('https://example.com/sitemap-produkty.xml');
    const deprioritizedIndexes = sorted
      .map((url, index) => ({ url, index }))
      .filter(({ url }) => /sitemap-(blog|images|stranky)\.xml/.test(url))
      .map(({ index }) => index);
    const productIndex = sorted.indexOf('https://example.com/sitemap-produkty.xml');
    const otherIndex = sorted.indexOf('https://example.com/sitemap-other.xml');

    expect(Math.min(...deprioritizedIndexes)).toBeGreaterThan(productIndex);
    expect(Math.min(...deprioritizedIndexes)).toBeGreaterThan(otherIndex);
  });
});

describe('resolveSitemapUrls', () => {
  it('uses sitemaps declared in robots.txt when present', () => {
    const urls = resolveSitemapUrls('https://example.com', [
      'https://example.com/custom-sitemap.xml',
    ]);
    expect(urls).toEqual(['https://example.com/custom-sitemap.xml']);
  });

  it('falls back to /sitemap.xml when robots.txt has no Sitemap directive', () => {
    const urls = resolveSitemapUrls('https://example.com', []);
    expect(urls).toEqual(['https://example.com/sitemap.xml']);
  });
});
