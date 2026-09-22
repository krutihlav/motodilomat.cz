import type { CrawledProduct } from './types';

const SCRIPT_RE = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

type JsonLdNode = Record<string, unknown>;

function isProductType(node: JsonLdNode): boolean {
  const type = node['@type'];
  if (typeof type === 'string') {
    return type.toLowerCase() === 'product';
  }
  if (Array.isArray(type)) {
    return type.some((t) => typeof t === 'string' && t.toLowerCase() === 'product');
  }
  return false;
}

/** Rozbalí @graph i pole na plochý seznam JSON-LD uzlů. */
function flattenNodes(parsed: unknown): JsonLdNode[] {
  if (Array.isArray(parsed)) {
    return parsed.flatMap((entry) => flattenNodes(entry));
  }
  if (parsed && typeof parsed === 'object') {
    const node = parsed as JsonLdNode;
    const graph = node['@graph'];
    if (Array.isArray(graph)) {
      return graph.flatMap((entry) => flattenNodes(entry));
    }
    return [node];
  }
  return [];
}

/** Vytáhne obsah všech <script type="application/ld+json"> bloků ze stránky. */
export function extractJsonLdNodes(html: string): JsonLdNode[] {
  const nodes: JsonLdNode[] = [];
  let match: RegExpExecArray | null;

  SCRIPT_RE.lastIndex = 0;
  while ((match = SCRIPT_RE.exec(html)) !== null) {
    const raw = match[1].trim();
    if (!raw) {
      continue;
    }
    try {
      const parsed = JSON.parse(raw);
      nodes.push(...flattenNodes(parsed));
    } catch {
      // Neplatný/nekompletní JSON-LD blok - přeskočit, není to fatální.
    }
  }

  return nodes;
}

function firstString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  if (Array.isArray(value)) {
    const first = value.find((v) => typeof v === 'string' && v.trim());
    return typeof first === 'string' ? first.trim() : undefined;
  }
  if (value && typeof value === 'object' && 'url' in (value as JsonLdNode)) {
    return firstString((value as JsonLdNode).url);
  }
  return undefined;
}

function parsePrice(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const numeric = Number.parseFloat(value.replace(/\s/g, '').replace(',', '.'));
    return Number.isNaN(numeric) ? undefined : numeric;
  }
  return undefined;
}

function parseAvailability(value: unknown): boolean | undefined {
  const text = firstString(value);
  if (!text) {
    return undefined;
  }
  const normalized = text.split('/').pop()?.toLowerCase();
  if (!normalized) {
    return undefined;
  }
  if (
    normalized.includes('instock') ||
    normalized.includes('limitedavailability') ||
    normalized.includes('onlineonly') ||
    normalized.includes('presale')
  ) {
    return true;
  }
  if (
    normalized.includes('outofstock') ||
    normalized.includes('soldout') ||
    normalized.includes('discontinued')
  ) {
    return false;
  }
  return undefined;
}

/** Vezme první Offer objekt z offers (objekt nebo pole AggregateOffer/Offer). */
function firstOffer(offers: unknown): JsonLdNode | undefined {
  if (Array.isArray(offers)) {
    return offers.find((o) => o && typeof o === 'object') as JsonLdNode | undefined;
  }
  if (offers && typeof offers === 'object') {
    return offers as JsonLdNode;
  }
  return undefined;
}

/** Namapuje jeden JSON-LD Product uzel na CrawledProduct. Vrací null, pokud chybí povinná pole (name/price/url). */
export function mapProductNode(node: JsonLdNode, pageUrl: string): CrawledProduct | null {
  if (!isProductType(node)) {
    return null;
  }

  const name = firstString(node.name);
  const offer = firstOffer(node.offers);
  const priceVat = parsePrice(offer?.price ?? (node as JsonLdNode).price);
  const url = firstString(offer?.url) ?? firstString(node.url) ?? pageUrl;

  if (!name || priceVat === undefined || !url) {
    return null;
  }

  return {
    url,
    name,
    priceVat,
    priceCurrency: firstString(offer?.priceCurrency),
    inStock: parseAvailability(offer?.availability),
    imageUrl: firstString(node.image),
    sku: firstString(node.sku),
    mpn: firstString(node.mpn),
    ean: firstString(node.gtin13 ?? node.gtin ?? node.gtin8 ?? node.gtin12 ?? node.ean),
    description: firstString(node.description),
  };
}

/** Najde první platný Product v JSON-LD dané stránky, nebo null. */
export function extractProduct(html: string, pageUrl: string): CrawledProduct | null {
  for (const node of extractJsonLdNodes(html)) {
    const product = mapProductNode(node, pageUrl);
    if (product) {
      return product;
    }
  }
  return null;
}
