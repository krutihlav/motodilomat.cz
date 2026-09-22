import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchRobots, isAllowed, parseRobots } from '../../src/lib/crawl/robots';
import { resetRateLimiter } from '../../src/lib/crawl/httpClient';

describe('parseRobots', () => {
  it('parses disallow/allow/sitemap for a wildcard group', () => {
    const rules = parseRobots(`
      User-agent: *
      Disallow: /admin/
      Disallow: /kosik
      Allow: /admin/public/
      Crawl-delay: 5
      Sitemap: https://example.com/sitemap.xml
    `);

    expect(rules.disallow).toEqual(['/admin/', '/kosik']);
    expect(rules.allow).toEqual(['/admin/public/']);
    expect(rules.crawlDelaySeconds).toBe(5);
    expect(rules.sitemaps).toEqual(['https://example.com/sitemap.xml']);
  });

  it('prefers a group targeting MotodilomatBot over the wildcard group', () => {
    const rules = parseRobots(`
      User-agent: *
      Disallow: /

      User-agent: MotodilomatBot
      Disallow: /interni/
    `);

    expect(rules.disallow).toEqual(['/interni/']);
  });

  it('treats an empty robots.txt as fully allowed', () => {
    const rules = parseRobots('');
    expect(rules.disallow).toEqual([]);
    expect(isAllowed(rules, '/cokoliv')).toBe(true);
  });
});

describe('isAllowed', () => {
  it('disallows paths under a disallowed prefix', () => {
    const rules = parseRobots('User-agent: *\nDisallow: /admin/');
    expect(isAllowed(rules, '/admin/nastaveni')).toBe(false);
    expect(isAllowed(rules, '/produkt/karburator')).toBe(true);
  });

  it('lets the longest matching rule win (allow overrides a shorter disallow)', () => {
    const rules = parseRobots('User-agent: *\nDisallow: /produkt/\nAllow: /produkt/verejny/');
    expect(isAllowed(rules, '/produkt/verejny/x')).toBe(true);
    expect(isAllowed(rules, '/produkt/skryty/x')).toBe(false);
  });
});

describe('fetchRobots', () => {
  beforeEach(() => {
    resetRateLimiter();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('maps a 404 to status "not_found" with crawlAllowed=true', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 404 })));

    const result = await fetchRobots('https://example.com');
    expect(result.status).toBe('not_found');
    expect(result.crawlAllowed).toBe(true);
  });

  it('maps a 5xx response to status "unknown", not "not_found"', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 503 })));

    const result = await fetchRobots('https://example.com');
    expect(result.status).toBe('unknown');
    expect(result.crawlAllowed).toBe(true);
  });

  it('maps a network failure (timeout) to status "unknown"', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));

    const result = await fetchRobots('https://example.com');
    expect(result.status).toBe('unknown');
    expect(result.crawlAllowed).toBe(true);
  });

  it('parses a fetched robots.txt and reports status "found"', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('User-agent: *\nDisallow: /admin/', { status: 200 })),
    );

    const result = await fetchRobots('https://example.com');
    expect(result.status).toBe('found');
    expect(result.crawlAllowed).toBe(true);
    expect(isAllowed(result.rules, '/admin/x')).toBe(false);
  });
});
