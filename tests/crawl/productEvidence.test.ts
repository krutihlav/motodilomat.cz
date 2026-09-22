import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { extractProductEvidence } from '../../src/lib/crawl/productEvidence';

const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures');

function readFixture(name: string): string {
  return readFileSync(path.join(FIXTURES_DIR, name), 'utf-8');
}

describe('extractProductEvidence', () => {
  it('prefers JSON-LD when present', () => {
    const evidence = extractProductEvidence(
      readFixture('shoptet-product.html'),
      'https://www.testovaci-eshop.example/karburator-jikov-2917',
    );

    expect(evidence?.kind).toBe('jsonld');
  });

  it('falls back to microdata when there is no JSON-LD', () => {
    const html = `
      <div itemscope itemtype="https://schema.org/Product">
        <span itemprop="name">Karburátor</span>
        <span itemprop="price" content="1290"></span>
      </div>
    `;

    const evidence = extractProductEvidence(html, 'https://example.com/x');
    expect(evidence?.kind).toBe('microdata');
  });

  it('falls back to og:type=product as a weak signal when there is no structured data', () => {
    const html = '<meta property="og:type" content="product">';
    const evidence = extractProductEvidence(html, 'https://example.com/x');
    expect(evidence).toEqual({ kind: 'og-type-only' });
  });

  it('returns null when the page has no product signal at all', () => {
    const evidence = extractProductEvidence(
      '<html><body>bez dat</body></html>',
      'https://example.com/x',
    );
    expect(evidence).toBeNull();
  });
});
