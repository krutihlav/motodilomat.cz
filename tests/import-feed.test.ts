import {createReadStream} from 'node:fs';
import path from 'node:path';
import {describe, expect, it} from 'vitest';
import {parseHeurekaFeed} from '../src/lib/feed/parseHeurekaFeed';
import {isRelevantItem} from '../src/lib/feed/relevanceFilter';
import type {FeedItem} from '../src/lib/feed/types';

const FIXTURE_PATH = path.join(__dirname, 'fixtures', 'sample-feed.xml');

async function readFixtureItems(): Promise<FeedItem[]> {
  const items: FeedItem[] = [];
  for await (const item of parseHeurekaFeed(createReadStream(FIXTURE_PATH))) {
    items.push(item);
  }
  return items;
}

describe('parseHeurekaFeed', () => {
  it('parses all items from the fixture feed', async () => {
    const items = await readFixtureItems();
    expect(items).toHaveLength(10);
  });

  it('maps Heureka fields onto FeedItem correctly', async () => {
    const items = await readFixtureItems();
    const karburator = items.find((item) => item.itemId === 'TEST-001');

    expect(karburator).toEqual<FeedItem>({
      itemId: 'TEST-001',
      productName: 'Karburátor Jikov 2917 pro Jawa 350',
      priceVat: 1290,
      url: 'https://testovaci-eshop.example/karburator-jikov-2917',
      imgUrl: 'https://testovaci-eshop.example/img/test-001.jpg',
      ean: '8590000000011',
      deliveryDays: 2,
      categoryText: 'Motor | Karburátor',
      description: 'Testovací položka - karburátor pro Jawu 350.',
    });
  });

  it('leaves optional fields undefined when missing from the feed', async () => {
    const items = await readFixtureItems();
    const retez = items.find((item) => item.itemId === 'TEST-003');

    expect(retez?.imgUrl).toBeUndefined();
    expect(retez?.description).toBeUndefined();
    expect(retez?.ean).toBe('8590000000035');
  });
});

describe('isRelevantItem', () => {
  const item = (overrides: Partial<FeedItem>): FeedItem => ({
    itemId: 'TEST-000',
    productName: '',
    priceVat: 100,
    url: 'https://testovaci-eshop.example/x',
    ...overrides,
  });

  it.each([
    ['Karburátor Jikov 2917 pro Jawa 350', undefined],
    ['Zapalovací cívka ČZ 175', undefined],
    ['Náhradní díl Babetta 207', undefined],
    ['Zadní blatník Pionýr Stadion S11', undefined],
    ['Sedlo pro Pérák rám', undefined],
    ['Výfuk pro Kývačka', undefined],
    ['Kožené sedlo Panelka', undefined],
    ['Karburátor pro Mustang M175', undefined],
  ])('marks "%s" as relevant', (productName) => {
    expect(isRelevantItem(item({productName}))).toBe(true);
  });

  it('marks item relevant based on categoryText even if name is generic', () => {
    expect(
      isRelevantItem(item({productName: 'Karburátor univerzální', categoryText: 'Jawa | Motor'})),
    ).toBe(true);
  });

  it.each([
    ['Helma pro motorku KTM'],
    ['Brzdové destičky Honda CBR 600'],
    ['Motorový olej Motul 10W-40'],
    ['Řetěz Yamaha YZF-R1'],
  ])('marks "%s" as NOT relevant', (productName) => {
    expect(isRelevantItem(item({productName}))).toBe(false);
  });
});
