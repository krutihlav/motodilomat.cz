import { Readable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { runDryRun, runImport, type ImportRepository } from '../../scripts/import-feed';

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
