import { describe, expect, it } from 'vitest';
import { assessItem } from '../../src/lib/feed/itemQuality';
import type { FeedItem } from '../../src/lib/feed/types';

const item = (overrides: Partial<FeedItem>): FeedItem => ({
  itemId: 'X',
  productName: 'Píst Jawa 350',
  priceVat: 500,
  url: 'https://example.test/x',
  ...overrides,
});

describe('assessItem - ceny', () => {
  it.each([0, -5, Number.NaN, Number.POSITIVE_INFINITY, 0.4])('excludes invalid price %s', (priceVat) => {
    expect(assessItem(item({ priceVat })).exclusion).toBe('price_invalid');
  });

  it('keeps cheap real parts (1-9 Kč šrouby, matice)', () => {
    expect(assessItem(item({ priceVat: 3, productName: 'Podložka M4 BABETTA 228' }))).toEqual({
      exclusion: null,
      flags: [],
    });
  });

  it('excludes prices above 30 000 Kč', () => {
    expect(assessItem(item({ priceVat: 30_001 })).exclusion).toBe('price_over_limit');
    expect(assessItem(item({ priceVat: 99_900 })).exclusion).toBe('price_over_limit');
  });

  it('keeps 30 000 Kč exactly and flags 15 000-30 000 Kč for review', () => {
    expect(assessItem(item({ priceVat: 30_000 }))).toEqual({ exclusion: null, flags: ['price_review'] });
    expect(assessItem(item({ priceVat: 16_052, productName: 'Nádrž po renovaci Jawa-čz 353' }))).toEqual({
      exclusion: null,
      flags: ['price_review'],
    });
    expect(assessItem(item({ priceVat: 14_999 })).flags).toEqual([]);
  });
});

describe('assessItem - kategorie a název', () => {
  it('excludes the motomax top category "Modely motocyklů, automobilů" (diacritics-insensitive)', () => {
    expect(
      assessItem(item({ categoryText: 'Modely motocyklů, automobilů > Jawa 350' })).exclusion,
    ).toBe('excluded_category');
  });

  it('does not exclude other categories that merely mention motocykly', () => {
    expect(
      assessItem(item({ categoryText: 'Díly Babetta, Simson, Jawa, ČZ > Motor' })).exclusion,
    ).toBeNull();
  });

  it.each([
    'Motocykl Jawa 350 typ 634',
    'motocykl ČZ 175',
    'Motor bez startéru kompletní JAWA 350',
    'Motor kompletní Jawa 350 typ 638',
  ])('excludes whole vehicle/engine name "%s"', (productName) => {
    expect(assessItem(item({ productName })).exclusion).toBe('vehicle_name');
  });

  it.each([
    'Motocyklový řetěz Jawa 350',
    'Kryt motoru Jawa 350',
    'Motorová skříň Babetta',
    'Píst do motoru Jawa 350',
  ])('does not exclude the part "%s"', (productName) => {
    expect(assessItem(item({ productName })).exclusion).toBeNull();
  });
});

describe('assessItem - moderní Jawa', () => {
  it.each([
    'Plexi sportovní - nízké RVM 500 by Jawa adventure',
    'Zrcátko Jawa CL 42',
    'Kryt Jawa 300 CL',
    'Jawa Forty Two blatník',
    'Sedlo Jawa forty two 42',
  ])('flags "%s" but keeps it', (productName) => {
    expect(assessItem(item({ productName }))).toEqual({ exclusion: null, flags: ['modern_jawa'] });
  });

  it('does not flag classic Jawa models', () => {
    expect(assessItem(item({ productName: 'Píst Jawa 350 typ 634' })).flags).toEqual([]);
  });

  it('combines price_review and modern_jawa', () => {
    expect(assessItem(item({ priceVat: 20_000, productName: 'Kompletní výfuk Jawa 300 CL' })).flags).toEqual([
      'price_review',
      'modern_jawa',
    ]);
  });
});
