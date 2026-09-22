import sax from 'sax';
import type {Readable} from 'node:stream';
import type {FeedItem} from './types';

const ELEMENT_MAP: Partial<Record<string, keyof FeedItem>> = {
  ITEM_ID: 'itemId',
  PRODUCTNAME: 'productName',
  PRICE_VAT: 'priceVat',
  URL: 'url',
  IMGURL: 'imgUrl',
  EAN: 'ean',
  DELIVERY_DATE: 'deliveryDays',
  CATEGORYTEXT: 'categoryText',
  DESCRIPTION: 'description',
};

const NUMERIC_FIELDS = new Set<keyof FeedItem>(['priceVat', 'deliveryDays']);

type PartialFeedItem = {[K in keyof FeedItem]?: FeedItem[K]};

function isCompleteItem(item: PartialFeedItem): item is FeedItem {
  return (
    typeof item.itemId === 'string' &&
    item.itemId.length > 0 &&
    typeof item.productName === 'string' &&
    item.productName.length > 0 &&
    typeof item.priceVat === 'number' &&
    typeof item.url === 'string' &&
    item.url.length > 0
  );
}

/**
 * Streamově parsuje Heureka XML feed (<SHOP><SHOPITEM>...</SHOPITEM></SHOP>) bez
 * naplnění celé paměti. Položky s chybějícím povinným polem (itemId/productName/
 * priceVat/url) se tiše přeskočí, neznámé elementy se ignorují.
 */
export async function* parseHeurekaFeed(stream: Readable): AsyncGenerator<FeedItem> {
  const parser = sax.parser(false, {trim: true, lowercase: false});

  let currentItem: PartialFeedItem | null = null;
  let currentTag: string | null = null;
  let textBuffer = '';
  const ready: FeedItem[] = [];
  let parseError: Error | null = null;

  parser.onopentag = (node) => {
    const name = node.name.toUpperCase();
    if (name === 'SHOPITEM') {
      currentItem = {};
    }
    currentTag = name;
    textBuffer = '';
  };

  parser.ontext = (text) => {
    textBuffer += text;
  };

  parser.oncdata = (text) => {
    textBuffer += text;
  };

  parser.onclosetag = (rawName) => {
    const name = rawName.toUpperCase();

    if (currentItem && currentTag && name !== 'SHOPITEM') {
      const field = ELEMENT_MAP[currentTag];
      const value = textBuffer.trim();
      if (field && value) {
        if (NUMERIC_FIELDS.has(field)) {
          const numeric = Number.parseFloat(value.replace(',', '.'));
          if (!Number.isNaN(numeric)) {
            (currentItem[field] as number) = field === 'deliveryDays' ? Math.round(numeric) : numeric;
          }
        } else {
          (currentItem[field] as string) = value;
        }
      }
    }

    if (name === 'SHOPITEM') {
      if (currentItem && isCompleteItem(currentItem)) {
        ready.push(currentItem);
      }
      currentItem = null;
    }

    textBuffer = '';
    currentTag = null;
  };

  parser.onerror = (err) => {
    parseError = err instanceof Error ? err : new Error(String(err));
    parser.resume();
  };

  for await (const chunk of stream) {
    const text = typeof chunk === 'string' ? chunk : chunk.toString('utf-8');
    parser.write(text);

    while (ready.length > 0) {
      yield ready.shift()!;
    }

    if (parseError) {
      throw parseError;
    }
  }

  parser.close();

  while (ready.length > 0) {
    yield ready.shift()!;
  }

  if (parseError) {
    throw parseError;
  }
}
