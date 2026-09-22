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
});
