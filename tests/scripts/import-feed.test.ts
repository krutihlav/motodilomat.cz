import { Readable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';
import {
  runDryRun,
  runImport,
  type ImportRepository,
  type KnownProduct,
} from '../../scripts/import-feed';

type FakeShop = {
  id: string;
  sourceType: 'feed' | 'crawl';
  feedUrl: string | null;
  feedFormat: 'heureka' | 'google';
  feedPermission: boolean;
  baseUrl: string | null;
  crawlEnabled: boolean;
};

function makeRepository(shop: FakeShop | null): ImportRepository {
  return {
    getShop: async () => shop as never,
    getExistingProducts: async () => new Map(),
    upsertProducts: async () => new Map(),
    insertPriceHistory: async () => {},
    markStaleOutOfStock: async () => 0,
    getKnownProducts: async () => [],
    ignorePendingProducts: async () => 0,
  };
}

function makeSpyRepository(shop: FakeShop | null) {
  const upsertedItems: unknown[] = [];
  const repository: ImportRepository = {
    getShop: async () => shop as never,
    getExistingProducts: async () => new Map(),
    upsertProducts: async (shopId, items) => {
      upsertedItems.push(...items);
      return new Map(items.map((item) => [item.itemId, `id-${item.itemId}`]));
    },
    insertPriceHistory: async () => {},
    markStaleOutOfStock: async () => 0,
    getKnownProducts: async () => [],
    ignorePendingProducts: async () => 0,
  };
  return { repository, upsertedItems };
}

const GOOGLE_FEED_XML = `<?xml version="1.0"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
<channel>
<item>
<g:id>TEST-001</g:id>
<title>Karburátor Jikov pro Jawa 350</title>
<link>https://example.com/karburator</link>
<g:price>1290.00 CZK</g:price>
<g:availability>in stock</g:availability>
</item>
</channel>
</rss>`;

function fakeFetchFeed(): Promise<Readable> {
  return Promise.resolve(Readable.from([GOOGLE_FEED_XML]));
}

describe('runDryRun', () => {
  it('works even when feed_permission is false - that is the whole point of --dry-run', async () => {
    const shop: FakeShop = {
      id: 'motomax',
      sourceType: 'feed',
      feedUrl: 'https://www.motomax.cz/google.xml',
      feedFormat: 'google',
      feedPermission: false,
      baseUrl: 'https://www.motomax.cz',
      crawlEnabled: false,
    };

    const summary = await runDryRun(shop.id, makeRepository(shop), { fetchFeed: fakeFetchFeed });

    expect(summary.totalInFeed).toBe(1);
    expect(summary.relevant).toBe(1);
    expect(summary.samples[0]?.productName).toBe('Karburátor Jikov pro Jawa 350');
  });

  it('still requires a feed_url to be set at all', async () => {
    const shop: FakeShop = {
      id: 'no-feed-url',
      sourceType: 'feed',
      feedUrl: null,
      feedFormat: 'heureka',
      feedPermission: false,
      baseUrl: null,
      crawlEnabled: false,
    };

    await expect(runDryRun(shop.id, makeRepository(shop))).rejects.toThrow(/feed_url/);
  });
});

function makeCountingRepository(shop: FakeShop) {
  const calls = { markStale: 0, upserted: [] as string[], flags: new Map<string, string[]>() };
  const repository: ImportRepository = {
    getShop: async () => shop as never,
    getExistingProducts: async () => new Map(),
    upsertProducts: async (_shopId, items, _now, reviewFlags) => {
      calls.upserted.push(...items.map((item) => item.itemId));
      reviewFlags?.forEach((value, key) => calls.flags.set(key, value));
      return new Map(items.map((item) => [item.itemId, `id-${item.itemId}`]));
    },
    insertPriceHistory: async () => {},
    markStaleOutOfStock: async () => {
      calls.markStale += 1;
      return 7;
    },
    getKnownProducts: async () => [],
    ignorePendingProducts: async () => 0,
  };
  return { repository, calls };
}

const CRAWL_SHOP: FakeShop = {
  id: 'motojelinek',
  sourceType: 'crawl',
  feedUrl: null,
  feedFormat: 'heureka',
  feedPermission: false,
  baseUrl: 'https://www.motojelinek.cz',
  crawlEnabled: true,
};

const crawlItem = (itemId: string, productName: string, priceVat: number, extra = {}) => ({
  itemId,
  productName,
  priceVat,
  url: `https://www.motojelinek.cz/p/${itemId}`,
  ...extra,
});

describe('runImport - pojistky a pravidla kvality', () => {
  it('does not call markStaleOutOfStock (and warns) when the source returns 0 items', async () => {
    const { repository, calls } = makeCountingRepository(CRAWL_SHOP);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    async function* emptyCrawl() {}

    const summary = await runImport(CRAWL_SHOP.id, repository, { crawlShop: emptyCrawl });

    expect(calls.markStale).toBe(0);
    expect(summary.staleMarkingSkipped).toBe(true);
    expect(summary.markedOutOfStock).toBe(0);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('0 položek'));
    warn.mockRestore();
  });

  it('still marks stale items when the source returned items (even if none are relevant)', async () => {
    const { repository, calls } = makeCountingRepository(CRAWL_SHOP);
    async function* crawl() {
      yield crawlItem('a', 'Helma KTM', 1000);
    }

    const summary = await runImport(CRAWL_SHOP.id, repository, { crawlShop: crawl });

    expect(calls.markStale).toBe(1);
    expect(summary.staleMarkingSkipped).toBe(false);
    expect(summary.markedOutOfStock).toBe(7);
  });

  it('drops excluded items before upsert, counts them by reason, and passes review flags', async () => {
    const { repository, calls } = makeCountingRepository(CRAWL_SHOP);
    async function* crawl() {
      yield crawlItem('ok', 'Píst Jawa 350', 500);
      yield crawlItem('zero', 'Oprava klikové hřídele Jawa 350', 0);
      yield crawlItem('bike', 'Jawa 300 CL forty two 42 modrá', 99_900);
      yield crawlItem('engine', 'Motor bez startéru kompletní JAWA 350', 25_000);
      yield crawlItem('toy', 'Model Jawa 350', 300, { categoryText: 'Modely motocyklů, automobilů' });
      yield crawlItem('tank', 'Nádrž po renovaci Jawa-čz 353', 16_052);
      yield crawlItem('plexi', 'Plexi RVM 500 by Jawa adventure', 1_200);
    }

    const summary = await runImport(CRAWL_SHOP.id, repository, { crawlShop: crawl });

    expect(calls.upserted.sort()).toEqual(['ok', 'plexi', 'tank']);
    expect(summary.relevant).toBe(7);
    expect(summary.excluded).toEqual({
      price_invalid: 1,
      price_over_limit: 1,
      excluded_category: 1,
      vehicle_name: 1,
      brand_name: 0,
      merch: 0,
      simson_only: 0,
    });
    expect(summary.flagged).toBe(2);
    expect(calls.flags.get('tank')).toEqual(['price_review']);
    expect(calls.flags.get('plexi')).toEqual(['modern_jawa']);
    expect(calls.flags.has('ok')).toBe(false);
  });
});

