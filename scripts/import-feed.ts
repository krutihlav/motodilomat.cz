#!/usr/bin/env tsx
import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceRoleClient } from '../src/lib/supabase/server';
import { parseHeurekaFeed } from '../src/lib/feed/parseHeurekaFeed';
import { parseGoogleFeed } from '../src/lib/feed/parseGoogleFeed';
import { isRelevantItem } from '../src/lib/feed/relevanceFilter';
import {
  assessItem,
  autoIgnoreReason,
  EXCLUSION_REASONS,
  type ExclusionReason,
} from '../src/lib/feed/itemQuality';
import type { FeedItem } from '../src/lib/feed/types';
import { crawlShop } from '../src/lib/crawl/crawlShop';
import {
  refreshKnownUrls,
  type KnownUrl,
  type RefreshOutcome,
} from '../src/lib/crawl/refreshKnownUrls';
import { isBrandLikeName } from '../src/lib/crawl/brandName';

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
  /** true = zdroj vrátil 0 položek, markStaleOutOfStock se nevolal (selhaný crawl/feed nesmí shodit sklad). */
  staleMarkingSkipped: boolean;
  /** Relevantní položky vyřazené pravidly kvality (viz itemQuality.ts) - neukládají se. */
  excluded: Record<ExclusionReason, number>;
  /** Uložené položky s review_flags (cena k ověření, moderní Jawa). */
  flagged: number;
  /** Dárkové poukazy: uloženy a rovnou match_status='ignored' (jen pending bez part_id). */
  ignoredVoucher: number;
  /** Jen v režimu --refresh-known-urls. */
  refresh?: RefreshSummary;
  errors: number;
};

export type RefreshSummary = {
  knownUrls: number;
  /** Výsledky stahování URL podle druhu (item = stránka s produktem). */
  outcomes: Record<RefreshOutcome['kind'], number>;
  /** Řádky, kterým se brand-like název (CZ, JAWA Moto...) přepsal skutečným názvem. */
  namesFixed: number;
  /** Pending řádky označené ignored, protože stránka vrátila 404/410. */
  ignoredNotFound: number;
  /** Pending řádky označené ignored, protože úspěšně stažená stránka má pořád název = značka. */
  ignoredBrandName: number;
};

/** Řádek shop_products potřebný pro refresh known URLs. */
export type KnownProduct = {
  id: string;
  shopItemId: string;
  url: string;
  name: string;
  matchStatus: string | null;
  partId: string | null;
};

