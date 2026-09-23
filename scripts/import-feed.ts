#!/usr/bin/env tsx
import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceRoleClient } from '../src/lib/supabase/server';
import { parseHeurekaFeed } from '../src/lib/feed/parseHeurekaFeed';
import { parseGoogleFeed } from '../src/lib/feed/parseGoogleFeed';
import { isRelevantItem } from '../src/lib/feed/relevanceFilter';
import type { FeedItem } from '../src/lib/feed/types';
import { crawlShop } from '../src/lib/crawl/crawlShop';

type FeedFormat = 'heureka' | 'google';

const FEED_PARSERS: Record<FeedFormat, (stream: Readable) => AsyncGenerator<FeedItem>> = {
  heureka: parseHeurekaFeed,
  google: parseGoogleFeed,
};

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
  sourceType: 'feed' | 'crawl';
  feedUrl: string | null;
  feedFormat: FeedFormat;
  feedPermission: boolean;
  baseUrl: string | null;
  crawlEnabled: boolean;
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
  upsertProducts(shopId: string, items: FeedItem[], now: Date): Promise<Map<string, string>>; // shopItemId -> shop_products.id
  insertPriceHistory(
    entries: { shopProductId: string; price: number; inStock: boolean }[],
  ): Promise<void>;
  markStaleOutOfStock(shopId: string, cutoff: Date): Promise<number>;
}

export class SupabaseImportRepository implements ImportRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getShop(shopId: string): Promise<Shop | null> {
    const { data, error } = await this.client
      .from('shops')
      .select('id, source_type, feed_url, feed_format, feed_permission, base_url, crawl_enabled')
      .eq('id', shopId)
      .maybeSingle();

    if (error) {
      throw new Error(`Nepodařilo se načíst shop "${shopId}": ${error.message}`);
    }
    if (!data) {
      return null;
    }

