import type {FeedItem} from './types';
import {normalize} from './relevanceFilter';
import {isBrandLikeName} from '../crawl/brandName';

/** Nad touto cenou (Kč) jde o celý motocykl/motor, ne o díl - vyřadit. */
export const PRICE_EXCLUDE_ABOVE = 30_000;
/** Od této ceny (Kč) výš, až po PRICE_EXCLUDE_ABOVE, jen flag k ruční kontrole. */
export const PRICE_REVIEW_FROM = 15_000;

export type ExclusionReason =
  | 'price_invalid'
  | 'price_over_limit'
  | 'excluded_category'
  | 'vehicle_name'
  | 'brand_name';

/** Hodnoty pro shop_products.review_flags. */
export type ReviewFlag = 'price_review' | 'modern_jawa';

export const EXCLUSION_REASONS: readonly ExclusionReason[] = [
  'price_invalid',
  'price_over_limit',
  'excluded_category',
  'vehicle_name',
  'brand_name',
];

export type ItemAssessment = {
  exclusion: ExclusionReason | null;
  flags: ReviewFlag[];
};

const EXCLUDED_TOP_CATEGORIES = ['modely motocyklu, automobilu'];

// "motocykl\b" (ne "motocyklový ...") a "motor bez/kompletní ..." - celé stroje a motory.
const VEHICLE_NAME_RE = /^(motocykl\b|motor (bez|kompletni)\b)/;

// Moderní Jawa (CL 42, 300 CL, RVM, Adventure, 350 OHC) - flagovat, nevyřazovat.
const MODERN_JAWA_RES = [
  /\bcl 42\b/,
  /\bforty ?two\b/,
  /\brvm\b/,
  /\badventure\b/,
  /\b300 cl\b/,
  /\b350 ?ohc\b/, // moderní Jawa 350 OHC (od 2017); historická je Jawa 500 OHC
];

function topCategory(categoryText: string | undefined): string | null {
  const first = categoryText?.split('>')[0]?.trim();
  return first ? normalize(first) : null;
}

/**
 * Pravidla kvality nad položkou feedu/crawlu: co se nemá ukládat (exclusion)
 * a co se uloží, ale označí k ruční kontrole (flags). Cena se posuzuje po
 * zaokrouhlení, tj. tak, jak se ukládá do shop_products.price.
 */
export function assessItem(item: FeedItem): ItemAssessment {
  const price = Math.round(item.priceVat);
  if (!Number.isFinite(item.priceVat) || !Number.isFinite(price) || price <= 0) {
    return {exclusion: 'price_invalid', flags: []};
  }
  if (price > PRICE_EXCLUDE_ABOVE) {
    return {exclusion: 'price_over_limit', flags: []};
  }

  // Název tvořený jen značkou (chybně vytažený brand) - nemá smysl ukládat ani párovat.
  if (isBrandLikeName(item.productName)) {
    return {exclusion: 'brand_name', flags: []};
  }

  const category = topCategory(item.categoryText);
  if (category && EXCLUDED_TOP_CATEGORIES.includes(category)) {
    return {exclusion: 'excluded_category', flags: []};
  }

  const name = normalize(item.productName).trim();
  if (VEHICLE_NAME_RE.test(name)) {
    return {exclusion: 'vehicle_name', flags: []};
  }

  const flags: ReviewFlag[] = [];
  if (price >= PRICE_REVIEW_FROM) {
    flags.push('price_review');
  }
  if (MODERN_JAWA_RES.some((re) => re.test(name))) {
    flags.push('modern_jawa');
  }
  return {exclusion: null, flags};
}