function emptyExcluded(): Record<ExclusionReason, number> {
  return {
    price_invalid: 0,
    price_over_limit: 0,
    excluded_category: 0,
    vehicle_name: 0,
    brand_name: 0,
    merch: 0,
    simson_only: 0,
  };
}

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
  upsertProducts(
    shopId: string,
    items: FeedItem[],
    now: Date,
    reviewFlags?: Map<string, string[]>, // shopItemId -> review_flags
  ): Promise<Map<string, string>>; // shopItemId -> shop_products.id
  insertPriceHistory(
    entries: { shopProductId: string; price: number; inStock: boolean }[],
  ): Promise<void>;
  markStaleOutOfStock(shopId: string, cutoff: Date): Promise<number>;
  getKnownProducts(shopId: string): Promise<KnownProduct[]>;
  /** match_status='ignored' jen u řádků, které jsou pořád pending a bez part_id (lidská rozhodnutí se nepřepisují). */
  ignorePendingProducts(ids: string[]): Promise<number>;
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

  async upsertProducts(
    shopId: string,
    items: FeedItem[],
    now: Date,
    reviewFlags: Map<string, string[]> = new Map(),
  ): Promise<Map<string, string>> {
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
      review_flags: reviewFlags.get(item.itemId) ?? [],
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

  async getKnownProducts(shopId: string): Promise<KnownProduct[]> {
    const rows: KnownProduct[] = [];
    const pageSize = 1_000;

    for (let from = 0; ; from += pageSize) {
      const { data, error } = await this.client
        .from('shop_products')
        .select('id, shop_item_id, url, name, match_status, part_id')
        .eq('shop_id', shopId)
        .order('id')
        .range(from, from + pageSize - 1);

      if (error) {
        throw new Error(`Nepodařilo se načíst shop_products pro shop "${shopId}": ${error.message}`);
      }
      for (const row of data ?? []) {
        rows.push({
          id: row.id,
          shopItemId: row.shop_item_id,
          url: row.url,
          name: row.name,
          matchStatus: row.match_status,
          partId: row.part_id,
        });
      }
      if (!data || data.length < pageSize) {
        return rows;
      }
    }
  }

  async ignorePendingProducts(ids: string[]): Promise<number> {
    let updated = 0;
    const chunkSize = 200;

    for (let i = 0; i < ids.length; i += chunkSize) {
      const { data, error } = await this.client
        .from('shop_products')
        .update({ match_status: 'ignored' })
        .in('id', ids.slice(i, i + chunkSize))
        .is('part_id', null)
        .eq('match_status', 'pending')
        .select('id');

      if (error) {
        throw new Error(`Označení řádků jako ignored selhalo: ${error.message}`);
      }
      updated += data?.length ?? 0;
    }
    return updated;
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
  refreshKnownUrls?: (
    baseUrl: string,
    known: KnownUrl[],
    maxRequests?: number,
  ) => AsyncGenerator<RefreshOutcome>;
};

function assertCrawlable(shop: Shop, enforceGate: boolean): string {
  if (enforceGate && (!shop.crawlEnabled || !shop.baseUrl)) {
    throw new Error(
      `Shop "${shop.id}" nemá povolený crawl (crawl_enabled=${shop.crawlEnabled}, base_url=${shop.baseUrl ?? 'null'}). Import se nespustí.`,
    );
  }
  if (!shop.baseUrl) {
    throw new Error(`Shop "${shop.id}" nemá vyplněný base_url.`);
  }
  return shop.baseUrl;
}

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
    const baseUrl = assertCrawlable(shop, enforceGate);
    const crawl = deps.crawlShop ?? crawlShop;
    return crawl(baseUrl, maxRequests);
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
  /**
   * Jednorázový režim pro crawlované shopy: místo sitemapy projde URL
   * existujících řádků shop_products (strop requestů = max(maxRequests,
   * počet URL + 10)), opravené řádky přepíše a pending řádky s 404/410 nebo
   * s názvem pořád rovným značce označí ignored. Nevolá markStaleOutOfStock.
   */
  refreshKnownUrls?: boolean;
};

type RefreshContext = {
  items: AsyncGenerator<FeedItem>;
  knownById: Map<string, KnownProduct>;
  notFoundItemIds: Set<string>;
  /** shopItemId URL, které se úspěšně stáhly (produkt nebo stránka bez produktu; 404/410 je zvlášť). */
  fetchedOkItemIds: Set<string>;
  summary: RefreshSummary;
};

async function startRefresh(
  shop: Shop,
  repository: ImportRepository,
  deps: RunImportDependencies,
  options: RunImportOptions,
): Promise<RefreshContext> {
  if (shop.sourceType !== 'crawl') {
    throw new Error(`--refresh-known-urls jde jen pro crawlované shopy ("${shop.id}" je ${shop.sourceType}).`);
  }
  const baseUrl = assertCrawlable(shop, options.enforceGate ?? true);

  const known = await repository.getKnownProducts(shop.id);
  const knownById = new Map(known.map((product) => [product.shopItemId, product]));
  const summary: RefreshSummary = {
    knownUrls: known.length,
    outcomes: { item: 0, not_found: 0, no_product: 0, error: 0, disallowed: 0 },
    namesFixed: 0,
    ignoredNotFound: 0,
    ignoredBrandName: 0,
  };
  const notFoundItemIds = new Set<string>();
  const fetchedOkItemIds = new Set<string>();
  const maxRequests = Math.max(options.maxRequests ?? 0, known.length + 10);
  const refresh = deps.refreshKnownUrls ?? refreshKnownUrls;

  async function* items(): AsyncGenerator<FeedItem> {
    const urls = known.map(({ shopItemId, url }) => ({ shopItemId, url }));
    for await (const outcome of refresh(baseUrl, urls, maxRequests)) {
      summary.outcomes[outcome.kind] += 1;
      if (outcome.kind === 'not_found') {
        notFoundItemIds.add(outcome.shopItemId);
      } else if (outcome.kind === 'item') {
        fetchedOkItemIds.add(outcome.shopItemId);
        yield outcome.item;
      } else if (outcome.kind === 'no_product') {
        fetchedOkItemIds.add(outcome.shopItemId);
      }
    }
  }

  return { items: items(), knownById, notFoundItemIds, fetchedOkItemIds, summary };
}

