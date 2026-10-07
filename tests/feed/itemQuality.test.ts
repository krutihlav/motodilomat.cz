import { describe, expect, it } from 'vitest';
import { assessItem, autoIgnoreReason } from '../../src/lib/feed/itemQuality';
import type { FeedItem } from '../../src/lib/feed/types';

const item = (overrides: Partial<FeedItem>): FeedItem => ({
  itemId: 'X',
  productName: 'Píst Jawa 350',
  priceVat: 500,
  url: 'https://example.test/x',
  ...overrides,
});

describe('assessItem - ceny', () => {
  it.each([0, -5, Number.NaN, Number.POSITIVE_INFINITY, 0.4])(
    'excludes invalid price %s',
    (priceVat) => {
      expect(assessItem(item({ priceVat })).exclusion).toBe('price_invalid');
    },
  );

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
    expect(assessItem(item({ priceVat: 30_000 }))).toEqual({
      exclusion: null,
      flags: ['price_review'],
    });
    expect(
      assessItem(item({ priceVat: 16_052, productName: 'Nádrž po renovaci Jawa-čz 353' })),
    ).toEqual({
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

describe('assessItem - název tvořený jen značkou', () => {
  it.each(['CZ', 'CZ / HUN', 'JAWA Moto spol s r. o.'])(
    'excludes brand-only name "%s"',
    (productName) => {
      expect(assessItem(item({ productName })).exclusion).toBe('brand_name');
    },
  );
});

describe('assessItem - moderní Jawa', () => {
  it.each([
    'Plexi sportovní - nízké RVM 500 by Jawa adventure',
    'Zrcátko Jawa CL 42',
    'Kryt Jawa 300 CL',
    'Jawa Forty Two blatník',
    'Sedlo Jawa forty two 42',
    'Lamela spojky, kovová (JAWA) - JAWA 350 OHC',
  ])('flags "%s" but keeps it', (productName) => {
    expect(assessItem(item({ productName }))).toEqual({ exclusion: null, flags: ['modern_jawa'] });
  });

  it('does not flag classic Jawa models', () => {
    expect(assessItem(item({ productName: 'Píst Jawa 350 typ 634' })).flags).toEqual([]);
    expect(assessItem(item({ productName: 'Ciferník Jawa 500 OHC šnek' })).flags).toEqual([]);
  });

  it('combines price_review and modern_jawa', () => {
    expect(
      assessItem(item({ priceVat: 20_000, productName: 'Kompletní výfuk Jawa 300 CL' })).flags,
    ).toEqual(['price_review', 'modern_jawa']);
  });
});

describe('assessItem - merch a Simson', () => {
  it.each([
    'Tričko s potiskem Born To Ride Pionýr Velikost: XL',
    'Mikina JAWA Fratišek Janeček Velikost: L',
    'JAWA 350 Pérák, mléčná čokoláda 100 g',
    'Plakát motoru BABETTA 210 (84 x 60cm)',
    'Hrnek s potiskem Born To Ride Pionýr',
    'Klíčenka JAWA bílo - červená',
    'Přívěsek na klíče Babetta',
  ])('excludes merch "%s"', (productName) => {
    expect(assessItem(item({ productName })).exclusion).toBe('merch');
  });

  it.each([
    'Katalog ND BABETTA 207  *M',
    'příručka JAWA 350 - 634/5, 6, 8',
    'Nálepka BABETTA 210/220',
    'Kniha Jawa 90',
    'Klíč brzdy JAWA 50 - 550',
  ])('keeps literature, stickers and parts "%s"', (productName) => {
    expect(assessItem(item({ productName })).exclusion).toBeNull();
  });

  it.each([
    'Víko schránky pravé SIMSON S51 Elektronik - zelené',
    'Řetězové kolečko 17z. SIMSON',
    'Zadní stupačka úpl. SIMSON',
  ])('excludes Simson without our brand "%s"', (productName) => {
    expect(assessItem(item({ productName })).exclusion).toBe('simson_only');
  });

  it.each([
    'Matice osy kola JAWA 50, BABETTA, SIMSON  (19klíč)',
    'Řetěz BABETTA 207, SIMSON',
    'Zrcátko M8 SIMSON, Stella',
    'Kolo Simson Pérák',
  ])('keeps Simson mentioned with our brand or nickname "%s"', (productName) => {
    expect(assessItem(item({ productName })).exclusion).toBeNull();
  });
});

describe('autoIgnoreReason - dárkové poukazy', () => {
  it.each([
    'Dárkový poukaz v hodnotě 1000 Kč',
    'Dárkový poukaz v hodnotě 500 Kč',
    'Dárková poukázka Motomax',
    'Gift card 2000',
  ])('ignores voucher "%s"', (productName) => {
    expect(autoIgnoreReason(productName)).toBe('voucher');
  });

  it.each(['Píst Jawa 350 typ 634', 'Katalog ND BABETTA 207  *M', 'Dárkové balení svíček Jawa'])(
    'does not ignore "%s"',
    (productName) => {
      expect(autoIgnoreReason(productName)).toBeNull();
    },
  );

  it('is not an exclusion: assessItem still lets the voucher through (it is stored, then ignored)', () => {
    expect(
      assessItem(item({ productName: 'Dárkový poukaz v hodnotě 1000 Kč', priceVat: 1000 }))
        .exclusion,
    ).toBeNull();
  });
});
