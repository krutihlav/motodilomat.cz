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
});
