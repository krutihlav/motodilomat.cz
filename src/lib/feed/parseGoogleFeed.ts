import sax from 'sax';
import type { Readable } from 'node:stream';
import type { FeedItem } from './types';

/** Vezme lokální jméno tagu bez namespace prefixu (např. "g:price" -> "PRICE"). */
function localName(tagName: string): string {
  const index = tagName.lastIndexOf(':');
  return (index === -1 ? tagName : tagName.slice(index + 1)).toUpperCase();
}

const ITEM_TAGS = new Set(['ITEM', 'ENTRY']);

const ELEMENT_MAP: Partial<Record<string, keyof FeedItem>> = {
  ID: 'itemId',
  TITLE: 'productName',
  LINK: 'url',
  IMAGE_LINK: 'imgUrl',
  GTIN: 'ean',
  MPN: 'mpn',
  PRODUCT_TYPE: 'categoryText',
  DESCRIPTION: 'description',
  ITEM_GROUP_ID: 'itemGroupId',
};

type PartialFeedItem = { [K in keyof FeedItem]?: FeedItem[K] };

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

/** "1 290,00 CZK" / "1290.00 CZK" -> {amount: 1290, currency: "CZK"}. */
function parsePrice(value: string): { amount?: number; currency?: string } {
  const trimmed = value.trim();
  const currencyMatch = trimmed.match(/([A-Z]{3})\s*$/);
  const numericPart = currencyMatch ? trimmed.slice(0, currencyMatch.index).trim() : trimmed;
  const amount = Number.parseFloat(numericPart.replace(/\s/g, '').replace(',', '.'));

  return {
    amount: Number.isNaN(amount) ? undefined : amount,
    currency: currencyMatch?.[1],
  };
}

/** "in stock" / "in_stock" / "preorder" -> true, "out of stock" / "out_of_stock" -> false. */
function parseAvailability(value: string): boolean | undefined {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '_');
  if (normalized.includes('out_of_stock') || normalized.includes('discontinued')) {
    return false;
  }
  if (
    normalized.includes('in_stock') ||
    normalized.includes('preorder') ||
    normalized.includes('backorder')
  ) {
    return true;
  }
  return undefined;
}

/**
 * Streamově parsuje Google Merchant RSS/Atom feed (g: namespace) na FeedItem.
 * Podporuje <item> (RSS) i <entry> (Atom), <link href="…"/> (Atom) i <link>text</link>
 * (RSS). Položky s chybějícím povinným polem (id/title/g:price/link) se tiše přeskočí.
 */
export async function* parseGoogleFeed(stream: Readable): AsyncGenerator<FeedItem> {
  const parser = sax.parser(false, { trim: true, lowercase: false });

  let currentItem: PartialFeedItem | null = null;
  let currentTag: string | null = null;
  let textBuffer = '';
  const ready: FeedItem[] = [];
  let parseError: Error | null = null;

  parser.onopentag = (node) => {
    const name = localName(node.name);

    if (ITEM_TAGS.has(name)) {
      currentItem = {};
    }

    if (currentItem && name === 'LINK') {
      const hrefKey = Object.keys(node.attributes).find((key) => key.toLowerCase() === 'href');
      if (hrefKey) {
        currentItem.url = String(node.attributes[hrefKey]);
      }
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
    const name = localName(rawName);

    if (currentItem && currentTag && !ITEM_TAGS.has(name)) {
      const value = textBuffer.trim();

      if (currentTag === 'PRICE') {
        if (value) {
          const { amount, currency } = parsePrice(value);
          if (amount !== undefined) {
            currentItem.priceVat = amount;
          }
          if (currency) {
            currentItem.priceCurrency = currency;
          }
        }
      } else if (currentTag === 'AVAILABILITY') {
        if (value) {
          const inStock = parseAvailability(value);
          if (inStock !== undefined) {
            currentItem.inStock = inStock;
          }
        }
      } else {
        const field = ELEMENT_MAP[currentTag];
        if (field && value) {
          (currentItem[field] as string) = value;
        }
      }
    }

    if (ITEM_TAGS.has(name)) {
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