describe('runImport - dárkové poukazy', () => {
  it('uloží poukaz a hned ho označí ignored (jen pending), ostatní nechá pending', async () => {
    const ignored: string[][] = [];
    const { repository } = makeCountingRepository(CRAWL_SHOP);
    repository.ignorePendingProducts = async (ids) => {
      ignored.push(ids);
      return ids.length;
    };
    async function* crawl() {
      yield crawlItem('ok', 'Píst Jawa 350', 500);
      yield crawlItem('voucher', 'Dárkový poukaz v hodnotě 1000 Kč', 1000, {
        categoryText: 'Jawa',
      });
    }

    const summary = await runImport(CRAWL_SHOP.id, repository, { crawlShop: crawl });

    expect(ignored).toEqual([['id-voucher']]);
    expect(summary.ignoredVoucher).toBe(1);
    expect(summary.newItems).toBe(2);
    expect(summary.errors).toBe(0);
  });

  it('bez poukazů ignorePendingProducts nevolá', async () => {
    const { repository } = makeCountingRepository(CRAWL_SHOP);
    const spy = vi.spyOn(repository, 'ignorePendingProducts');
    async function* crawl() {
      yield crawlItem('ok', 'Píst Jawa 350', 500);
    }

    const summary = await runImport(CRAWL_SHOP.id, repository, { crawlShop: crawl });

    expect(spy).not.toHaveBeenCalled();
    expect(summary.ignoredVoucher).toBe(0);
  });
});

