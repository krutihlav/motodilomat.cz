import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { detectPlatform } from '../../src/lib/crawl/platform';

const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures');

function readFixture(name: string): string {
  return readFileSync(path.join(FIXTURES_DIR, name), 'utf-8');
}

describe('detectPlatform', () => {
  it('detects Shoptet from CDN script and data attribute', () => {
    expect(detectPlatform(readFixture('shoptet-product.html'))).toBe('shoptet');
  });

  it('detects WooCommerce from generator meta and plugin path', () => {
    expect(detectPlatform(readFixture('woocommerce-product.html'))).toBe('woocommerce');
  });

  it('returns unknown for a plain page with no platform signatures', () => {
    expect(detectPlatform('<html><body>Nic zvláštního</body></html>')).toBe('unknown');
  });

  it('detects Upgates from CDN and window global', () => {
    expect(detectPlatform('<script src="https://cdn.upgates.com/x.js"></script>')).toBe('upgates');
    expect(detectPlatform('<script>window.UPGATES = {};</script>')).toBe('upgates');
  });

  it('detects Eshop-rychle from its domain signature', () => {
    expect(detectPlatform('<script src="https://123456.s1.eshop-rychle.cz/x.js"></script>')).toBe(
      'eshop-rychle',
    );
  });

  it('detects PrestaShop and OpenCart', () => {
    expect(detectPlatform('<meta name="generator" content="PrestaShop 8.1">')).toBe('prestashop');
    expect(detectPlatform('<a href="index.php?route=product/product&product_id=1">x</a>')).toBe(
      'opencart',
    );
  });
});
