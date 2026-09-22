#!/usr/bin/env tsx
import {createReadStream} from 'node:fs';
import {Readable} from 'node:stream';
import type {SupabaseClient} from '@supabase/supabase-js';
import {createServiceRoleClient} from '../src/lib/supabase/server';
import {parseHeurekaFeed} from '../src/lib/feed/parseHeurekaFeed';
import {isRelevantItem} from '../src/lib/feed/relevanceFilter';
import type {FeedItem} from '../src/lib/feed/types';

const CHUNK_SIZE = 200;
const STALE_AFTER_DAYS = 3;

export type ImportSummary = {
  shopId: string;
  totalInFeed: number;
  relevant: number;
  newItems: number;
  priceChanges: number;
  markedOutOfStock: number;
  errors: number;
};

type Shop = {
  id: string;
  feedUrl: string | null;
  feedPermission: boolean;
};

type ExistingProduct = {
  id: string;
  price: number;
};

/**
 * Tenká vrstva nad DB přístupem, ať jde import logika testovat i bez
 * skutečného Supabase projektu (viz KROK 6 - ruční ověření nad fixture souborem).
 */
export interface ImportRepository {
  getShop(shopId: string): Promise<Shop | null>;
  getExistingProducts(shopId: string): Promise<Map<string, ExistingProduct>>;
  upsertProducts(
    shopId: string,
    items: FeedItem[],
    now: Date,
  ): Promise<Map<string, string>>; // shopItemId -> shop_products.id
  insertPriceHistory(
    entries: {shopProductId: string; price: number; inStock: boolean}[],
  ): Promise<void>;
  markStaleOutOfStock(shopId: string, cutoff: Date): Promise<number>;
}

export class SupabaseImportRepository implements ImportRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getShop(shopId: string): Promise<Shop | null> {
    const {data, error} = await this.client
      .from('shops')
      .select('id, feed_url, feed_permission')
      .eq('id', shopId)
      .maybeSingle();

    if (error) {
      throw new Error(`Nepodařilo se načíst shop "${shopId}": ${error.message}`);
    }
    if (!data) {
      return null;
    }

    return {id: data.id, feedUrl: data.feed_url, feedPermission: data.feed_permission};
  }

  async getExistingProducts(shopId: string): Promise<Map<string, ExistingProduct>> {
    const {data, error} = await this.client
      .from('shop_products')
      .select('id, shop_item_id, price')
      .eq('shop_id', shopId);

    if (error) {
      throw new Error(`Nepodařilo se načíst existující nabídky pro shop "${shopId}": ${error.message}`);
    }

    const map = new Map<string, ExistingProduct>();
    for (const row of data ?? []) {
      map.set(row.shop_item_id, {id: row.id, price: row.price});
    }
    return map;
  }

  async upsertProducts(shopId: string, items: FeedItem[], now: Date): Promise<Map<string, string>> {
    const rows = items.map((item) => ({
      shop_id: shopId,
      shop_item_id: item.itemId,
      name: item.productName,
      price: Math.round(item.priceVat),
      url: item.url,
      image_url: item.imgUrl ?? null,
      ean: item.ean ?? null,
      in_stock: true,
      delivery_days: item.deliveryDays ?? null,
      category_text: item.categoryText ?? null,
      raw: item,
      last_seen_at: now.toISOString(),
    }));

    const {data, error} = await this.client
      .from('shop_products')
      .upsert(rows, {onConflict: 'shop_id,shop_item_id'})
      .select('id, shop_item_id');

    if (error) {
      throw new Error(`Upsert shop_products selhal: ${error.message}`);
    }

    const result = new Map<string, string>();
    for (const row of data ?? []) {
      result.set(row.shop_item_id, row.id);
    }
    return result;
  }

  async insertPriceHistory(
    entries: {shopProductId: string; price: number; inStock: boolean}[],
  ): Promise<void> {
    if (entries.length === 0) {
      return;
    }

    const {error} = await this.client.from('price_history').insert(
      entries.map((entry) => ({
        shop_product_id: entry.shopProductId,
        price: entry.price,
        in_stock: entry.inStock,
      })),
    );

    if (error) {
      throw new Error(`Zápis do price_history selhal: ${error.message}`);
    }
  }

  async markStaleOutOfStock(shopId: string, cutoff: Date): Promise<number> {
    const {data, error} = await this.client
      .from('shop_products')
      .update({in_stock: false})
      .eq('shop_id', shopId)
      .lt('last_seen_at', cutoff.toISOString())
      .select('id');

    if (error) {
      throw new Error(`Označení nedostupných nabídek selhalo: ${error.message}`);
    }

    return data?.length ?? 0;
  }
}

