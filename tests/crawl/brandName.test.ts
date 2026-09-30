import { describe, expect, it } from 'vitest';
import { isBrandLikeName } from '../../src/lib/crawl/brandName';

describe('isBrandLikeName', () => {
  it.each([
    'CZ',
    'JAWA',
    'CZ / HUN',
    'CZ (Originál)',
    'CZ / TWN (CKR)',
    'JAWA Moto spol s r. o.',
    'TWN (JAWA Moto spol s r. o.)',
    'THA / CZ (JAWA Moto spol s r. o.)',
  ])('recognizes the brand-only name "%s"', (name) => {
    expect(isBrandLikeName(name)).toBe(true);
  });

  it.each([
    'Ampérmetr 10A (ukostření na mínus) - JAWA Pérák, 500 OHC',
    'Píst 41,25 (čep 12) - Simson S60',
    'Jawa 350',
    'Kryt CZ 175',
    '',
  ])('does not treat the product name "%s" as a brand', (name) => {
    expect(isBrandLikeName(name)).toBe(false);
  });
});
