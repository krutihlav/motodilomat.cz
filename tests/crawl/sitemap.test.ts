import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseSitemapLocs, resolveSitemapUrls } from '../../src/lib/crawl/sitemap';

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
