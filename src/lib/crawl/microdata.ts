export type MicrodataProduct = {
  name?: string;
  priceVat?: number;
  priceCurrency?: string;
  inStock?: boolean;
};

/**
 * Vytáhne hodnotu prvního tagu s daným `itemprop` - z `content=`/`value=`
 * atributu (typicky <meta>/<input>), jinak z textového obsahu tagu. Hrubý
 * regex přístup bez DOM stromu - stačí na probe-shops.ts heuristiku, ne na
 * produkční extrakci.
 */
function extractItemprop(html: string, itemprop: string): string | undefined {
  const tagRe = new RegExp(`<[^>]+itemprop=["']${itemprop}["'][^>]*>`, 'i');
  const match = html.match(tagRe);
  if (!match) {
    return undefined;
  }

  const tag = match[0];
  const attrMatch = tag.match(/(?:content|value)=["']([^"']+)["']/i);
  if (attrMatch) {
    return attrMatch[1].trim();
  }

  const hrefMatch = tag.match(/href=["']([^"']+)["']/i);
  if (hrefMatch) {
    return hrefMatch[1].trim();
  }

  const afterTag = html.slice(match.index! + tag.length);
  const textMatch = afterTag.match(/^([^<]*)/);
  const text = textMatch?.[1]?.trim();
  return text || undefined;
}

function hasProductItemscope(html: string): boolean {
  return /itemtype=["'][^"']*schema\.org\/Product["']/i.test(html);
}

function parseAvailability(value: string | undefined): boolean | undefined {
  if (!value) {
    return undefined;
  }
  const normalized = value.split('/').pop()?.toLowerCase() ?? '';
  if (normalized.includes('instock') || normalized.includes('limitedavailability')) {
    return true;
  }
  if (normalized.includes('outofstock') || normalized.includes('soldout')) {
    return false;
  }
  return undefined;
}

function parsePrice(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }
  const numeric = Number.parseFloat(value.replace(/\s/g, '').replace(',', '.'));
  return Number.isNaN(numeric) ? undefined : numeric;
}

/**
 * Fallback k JSON-LD: schema.org Product přes microdata (itemscope/itemprop).
 * Vrací null, pokud stránka nemá alespoň itemtype Product s cenou.
 */
export function extractMicrodataProduct(html: string): MicrodataProduct | null {
  if (!hasProductItemscope(html)) {
    return null;
  }

  const priceVat = parsePrice(extractItemprop(html, 'price'));
  if (priceVat === undefined) {
    return null;
  }

  return {
    name: extractItemprop(html, 'name'),
    priceVat,
    priceCurrency: extractItemprop(html, 'priceCurrency'),
    inStock: parseAvailability(extractItemprop(html, 'availability')),
  };
}

/** Slabší signál než JSON-LD/microdata - stránka se hlásí jako produkt, ale bez strukturované ceny. */
export function hasProductTypeMeta(html: string): boolean {
  return (
    /<meta[^>]+(?:property|name)=["']og:type["'][^>]+content=["']product["']/i.test(html) ||
    /<meta[^>]+content=["']product["'][^>]+(?:property|name)=["']og:type["']/i.test(html)
  );
}
