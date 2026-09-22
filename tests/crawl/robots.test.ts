import { describe, expect, it } from 'vitest';
import { isAllowed, parseRobots } from '../../src/lib/crawl/robots';

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
