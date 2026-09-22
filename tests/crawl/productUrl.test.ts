import { describe, expect, it } from 'vitest';
import { isLikelyProductUrl, platformFeedPaths } from '../../src/lib/crawl/productUrl';

describe('isLikelyProductUrl', () => {
  it('excludes common non-product paths regardless of platform', () => {
    expect(isLikelyProductUrl('https://example.com/blog/novy-clanek', 'unknown')).toBe(false);
    expect(isLikelyProductUrl('https://example.com/kontakt', 'unknown')).toBe(false);
    expect(isLikelyProductUrl('https://example.com/obchodni-podminky', 'unknown')).toBe(false);
    expect(isLikelyProductUrl('https://example.com/', 'unknown')).toBe(false);
  });

  it('matches OpenCart product routes and rejects category routes', () => {
    expect(
      isLikelyProductUrl(
        'https://example.com/index.php?route=product/product&product_id=42',
        'opencart',
      ),
    ).toBe(true);
    expect(
      isLikelyProductUrl(
        'https://example.com/index.php?route=product/category&path=10',
        'opencart',
      ),
    ).toBe(false);
  });

  it('matches WooCommerce /produkt/ and /product/ slugs', () => {
    expect(isLikelyProductUrl('https://example.com/produkt/karburator-jikov', 'woocommerce')).toBe(
      true,
    );
    expect(isLikelyProductUrl('https://example.com/kategorie/motor', 'woocommerce')).toBe(false);
  });

  it('falls back to a permissive path-depth check for platforms without a known pattern', () => {
    expect(isLikelyProductUrl('https://example.com/karburator-jikov-2917', 'shoptet')).toBe(true);
  });

  it('rejects an unparseable URL', () => {
    expect(isLikelyProductUrl('not a url', 'unknown')).toBe(false);
  });
});

describe('platformFeedPaths', () => {
  it('returns platform-specific candidate paths for known platforms', () => {
    expect(platformFeedPaths('opencart').length).toBeGreaterThan(0);
    expect(platformFeedPaths('upgates')).toContain('/feed/heureka/');
  });

  it('returns an empty list for platforms without known feed conventions', () => {
    expect(platformFeedPaths('shoptet')).toEqual([]);
    expect(platformFeedPaths('unknown')).toEqual([]);
  });
});
