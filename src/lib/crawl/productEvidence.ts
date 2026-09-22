import { extractProduct } from './jsonld';
import { extractMicrodataProduct, hasProductTypeMeta } from './microdata';
import type { CrawledProduct } from './types';
import type { MicrodataProduct } from './microdata';

export type ProductEvidence =
  | { kind: 'jsonld'; product: CrawledProduct }
  | { kind: 'microdata'; product: MicrodataProduct }
  /** Stránka se hlásí jako produkt (og:type=product), ale bez strukturované ceny. */
  | { kind: 'og-type-only' }
  | null;

/**
 * Zjistí, jestli stránka vypadá jako produktová: nejdřív JSON-LD Product
 * (nejsilnější signál, s cenou/dostupností/sku), pak schema.org microdata,
 * a jako nejslabší signál og:type=product bez strukturovaných dat.
 */
export function extractProductEvidence(html: string, pageUrl: string): ProductEvidence {
  const jsonld = extractProduct(html, pageUrl);
  if (jsonld) {
    return { kind: 'jsonld', product: jsonld };
  }

  const microdata = extractMicrodataProduct(html);
  if (microdata) {
    return { kind: 'microdata', product: microdata };
  }

  if (hasProductTypeMeta(html)) {
    return { kind: 'og-type-only' };
  }

  return null;
}
