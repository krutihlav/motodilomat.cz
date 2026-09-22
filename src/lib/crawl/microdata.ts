export type MicrodataProduct = {
  name?: string;
  priceVat?: number;
  priceCurrency?: string;
  inStock?: boolean;
};

/**
 * Vytáhne hodnotu prvního tagu s daným `itemprop` uvnitř `scopeHtml` - z
 * `content=`/`value=` atributu (typicky <meta>/<input>), z `href=`, jinak
 * z textového obsahu tagu. Hrubý regex přístup bez DOM stromu - stačí na
 * probe-shops.ts heuristiku, ne na produkční extrakci. Volající musí předat
 * už vyříznutý rozsah patřící jednomu itemscope (viz `extractProductScope`),
 * jinak by chytil první shodu kdekoliv na stránce (např. jméno autora článku).
 */
function extractItemprop(scopeHtml: string, itemprop: string): string | undefined {
  const tagRe = new RegExp(`<[^>]+itemprop=["']${itemprop}["'][^>]*>`, 'i');
  const match = scopeHtml.match(tagRe);
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

  const afterTag = scopeHtml.slice(match.index! + tag.length);
  const textMatch = afterTag.match(/^([^<]*)/);
  const text = textMatch?.[1]?.trim();
  return text || undefined;
}

/** Najde první tag s itemtype ".../Product" (jméno tagu + kde končí jeho otevírací tag). */
function findProductScopeStart(
  html: string,
): { tagName: string; startIndex: number; openTagEnd: number } | null {
  const re = /<([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*\bitemtype=["'][^"']*schema\.org\/Product["'][^>]*>/i;
  const match = re.exec(html);
  if (!match) {
    return null;
  }

  return {
    tagName: match[1].toLowerCase(),
    startIndex: match.index,
    openTagEnd: match.index + match[0].length,
  };
}

/**
 * Najde konec elementu (index odpovídajícího uzavíracího tagu) pro `tagName`
 * od `fromIndex` - naivní počítání hloubky přes stejnojmenné tagy, bez
 * řešení HTML zanoření obecně. Nenajde-li se uzavírací tag, spadne na konec
 * dokumentu (širší, ale bezpečný fallback - nikdy nevrátí rozsah kratší,
 * než ve skutečnosti je).
 */
function findElementEnd(html: string, tagName: string, fromIndex: number): number {
  const tagRe = new RegExp(`<(/?)${tagName}\\b[^>]*?(/?)>`, 'gi');
  tagRe.lastIndex = fromIndex;
  let depth = 1;
  let match: RegExpExecArray | null;

  while ((match = tagRe.exec(html)) !== null) {
    const isClosing = match[1] === '/';
    const isSelfClosing = match[2] === '/';
    if (isSelfClosing) {
      continue;
    }
    if (isClosing) {
      depth -= 1;
      if (depth === 0) {
        return match.index;
      }
    } else {
      depth += 1;
    }
  }

  return html.length;
}

/** Vyřízne HTML patřící prvnímu Product itemscope - jen do něj se pak hledají itemprop hodnoty. */
function extractProductScope(html: string): string | null {
  const start = findProductScopeStart(html);
  if (!start) {
    return null;
  }

  const end = findElementEnd(html, start.tagName, start.openTagEnd);
  return html.slice(start.startIndex, end);
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
 * Vrací null, pokud stránka nemá alespoň itemtype Product s cenou. Všechny
 * itemprop hodnoty (name/price/priceCurrency/availability) se hledají jen
 * uvnitř nalezeného Product bloku, ne kdekoliv na stránce - jinak by třeba
 * jméno autora/majitele e-shopu (vlastní itemprop="name" v Person schématu)
 * přebilo skutečný název produktu.
 */
export function extractMicrodataProduct(html: string): MicrodataProduct | null {
  const scope = extractProductScope(html);
  if (!scope) {
    return null;
  }

  const priceVat = parsePrice(extractItemprop(scope, 'price'));
  if (priceVat === undefined) {
    return null;
  }

  return {
    name: extractItemprop(scope, 'name'),
    priceVat,
    priceCurrency: extractItemprop(scope, 'priceCurrency'),
    inStock: parseAvailability(extractItemprop(scope, 'availability')),
  };
}

/** Slabší signál než JSON-LD/microdata - stránka se hlásí jako produkt, ale bez strukturovaných dat. */
export function hasProductTypeMeta(html: string): boolean {
  return (
    /<meta[^>]+(?:property|name)=["']og:type["'][^>]+content=["']product["']/i.test(html) ||
    /<meta[^>]+content=["']product["'][^>]+(?:property|name)=["']og:type["']/i.test(html)
  );
}
