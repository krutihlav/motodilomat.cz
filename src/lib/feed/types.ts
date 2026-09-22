/** Jedna položka z Heureka XML feedu (SHOPITEM). */
export type FeedItem = {
  itemId: string;
  productName: string;
  priceVat: number;
  url: string;
  imgUrl?: string;
  ean?: string;
  deliveryDays?: number;
  categoryText?: string;
  description?: string;
};
