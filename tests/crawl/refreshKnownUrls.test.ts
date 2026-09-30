import { describe, expect, it } from 'vitest';
import { refreshKnownUrls, type RefreshOutcome } from '../../src/lib/crawl/refreshKnownUrls';
import type { RobotsCheck } from '../../src/lib/crawl/robots';

const BASE = 'https://www.motojelinek.cz';
const page = (id: string) => `${BASE}/p/${id}`;

const PRODUCT_HTML = (name: string) => `
  <h1>${name}</h1>
  <div itemscope itemtype="http://schema.org/Product">
    <span itemprop="brand" itemscope itemtype="https://schema.org/Brand"><meta itemprop="name" content="CZ"></span>
    <h1 itemprop="name">${name}</h1>
    <meta itemprop="price" content="250">
  </div>`;

const robotsOk: RobotsCheck = {
  status: 'found',
  rules: { disallow: ['/admin'], allow: [], sitemaps: [] },
  crawlAllowed: true,
};

async function collect(gen: AsyncGenerator<RefreshOutcome>) {
  const out: RefreshOutcome[] = [];
  for await (const outcome of gen) out.push(outcome);
  return out;
}

function makeDeps(pages: Record<string, { status: number; text?: string } | null>, robots = robotsOk) {
  const fetched: string[] = [];
  const waited: string[] = [];
  return {
    fetched,
    waited,
    deps: {
      fetchRobots: async () => robots,
      waitForRateLimit: async (host: string) => {
        waited.push(host);
      },
      fetchText: async (url: string) => {
        fetched.push(url);
        const response = pages[url];
        return response ? { status: response.status, text: response.text ?? '', headers: new Headers() } : null;
      },
    },
  };
}

describe('refreshKnownUrls', () => {
  it('classifies each known URL and keeps the stored itemId/url', async () => {
    const { deps, fetched, waited } = makeDeps({
      [page('a')]: { status: 200, text: PRODUCT_HTML('Ampérmetr 10A - JAWA Pérák') },
      [page('b')]: { status: 404 },
      [page('c')]: { status: 200, text: '<html>žádný produkt</html>' },
      [page('d')]: { status: 503 },
      [page('e')]: null,
    });
    const known = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ shopItemId: `stored-${id}`, url: page(id) }));

    const outcomes = await collect(refreshKnownUrls(BASE, known, 100, deps));

    expect(outcomes.map((o) => o.kind)).toEqual(['item', 'not_found', 'no_product', 'error', 'error']);
    const item = outcomes[0];
    expect(item.kind === 'item' && item.item.itemId).toBe('stored-a');
    expect(item.kind === 'item' && item.item.url).toBe(page('a'));
    expect(item.kind === 'item' && item.item.productName).toBe('Ampérmetr 10A - JAWA Pérák');
    expect(fetched).toEqual(known.map((k) => k.url));
    expect(waited).toHaveLength(5); // rate limit před každým requestem
  });

  it('treats 410 as not_found and skips robots-disallowed paths without fetching', async () => {
    const { deps, fetched } = makeDeps({ [page('gone')]: { status: 410 } });
    const outcomes = await collect(
      refreshKnownUrls(
        BASE,
        [
          { shopItemId: 'gone', url: page('gone') },
          { shopItemId: 'admin', url: `${BASE}/admin/x` },
        ],
        100,
        deps,
      ),
    );

    expect(outcomes.map((o) => o.kind)).toEqual(['not_found', 'disallowed']);
    expect(fetched).toEqual([page('gone')]);
  });

  it('stops when the request budget is exhausted (robots.txt counts too)', async () => {
    const { deps, fetched } = makeDeps({
      [page('a')]: { status: 404 },
      [page('b')]: { status: 404 },
      [page('c')]: { status: 404 },
    });
    // fetchRobots v mocku budget nespotřebuje -> strop 2 = 2 stránky.
    const outcomes = await collect(
      refreshKnownUrls(
        BASE,
        ['a', 'b', 'c'].map((id) => ({ shopItemId: id, url: page(id) })),
        2,
        deps,
      ),
    );

    expect(outcomes).toHaveLength(2);
    expect(fetched).toHaveLength(2);
  });

  it('yields nothing when robots.txt forbids crawling', async () => {
    const { deps, fetched } = makeDeps({}, { ...robotsOk, crawlAllowed: false });
    const outcomes = await collect(
      refreshKnownUrls(BASE, [{ shopItemId: 'a', url: page('a') }], 10, deps),
    );

    expect(outcomes).toEqual([]);
    expect(fetched).toEqual([]);
  });
});
