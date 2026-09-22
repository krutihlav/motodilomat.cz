/** Produkt extrahovaný z JSON-LD (schema.org/Product) stránky e-shopu. */
export type CrawledProduct = {
  url: string;
  name: string;
  priceVat: number;
  priceCurrency?: string;
  inStock?: boolean;
  imageUrl?: string;
  sku?: string;
  mpn?: string;
  ean?: string;
  description?: string;
};

export type Platform =
  'shoptet' | 'upgates' | 'eshop-rychle' | 'woocommerce' | 'prestashop' | 'opencart' | 'unknown';
