/**
 * Jedna položka nabídky e-shopu - buď ze Heureka XML feedu (SHOPITEM), nebo
 * získaná crawlem stránky produktu (JSON-LD Product, viz src/lib/crawl).
 */
export type FeedItem = {
  itemId: string;
  productName: string;
  priceVat: number;
  priceCurrency?: string;
  url: string;
  imgUrl?: string;
  ean?: string;
  mpn?: string;
  deliveryDays?: number;
  categoryText?: string;
  description?: string;
  /** Chybí u feedu (feed obsahuje jen skladové položky) - undefined se bere jako true. */
  inStock?: boolean;
};
