import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { extractProduct } from '../../src/lib/crawl/jsonld';

const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures');

function readFixture(name: string): string {
  return readFileSync(path.join(FIXTURES_DIR, name), 'utf-8');
}

describe('extractProduct - Shoptet fixture', () => {
  const html = readFixture('shoptet-product.html');

  it('extracts name, price and stock status', () => {
    const product = extractProduct(
      html,
      'https://www.testovaci-eshop.example/karburator-jikov-2917',
    );

    expect(product).not.toBeNull();
    expect(product?.name).toBe('Karburátor Jikov 2917 pro Jawa 350');
    expect(product?.priceVat).toBe(1290);
    expect(product?.priceCurrency).toBe('CZK');
    expect(product?.inStock).toBe(true);
  });

  it('extracts sku/mpn and image', () => {
    const product = extractProduct(
      html,
      'https://www.testovaci-eshop.example/karburator-jikov-2917',
    );

    expect(product?.sku).toBe('05-11-010');
    expect(product?.mpn).toBe('05-11-010');
    expect(product?.imageUrl).toBe(
      'https://cdn.myshoptet.com/usr/www.testovaci-eshop.example/user/shop/big/1234_karburator.jpg',
    );
  });

  it('uses the offer URL as canonical product URL', () => {
    const product = extractProduct(
      html,
      'https://www.testovaci-eshop.example/karburator-jikov-2917?utm=x',
    );
    expect(product?.url).toBe('https://www.testovaci-eshop.example/karburator-jikov-2917');
  });
});

describe('extractProduct - WooCommerce fixture', () => {
  const html = readFixture('woocommerce-product.html');

  it('extracts product from @graph and marks out-of-stock correctly', () => {
    const product = extractProduct(
      html,
      'https://testovaci-woo-eshop.example/produkt/zapalovaci-civka-cz-175/',
    );

    expect(product).not.toBeNull();
    expect(product?.name).toBe('Zapalovací cívka ČZ 175');
    expect(product?.priceVat).toBe(590);
    expect(product?.inStock).toBe(false);
  });

  it('extracts EAN from gtin13 and sku/mpn', () => {
    const product = extractProduct(
      html,
      'https://testovaci-woo-eshop.example/produkt/zapalovaci-civka-cz-175/',
    );

    expect(product?.ean).toBe('8590000000028');
    expect(product?.sku).toBe('353-12-001');
    expect(product?.mpn).toBe('353-12-001');
  });
});

describe('extractProduct - no JSON-LD', () => {
  it('returns null when the page has no Product JSON-LD', () => {
    const product = extractProduct('<html><body>bez dat</body></html>', 'https://example.com/x');
    expect(product).toBeNull();
  });
});