/** Stáhne feed jako stream. Podporuje http(s) URL i lokální soubor (pro ruční testování). */
export async function openFeedStream(feedUrl: string): Promise<Readable> {
  if (/^https?:\/\//i.test(feedUrl)) {
    const response = await fetch(feedUrl);
    if (!response.ok || !response.body) {
      throw new Error(`Stažení feedu selhalo: HTTP ${response.status}`);
    }
    return Readable.fromWeb(response.body as import('node:stream/web').ReadableStream);
  }
  return createReadStream(feedUrl);
}

export async function runImport(
  shopId: string,
  repository: ImportRepository,
  fetchFeed: (feedUrl: string) => Promise<Readable> = openFeedStream,
  now: Date = new Date(),
): Promise<ImportSummary> {
  const shop = await repository.getShop(shopId);
  if (!shop) {
    throw new Error(`Shop "${shopId}" v Supabase neexistuje.`);
  }
  if (!shop.feedPermission || !shop.feedUrl) {
    throw new Error(
      `Shop "${shopId}" nemá povolený import feedu (feed_permission=${shop.feedPermission}, feed_url=${shop.feedUrl ?? 'null'}). Import se nespustí.`,
    );
  }

  const existing = await repository.getExistingProducts(shopId);

  const summary: ImportSummary = {
    shopId,
    totalInFeed: 0,
    relevant: 0,
    newItems: 0,
    priceChanges: 0,
    markedOutOfStock: 0,
    errors: 0,
  };

  const stream = await fetchFeed(shop.feedUrl);
  let batch: FeedItem[] = [];

  const flushBatch = async () => {
    if (batch.length === 0) {
      return;
    }

    try {
      const idsByItem = await repository.upsertProducts(shopId, batch, now);

      const priceHistoryEntries: {shopProductId: string; price: number; inStock: boolean}[] = [];
      for (const item of batch) {
        const shopProductId = idsByItem.get(item.itemId);
        if (!shopProductId) {
          summary.errors += 1;
          continue;
        }

        const previous = existing.get(item.itemId);
        const newPrice = Math.round(item.priceVat);

        if (!previous) {
          summary.newItems += 1;
          priceHistoryEntries.push({shopProductId, price: newPrice, inStock: true});
        } else if (previous.price !== newPrice) {
          summary.priceChanges += 1;
          priceHistoryEntries.push({shopProductId, price: newPrice, inStock: true});
        }
      }

      await repository.insertPriceHistory(priceHistoryEntries);
    } catch (err) {
      summary.errors += batch.length;
      console.error('Chyba při zápisu dávky do Supabase:', err);
    }

    batch = [];
  };

  for await (const item of parseHeurekaFeed(stream)) {
    summary.totalInFeed += 1;

    if (!isRelevantItem(item)) {
      continue;
    }

    summary.relevant += 1;
    batch.push(item);

    if (batch.length >= CHUNK_SIZE) {
      await flushBatch();
    }
  }
  await flushBatch();

  const cutoff = new Date(now.getTime() - STALE_AFTER_DAYS * 24 * 60 * 60 * 1000);
  summary.markedOutOfStock = await repository.markStaleOutOfStock(shopId, cutoff);

  return summary;
}

function printSummary(summary: ImportSummary): void {
  console.log('--- Souhrn importu ---');
  console.log(`Shop:                    ${summary.shopId}`);
  console.log(`Položek celkem ve feedu: ${summary.totalInFeed}`);
  console.log(`Relevantních:            ${summary.relevant}`);
  console.log(`Nových:                  ${summary.newItems}`);
  console.log(`Změněných cen:           ${summary.priceChanges}`);
  console.log(`Označeno jako nedostupné (>${STALE_AFTER_DAYS} dny neviděno): ${summary.markedOutOfStock}`);
  console.log(`Chyb:                    ${summary.errors}`);
}

async function main() {
  const shopId = process.argv[2];
  if (!shopId) {
    console.error('Použití: tsx scripts/import-feed.ts <shop_id>');
    process.exit(1);
  }

  const repository = new SupabaseImportRepository(createServiceRoleClient());

  try {
    const summary = await runImport(shopId, repository);
    printSummary(summary);
    if (summary.errors > 0) {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  main();
}