/**
 * Po refreshi: pending řádky s 404/410 nebo s názvem pořád rovným značce ->
 * ignored, ale název = značka jen u úspěšně stažených stránek. Řádky, u
 * kterých stažení selhalo (timeout, 5xx, DNS, robots) nebo na které nedošlo,
 * zůstávají pending pro další refresh.
 */
async function finishRefresh(
  shopId: string,
  repository: ImportRepository,
  refresh: RefreshContext,
): Promise<RefreshSummary> {
  const after = await repository.getKnownProducts(shopId);
  const toIgnore: string[] = [];

  for (const product of after) {
    if (product.matchStatus !== 'pending' || product.partId !== null) {
      continue;
    }
    if (refresh.notFoundItemIds.has(product.shopItemId)) {
      refresh.summary.ignoredNotFound += 1;
      toIgnore.push(product.id);
    } else if (refresh.fetchedOkItemIds.has(product.shopItemId) && isBrandLikeName(product.name)) {
      refresh.summary.ignoredBrandName += 1;
      toIgnore.push(product.id);
    }
  }

  await repository.ignorePendingProducts(toIgnore);
  return refresh.summary;
}

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

  const refresh = options.refreshKnownUrls
    ? await startRefresh(shop, repository, deps, options)
    : null;
  const items = refresh
    ? refresh.items
    : resolveItemSource(shop, deps, options.enforceGate ?? true, options.maxRequests);

  const existing = await repository.getExistingProducts(shopId);

  const summary: ImportSummary = {
    shopId,
    totalInFeed: 0,
    relevant: 0,
    newItems: 0,
    priceChanges: 0,
    markedOutOfStock: 0,
    staleMarkingSkipped: false,
    excluded: emptyExcluded(),
    flagged: 0,
    ignoredVoucher: 0,
    errors: 0,
  };

  let batch: FeedItem[] = [];
  const reviewFlags = new Map<string, string[]>();
  const autoIgnoreItemIds = new Set<string>();

  const flushBatch = async () => {
    if (batch.length === 0) {
      return;
    }

    try {
      const idsByItem = await repository.upsertProducts(shopId, batch, now, reviewFlags);

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

      const toIgnore = batch
        .filter((item) => autoIgnoreItemIds.has(item.itemId))
        .map((item) => idsByItem.get(item.itemId))
        .filter((id): id is string => !!id);
      if (toIgnore.length > 0) {
        summary.ignoredVoucher += await repository.ignorePendingProducts(toIgnore);
      }
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

    const assessment = assessItem(item);
    if (assessment.exclusion) {
      summary.excluded[assessment.exclusion] += 1;
      continue;
    }
    if (assessment.flags.length > 0) {
      summary.flagged += 1;
      reviewFlags.set(item.itemId, assessment.flags);
    }
    if (autoIgnoreReason(item.productName)) {
      autoIgnoreItemIds.add(item.itemId);
    }

    batch.push(item);
    if (refresh) {
      const previous = refresh.knownById.get(item.itemId);
      if (previous && isBrandLikeName(previous.name)) {
        refresh.summary.namesFixed += 1;
      }
    }

    if (batch.length >= CHUNK_SIZE) {
      await flushBatch();
    }
  }
  await flushBatch();

  if (refresh) {
    summary.refresh = await finishRefresh(shopId, repository, refresh);
  } else if (summary.totalInFeed === 0) {
    // Selhaný crawl/feed (timeout, blokace, prázdný feed) nesmí označit celý sklad jako nedostupný.
    summary.staleMarkingSkipped = true;
    console.warn(
      `⚠️  Shop "${shopId}": zdroj vrátil 0 položek - markStaleOutOfStock se nevolá, existující nabídky zůstávají beze změny.`,
    );
  } else {
    const cutoff = new Date(now.getTime() - STALE_AFTER_DAYS * 24 * 60 * 60 * 1000);
    summary.markedOutOfStock = await repository.markStaleOutOfStock(shopId, cutoff);
  }

  return summary;
}