describe('runImport', () => {
  it('refuses to run when feed_permission is false, unlike runDryRun', async () => {
    const shop: FakeShop = {
      id: 'motomax',
      sourceType: 'feed',
      feedUrl: 'https://www.motomax.cz/google.xml',
      feedFormat: 'google',
      feedPermission: false,
      baseUrl: 'https://www.motomax.cz',
      crawlEnabled: false,
    };

    await expect(
      runImport(shop.id, makeRepository(shop), { fetchFeed: fakeFetchFeed }),
    ).rejects.toThrow(/nemá povolený import feedu/);
  });

  it('--internal (enforceGate:false) actually writes even when feed_permission is false', async () => {
    const shop: FakeShop = {
      id: 'motomax',
      sourceType: 'feed',
      feedUrl: 'https://www.motomax.cz/google.xml',
      feedFormat: 'google',
      feedPermission: false,
      baseUrl: 'https://www.motomax.cz',
      crawlEnabled: false,
    };

    const { repository, upsertedItems } = makeSpyRepository(shop);

    const summary = await runImport(shop.id, repository, { fetchFeed: fakeFetchFeed }, new Date(), {
      enforceGate: false,
    });

    expect(summary.newItems).toBe(1);
    expect(upsertedItems).toHaveLength(1);
  });

  it('passes options.maxRequests through to crawlShop for crawl-based shops', async () => {
    const shop: FakeShop = {
      id: 'motokramek',
      sourceType: 'crawl',
      feedUrl: null,
      feedFormat: 'heureka',
      feedPermission: false,
      baseUrl: 'https://www.motokramek.cz',
      crawlEnabled: true,
    };

    let receivedMaxRequests: number | undefined;
    async function* fakeCrawlShop(_baseUrl: string, maxRequests?: number) {
      receivedMaxRequests = maxRequests;
    }

    await runImport(
      shop.id,
      makeRepository(shop),
      { crawlShop: fakeCrawlShop },
      new Date(),
      { maxRequests: 300 },
    );

    expect(receivedMaxRequests).toBe(300);
  });
});

