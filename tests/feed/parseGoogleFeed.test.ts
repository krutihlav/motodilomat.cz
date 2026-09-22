import { createReadStream } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseGoogleFeed } from '../../src/lib/feed/parseGoogleFeed';
import type { FeedItem } from '../../src/lib/feed/types';

const FIXTURE_PATH = path.join(__dirname, '..', 'fixtures', 'google-feed.xml');

async function readFixtureItems(): Promise<FeedItem[]> {
  const items: FeedItem[] = [];
  for await (const item of parseGoogleFeed(createReadStream(FIXTURE_PATH))) {
    items.push(item);
  }
  return items;
}

describe('parseGoogleFeed', () => {
  it('skips items missing a required field (g:price) and keeps the rest', async () => {
    const items = await readFixtureItems();
    expect(items.map((item) => item.itemId)).toEqual([
      'TEST-001',
      'TEST-002',
      'TEST-004',
      'TEST-005-CERNA',
      'TEST-005-HNEDA',
    ]);
  });

  it('maps Google Merchant fields onto FeedItem, splitting price and currency', async () => {
    const items = await readFixtureItems();
    const karburator = items.find((item) => item.itemId === 'TEST-001');

    expect(karburator).toEqual<FeedItem>({
      itemId: 'TEST-001',
      productName: 'Karburátor Jikov 2917 pro Jawa 350',
      priceVat: 1290,
      priceCurrency: 'CZK',
      url: 'https://www.motomax.cz/karburator-jikov-2917',
      imgUrl: 'https://www.motomax.cz/img/test-001.jpg',
      ean: '8590000000011',
      mpn: '05-11-010',
      categoryText: 'Motor > Karburátor',
      description: 'Originální karburátor Jikov 2917 pro motocykly Jawa 350.',
      inStock: true,
    });
  });

  it('parses a comma decimal price and marks an out-of-stock item', async () => {
    const items = await readFixtureItems();
    const civka = items.find((item) => item.itemId === 'TEST-002');

    expect(civka?.priceVat).toBe(590);
    expect(civka?.priceCurrency).toBe('CZK');
    expect(civka?.inStock).toBe(false);
    expect(civka?.mpn).toBe('353-12-001');
    expect(civka?.ean).toBeUndefined();
  });

  it('leaves availability undefined when the tag is missing', async () => {
    const items = await readFixtureItems();
    const retez = items.find((item) => item.itemId === 'TEST-004');

    expect(retez?.inStock).toBeUndefined();
    expect(retez?.priceVat).toBe(350);
  });

  it('extracts g:item_group_id so variants can be linked together', async () => {
    const items = await readFixtureItems();
    const cerna = items.find((item) => item.itemId === 'TEST-005-CERNA');
    const hneda = items.find((item) => item.itemId === 'TEST-005-HNEDA');

    expect(cerna?.itemGroupId).toBe('SEDLO-JAWA-350');
    expect(hneda?.itemGroupId).toBe('SEDLO-JAWA-350');
  });

  it('leaves itemGroupId undefined for items without g:item_group_id', async () => {
    const items = await readFixtureItems();
    const karburator = items.find((item) => item.itemId === 'TEST-001');
    expect(karburator?.itemGroupId).toBeUndefined();
  });
});