export type DryRunSummary = {
  shopId: string;
  source: string;
  totalInFeed: number;
  relevant: number;
  excluded: Record<ExclusionReason, number>;
  flagged: number;
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
    excluded: emptyExcluded(),
    flagged: 0,
    samples: [],
  };

  for await (const item of items) {
    summary.totalInFeed += 1;

    if (!isRelevantItem(item)) {
      continue;
    }

    summary.relevant += 1;

    const assessment = assessItem(item);
    if (assessment.exclusion) {
      summary.excluded[assessment.exclusion] += 1;
      continue;
    }
    if (assessment.flags.length > 0) {
      summary.flagged += 1;
    }

    if (summary.samples.length < DRY_RUN_SAMPLE_SIZE) {
      summary.samples.push(item);
    }
  }

  return summary;
}

function printQualityCounts(excluded: Record<ExclusionReason, number>, flagged: number): void {
  const total = EXCLUSION_REASONS.reduce((sum, reason) => sum + excluded[reason], 0);
  console.log(
    `Vyřazeno pravidly:       ${total} (cena<=0: ${excluded.price_invalid}, cena>30000: ${excluded.price_over_limit}, kategorie: ${excluded.excluded_category}, vozidlo/motor: ${excluded.vehicle_name}, název=značka: ${excluded.brand_name}, merch: ${excluded.merch}, Simson: ${excluded.simson_only})`,
  );
  console.log(`Flagováno k kontrole:    ${flagged}`);
}

function printDryRunSummary(summary: DryRunSummary): void {
  console.log('--- Dry-run importu (nic se nezapisuje) ---');
  console.log(`Shop:                    ${summary.shopId}`);
  console.log(`Zdroj:                   ${summary.source}`);
  console.log(`Položek celkem:          ${summary.totalInFeed}`);
  console.log(`Relevantních:            ${summary.relevant}`);
  printQualityCounts(summary.excluded, summary.flagged);
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
  printQualityCounts(summary.excluded, summary.flagged);
  console.log(`Ignored (poukazy):       ${summary.ignoredVoucher}`);
  console.log(`Nových:                  ${summary.newItems}`);
  console.log(`Změněných cen:           ${summary.priceChanges}`);
  console.log(
    `Označeno jako nedostupné (>${STALE_AFTER_DAYS} dny neviděno): ${summary.markedOutOfStock}`,
  );
  if (summary.staleMarkingSkipped) {
    console.log('⚠️  Zdroj vrátil 0 položek - označování nedostupných přeskočeno.');
  }
  if (summary.refresh) {
    const r = summary.refresh;
    console.log('--- Refresh known URLs ---');
    console.log(`Známých URL:             ${r.knownUrls}`);
    console.log(
      `Výsledky:                produkt ${r.outcomes.item}, 404/410 ${r.outcomes.not_found}, bez produktu ${r.outcomes.no_product}, chyba ${r.outcomes.error}, robots ${r.outcomes.disallowed}`,
    );
    console.log(`Opraveno názvů:          ${r.namesFixed}`);
    console.log(`Ignored (404/410):       ${r.ignoredNotFound}`);
    console.log(`Ignored (název=značka):  ${r.ignoredBrandName}`);
  }
  console.log(`Chyb:                    ${summary.errors}`);
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const internal = args.includes('--internal');
  const refreshKnown = args.includes('--refresh-known-urls');
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
      'Použití: tsx scripts/import-feed.ts <shop_id> [--dry-run|--internal] [--max-requests=N] [--refresh-known-urls]',
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
      refreshKnownUrls: refreshKnown,
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