    return {
      id: data.id,
      sourceType: data.source_type,
      feedUrl: data.feed_url,
      feedFormat: (data.feed_format ?? 'heureka') as FeedFormat,
      feedPermission: data.feed_permission,
      baseUrl: data.base_url,
      crawlEnabled: data.crawl_enabled,
    };
  }

  async getExistingProducts(shopId: string): Promise<Map<string, ExistingProduct>> {
    const { data, error } = await this.client
      .from('shop_products')
      .select('id, shop_item_id, price')
      .eq('shop_id', shopId);

    if (error) {
      throw new Error(
        `Nepodařilo se načíst existující nabídky pro shop "${shopId}": ${error.message}`,
      );
    }

    const map = new Map<string, ExistingProduct>();
    for (const row of data ?? []) {
      map.set(row.shop_item_id, { id: row.id, price: row.price });
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
      in_stock: item.inStock ?? true,
      delivery_days: item.deliveryDays ?? null,
      category_text: item.categoryText ?? null,
      raw: item,
      last_seen_at: now.toISOString(),
    }));

    const { data, error } = await this.client
      .from('shop_products')
      .upsert(rows, { onConflict: 'shop_id,shop_item_id' })
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
    entries: { shopProductId: string; price: number; inStock: boolean }[],
  ): Promise<void> {
    if (entries.length === 0) {
      return;
    }

    const { error } = await this.client.from('price_history').insert(
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
    const { data, error } = await this.client
      .from('shop_products')
      .update({ in_stock: false })
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

export type RunImportDependencies = {
  fetchFeed?: (feedUrl: string) => Promise<Readable>;
  crawlShop?: (baseUrl: string, maxRequests?: number) => AsyncGenerator<FeedItem>;
};

/**
 * `enforceGate` chrání zápisy (runImport) - vyžaduje feed_permission/crawl_enabled.
 * runDryRun ho vypíná: dry-run nic nezapisuje, naopak slouží k ověření
 * zdroje předtím, než se gate vůbec zapne. `maxRequests` přebíjí
 * DEFAULT_MAX_REQUESTS_PER_SHOP z crawlShop.ts (viz --max-requests v main()).
 */
function resolveItemSource(
  shop: Shop,
  deps: RunImportDependencies,
  enforceGate: boolean,
  maxRequests?: number,
): AsyncGenerator<FeedItem> {
  if (shop.sourceType === 'crawl') {
    if (enforceGate && (!shop.crawlEnabled || !shop.baseUrl)) {
      throw new Error(
        `Shop "${shop.id}" nemá povolený crawl (crawl_enabled=${shop.crawlEnabled}, base_url=${shop.baseUrl ?? 'null'}). Import se nespustí.`,
      );
    }
    if (!shop.baseUrl) {
      throw new Error(`Shop "${shop.id}" nemá vyplněný base_url.`);
    }
    const crawl = deps.crawlShop ?? crawlShop;
    return crawl(shop.baseUrl, maxRequests);
  }

  if (enforceGate && !shop.feedPermission) {
    throw new Error(
      `Shop "${shop.id}" nemá povolený import feedu (feed_permission=${shop.feedPermission}, feed_url=${shop.feedUrl ?? 'null'}). Import se nespustí.`,
    );
  }
  if (!shop.feedUrl) {
    throw new Error(`Shop "${shop.id}" nemá vyplněný feed_url.`);
  }

  const fetchFeed = deps.fetchFeed ?? openFeedStream;
  const feedUrl = shop.feedUrl;
  const parseFeed = FEED_PARSERS[shop.feedFormat];
  async function* fromFeed() {
    const stream = await fetchFeed(feedUrl);
    yield* parseFeed(stream);
  }
  return fromFeed();
}

export type RunImportOptions = {
  /**
   * false = spustí skutečný import (zapisuje do shop_products) i bez
   * feed_permission/crawl_enabled. Určeno jen pro `--internal` - jednorázové
   * interní ověření zdroje na produkčních datech, ne pro pravidelný cron
   * (ten vždy volá s enforceGate=true, výchozí hodnotou).
   */
  enforceGate?: boolean;
  /** Přebije DEFAULT_MAX_REQUESTS_PER_SHOP pro crawlované shopy (viz --max-requests). */
  maxRequests?: number;
};

export async function runImport(
  shopId: string,
  repository: ImportRepository,
  deps: RunImportDependencies = {},
  now: Date = new Date(),
  options: RunImportOptions = {},
): Promise<ImportSummary> {
  const shop = await repository.getShop(shopId);
  if (!shop) {
    throw new Error(`Shop "${shopId}" v Supabase neexistuje.`);
  }

  const items = resolveItemSource(shop, deps, options.enforceGate ?? true, options.maxRequests);

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

  let batch: FeedItem[] = [];

  const flushBatch = async () => {
    if (batch.length === 0) {
      return;
    }

    try {
      const idsByItem = await repository.upsertProducts(shopId, batch, now);

      const priceHistoryEntries: { shopProductId: string; price: number; inStock: boolean }[] = [];
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
          priceHistoryEntries.push({
            shopProductId,
            price: newPrice,
            inStock: item.inStock ?? true,
          });
        } else if (previous.price !== newPrice) {
          summary.priceChanges += 1;
          priceHistoryEntries.push({
            shopProductId,
            price: newPrice,
            inStock: item.inStock ?? true,
          });
        }
      }

      await repository.insertPriceHistory(priceHistoryEntries);
    } catch (err) {
      summary.errors += batch.length;
      console.error('Chyba při zápisu dávky do Supabase:', err);
    }

    batch = [];
  };

  for await (const item of items) {
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

export type DryRunSummary = {
  shopId: string;
  source: string;
  totalInFeed: number;
  relevant: number;
  samples: FeedItem[];
};

const DRY_RUN_SAMPLE_SIZE = 10;

/**
 * Stáhne a naparsuje zdroj (feed nebo crawl) stejně jako runImport, ale nic
 * nezapisuje do Supabase - jen spočítá total/relevant a uloží prvních pár
 * relevantních položek jako ukázku. Používá se k ručnímu ověření nového
 * feed_format/crawl zdroje předtím, než se pro shop zapne feed_permission/crawl_enabled.
 */
export async function runDryRun(
  shopId: string,
  repository: Pick<ImportRepository, 'getShop'>,
  deps: RunImportDependencies = {},
): Promise<DryRunSummary> {
  const shop = await repository.getShop(shopId);
  if (!shop) {
    throw new Error(`Shop "${shopId}" v Supabase neexistuje.`);
  }

  const items = resolveItemSource(shop, deps, false);
  const source = shop.sourceType === 'crawl' ? 'crawl' : `feed (${shop.feedFormat})`;

  const summary: DryRunSummary = {
    shopId,
    source,
    totalInFeed: 0,
    relevant: 0,
    samples: [],
  };

  for await (const item of items) {
    summary.totalInFeed += 1;

    if (!isRelevantItem(item)) {
      continue;
    }

    summary.relevant += 1;
    if (summary.samples.length < DRY_RUN_SAMPLE_SIZE) {
      summary.samples.push(item);
    }
  }

  return summary;
}

function printDryRunSummary(summary: DryRunSummary): void {
  console.log('--- Dry-run importu (nic se nezapisuje) ---');
  console.log(`Shop:                    ${summary.shopId}`);
  console.log(`Zdroj:                   ${summary.source}`);
  console.log(`Položek celkem:          ${summary.totalInFeed}`);
  console.log(`Relevantních:            ${summary.relevant}`);
  console.log(`--- Ukázka (max ${DRY_RUN_SAMPLE_SIZE} relevantních) ---`);

  summary.samples.forEach((item, index) => {
    const stock =
      item.inStock === undefined ? 'neznámo' : item.inStock ? 'skladem' : 'není skladem';
    console.log(
      `${index + 1}. ${item.productName} — ${item.priceVat} ${item.priceCurrency ?? 'Kč'} — ${stock} — ${item.url}`,
    );
  });

  if (summary.samples.length === 0) {
    console.log('(žádná relevantní položka)');
  }
}

function printSummary(summary: ImportSummary): void {
  console.log('--- Souhrn importu ---');
  console.log(`Shop:                    ${summary.shopId}`);
  console.log(`Položek celkem ve feedu: ${summary.totalInFeed}`);
  console.log(`Relevantních:            ${summary.relevant}`);
  console.log(`Nových:                  ${summary.newItems}`);
  console.log(`Změněných cen:           ${summary.priceChanges}`);
  console.log(
    `Označeno jako nedostupné (>${STALE_AFTER_DAYS} dny neviděno): ${summary.markedOutOfStock}`,
  );
  console.log(`Chyb:                    ${summary.errors}`);
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const internal = args.includes('--internal');
  const shopId = args.find((arg) => !arg.startsWith('--'));

  const maxRequestsArg = args.find((arg) => arg.startsWith('--max-requests='));
  let maxRequests: number | undefined;
  if (maxRequestsArg) {
    const value = Number(maxRequestsArg.slice('--max-requests='.length));
    if (!Number.isInteger(value) || value <= 0) {
      console.error(`--max-requests musí být kladné celé číslo, dostal jsem "${maxRequestsArg}".`);
      process.exit(1);
    }
    maxRequests = value;
  }

  if (!shopId) {
    console.error(
      'Použití: tsx scripts/import-feed.ts <shop_id> [--dry-run|--internal] [--max-requests=N]',
    );
    process.exit(1);
  }

  const repository = new SupabaseImportRepository(createServiceRoleClient());

  try {
    if (dryRun) {
      const summary = await runDryRun(shopId, repository);
      printDryRunSummary(summary);
      return;
    }

    if (internal) {
      console.warn(
        `⚠️  --internal: import shopu "${shopId}" BEZ ohledu na feed_permission/crawl_enabled. ` +
          'Zapisuje se do shop_products, ale data zůstávají neveřejná (is_public default false, ' +
          'žádná anon select policy). Jen pro interní ověření zdroje před domluvou s e-shopem.',
      );
    }

    const summary = await runImport(shopId, repository, {}, new Date(), {
      enforceGate: !internal,
      maxRequests,
    });
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
