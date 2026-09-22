import { describe, expect, it } from 'vitest';
import { extractMicrodataProduct, hasProductTypeMeta } from '../../src/lib/crawl/microdata';

describe('extractMicrodataProduct', () => {
  it('extracts name/price/currency/availability from schema.org microdata', () => {
    const html = `
      <div itemscope itemtype="https://schema.org/Product">
        <span itemprop="name">Karburátor Jikov 2917</span>
        <span itemprop="price" content="1290">1 290 Kč</span>
        <meta itemprop="priceCurrency" content="CZK" />
        <link itemprop="availability" href="https://schema.org/InStock" />
      </div>
    `;

    const product = extractMicrodataProduct(html);
    expect(product).toEqual({
      name: 'Karburátor Jikov 2917',
      priceVat: 1290,
      priceCurrency: 'CZK',
      inStock: true,
    });
  });

  it('reads price from element text when there is no content attribute', () => {
    const html = `
      <div itemscope itemtype="http://schema.org/Product">
        <span itemprop="price">590</span>
      </div>
    `;

    expect(extractMicrodataProduct(html)?.priceVat).toBe(590);
  });

  it('marks out-of-stock availability as false', () => {
    const html = `
      <div itemscope itemtype="https://schema.org/Product">
        <span itemprop="price" content="100"></span>
        <link itemprop="availability" href="https://schema.org/OutOfStock" />
      </div>
    `;

    expect(extractMicrodataProduct(html)?.inStock).toBe(false);
  });

  it('returns null when there is no Product itemtype', () => {
    const html = '<div itemscope itemtype="https://schema.org/Article"></div>';
    expect(extractMicrodataProduct(html)).toBeNull();
  });

  it('returns null when the Product block has no extractable price', () => {
    const html =
      '<div itemscope itemtype="https://schema.org/Product"><span itemprop="name">X</span></div>';
    expect(extractMicrodataProduct(html)).toBeNull();
  });
});

describe('hasProductTypeMeta', () => {
  it('detects og:type=product regardless of attribute order', () => {
    expect(hasProductTypeMeta('<meta property="og:type" content="product">')).toBe(true);
    expect(hasProductTypeMeta('<meta content="product" property="og:type">')).toBe(true);
  });

  it('returns false for other og:type values or missing tag', () => {
    expect(hasProductTypeMeta('<meta property="og:type" content="website">')).toBe(false);
    expect(hasProductTypeMeta('<html></html>')).toBe(false);
  });
});
