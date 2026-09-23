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

  it('does not pick up itemprop="name" from an unrelated Person/Organization block on the page', () => {
    // Regrese: probe-shops v2 na motojelinek.cz vracelo jako "name" produktu
    // jméno majitele e-shopu, protože extrakce hledala první itemprop="name"
    // na celé stránce místo jen uvnitř Product bloku.
    const html = `
      <header itemscope itemtype="https://schema.org/Person">
        <span itemprop="name">Jan Jelínek</span>
      </header>
      <main>
        <div itemscope itemtype="https://schema.org/Product">
          <span itemprop="name">Podsedlové plechy 6 - Jawa 50/550</span>
          <span itemprop="price" content="7250"></span>
          <link itemprop="availability" href="https://schema.org/InStock" />
        </div>
      </main>
    `;

    const product = extractMicrodataProduct(html);
    expect(product?.name).toBe('Podsedlové plechy 6 - Jawa 50/550');
    expect(product?.priceVat).toBe(7250);
  });

  it('extracts url/sku/mpn/ean/imageUrl/description alongside name/price', () => {
    const html = `
      <div itemscope itemtype="https://schema.org/Product">
        <span itemprop="name">Karburátor Jikov 2917</span>
        <link itemprop="url" href="https://motojelinek.cz/p/karburator-jikov-2917" />
        <span itemprop="sku">JK-2917</span>
        <span itemprop="mpn">2917-MPN</span>
        <span itemprop="gtin13">8590000000011</span>
        <img itemprop="image" src="https://motojelinek.cz/img/2917.jpg" />
        <span itemprop="description">Karburátor pro Jawu 350.</span>
        <span itemprop="price" content="1290"></span>
      </div>
    `;

    const product = extractMicrodataProduct(html);
    expect(product).toMatchObject({
      url: 'https://motojelinek.cz/p/karburator-jikov-2917',
      sku: 'JK-2917',
      mpn: '2917-MPN',
      ean: '8590000000011',
      imageUrl: 'https://motojelinek.cz/img/2917.jpg',
      description: 'Karburátor pro Jawu 350.',
    });
  });

  it('falls back to itemprop="gtin" when gtin13 is missing', () => {
    const html = `
      <div itemscope itemtype="https://schema.org/Product">
        <span itemprop="name">Řetěz Simson S51</span>
        <span itemprop="gtin">8590000000035</span>
        <span itemprop="price" content="350"></span>
      </div>
    `;

    expect(extractMicrodataProduct(html)?.ean).toBe('8590000000035');
  });

  it('reproduces motojelinek.cz-like markup: manually authored microdata s obrázkem a sku, bez samostatného itemprop="url"', () => {
    // Reálný tvar produktové stránky motojelinek.cz z probe v2 (Fáze 3c) -
    // vlastní microdata bez JSON-LD, cena/dostupnost v <span content=...>,
    // obrázek přes <img itemprop="image" src=...>. url musí crawlShop.ts
    // doplnit z URL stránky (extraktor sám o pageUrl neví).
    const html = `
      <html>
        <body>
          <div itemscope itemtype="https://schema.org/Product">
            <h1 itemprop="name">Podsedlové plechy 6 - Jawa 50/550</h1>
            <img itemprop="image" src="https://www.motojelinek.cz/img/podsedlove-plechy-6.jpg" />
            <span itemprop="sku">MJ-6550</span>
            <span itemprop="price" content="7250">7 250 Kč</span>
            <meta itemprop="priceCurrency" content="CZK" />
            <link itemprop="availability" href="https://schema.org/InStock" />
          </div>
        </body>
      </html>
    `;

    const product = extractMicrodataProduct(html);
    expect(product).toMatchObject({
      name: 'Podsedlové plechy 6 - Jawa 50/550',
      priceVat: 7250,
      priceCurrency: 'CZK',
      inStock: true,
      sku: 'MJ-6550',
      imageUrl: 'https://www.motojelinek.cz/img/podsedlove-plechy-6.jpg',
    });
    expect(product?.url).toBeUndefined();
  });

  it('does not leak the closing tag of a nested same-name element as the scope boundary', () => {
    // Vnořené <div> uvnitř Product bloku (běžné v reálném markupu) nesmí
    // ukončit hledání rozsahu předčasně na první </div>.
    const html = `
      <div itemscope itemtype="https://schema.org/Product">
        <div class="wrapper">
          <span itemprop="name">Řetěz Simson S51</span>
        </div>
        <span itemprop="price" content="350"></span>
      </div>
    `;

    const product = extractMicrodataProduct(html);
    expect(product?.name).toBe('Řetěz Simson S51');
    expect(product?.priceVat).toBe(350);
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