describe('runImport - refresh known URLs', () => {
  const known = (id: string, name: string, extra: Partial<KnownProduct> = {}): KnownProduct => ({
    id: `row-${id}`,
    shopItemId: `https://www.motojelinek.cz/p/${id}`,
    url: `https://www.motojelinek.cz/p/${id}`,
    name,
    matchStatus: 'pending',
    partId: null,
    ...extra,
  });

  function makeRefreshRepository(rows: KnownProduct[]) {
    const state = { rows: rows.map((row) => ({ ...row })), ignored: [] as string[], markStale: 0 };
    const repository: ImportRepository = {
      getShop: async () => CRAWL_SHOP as never,
      getExistingProducts: async () => new Map(),
      upsertProducts: async (_shopId, items) => {
        for (const item of items) {
          const row = state.rows.find((r) => r.shopItemId === item.itemId);
          if (row) row.name = item.productName;
        }
        return new Map(items.map((item) => [item.itemId, `id-${item.itemId}`]));
      },
      insertPriceHistory: async () => {},
      markStaleOutOfStock: async () => {
        state.markStale += 1;
        return 0;
      },
      getKnownProducts: async () => state.rows.map((row) => ({ ...row })),
      ignorePendingProducts: async (ids) => {
        state.ignored.push(...ids);
        return ids.length;
      },
    };
    return { repository, state };
  }

  it('fixes names, ignores 404 and successfully fetched brand-named rows, keeps failed/unprocessed/human-decided rows pending', async () => {
    const { repository, state } = makeRefreshRepository([
      known('fixed', 'CZ'),
      known('gone', 'CZ / HUN'),
      known('irrelevant', 'CZ (Originál)'),
      known('noproduct', 'CZ'),
      known('error', 'JAWA Moto spol s r. o.'),
      known('robots', 'CZ'),
      known('unprocessed', 'CZ'),
      known('manual', 'CZ', { matchStatus: 'manual' }),
      known('matched', 'CZ', { matchStatus: 'auto', partId: 'part-1' }),
      known('ok', 'Kryt spojky Jawa 350'),
    ]);

    let receivedUrls: string[] = [];
    let receivedBudget = 0;
    const id = (name: string) => `https://www.motojelinek.cz/p/${name}`;
    async function* fakeRefresh(_baseUrl: string, urls: { shopItemId: string; url: string }[], max?: number) {
      receivedUrls = urls.map((u) => u.url);
      receivedBudget = max ?? 0;
      const item = (name: string, productName: string) => ({
        kind: 'item' as const,
        shopItemId: id(name),
        url: id(name),
        item: crawlItem(id(name), productName, 500),
      });
      const other = (kind: 'not_found' | 'no_product' | 'error' | 'disallowed', name: string) => ({
        kind,
        shopItemId: id(name),
        url: id(name),
      });
      yield item('fixed', 'Ampérmetr 10A - JAWA Pérák, 500 OHC');
      yield other('not_found', 'gone');
      yield item('irrelevant', 'Píst 41,25 (čep 12) - Simson S60');
      yield other('no_product', 'noproduct');
      yield other('error', 'error');
      yield other('disallowed', 'robots');
      // 'unprocessed' a 'manual'/'matched' ve výsledcích nejsou (strop requestů)
      yield item('ok', 'Kryt spojky Jawa 350');
    }

    const summary = await runImport(
      CRAWL_SHOP.id,
      repository,
      { refreshKnownUrls: fakeRefresh as never },
      new Date(),
      { refreshKnownUrls: true, maxRequests: 5 },
    );

    expect(receivedUrls).toHaveLength(10);
    expect(receivedBudget).toBe(20); // max(5, 10 URL + 10)
    expect(summary.refresh).toEqual({
      knownUrls: 10,
      outcomes: { item: 3, not_found: 1, no_product: 1, error: 1, disallowed: 1 },
      namesFixed: 1,
      ignoredNotFound: 1,
      // 'irrelevant' (Simson není relevantní -> nepřepsal se) + 'noproduct' (200 bez produktu) - obojí úspěšně staženo
      ignoredBrandName: 2,
    });
    // 'error', 'robots' a 'unprocessed' zůstávají pending, stejně jako manual/auto
    expect(state.ignored.sort()).toEqual(['row-gone', 'row-irrelevant', 'row-noproduct']);
    expect(state.rows.find((r) => r.id === 'row-fixed')?.name).toBe('Ampérmetr 10A - JAWA Pérák, 500 OHC');
    expect(state.markStale).toBe(0);
  });

  it('refuses to run for feed-based shops', async () => {
    const { repository } = makeRefreshRepository([]);
    const feedShop = { ...CRAWL_SHOP, sourceType: 'feed' as const, feedUrl: 'https://x.test/f.xml' };
    repository.getShop = async () => feedShop as never;

    await expect(
      runImport(feedShop.id, repository, {}, new Date(), { refreshKnownUrls: true, enforceGate: false }),
    ).rejects.toThrow(/jen pro crawlované shopy/);
  });
});
