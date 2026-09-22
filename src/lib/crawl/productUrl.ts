import type { Platform } from './types';

const NON_PRODUCT_SEGMENTS =
  /\/(blog|clanek|clanky|novinky|news|kategorie|category|kontakt|o-nas|doprava(-a-)?platba|obchodni-podminky|reklamace|gdpr|cookies|sitemap|strana|page|kosik|cart|prihlaseni|login|registrace)(\/|$|\?|-)/i;

const PLATFORM_PRODUCT_PATTERNS: Partial<Record<Platform, RegExp>> = {
  opencart: /route=product\/product/i,
  prestashop: /-p-?\d+\.html|\/\d+-[a-z0-9-]+\.html/i,
  woocommerce: /\/(produkt|product)\//i,
  upgates: /\/[a-z0-9-]+\/?$/i,
  'eshop-rychle': /\/[a-z0-9-]+\/?$/i,
};

/**
 * Heuristika "vypadá to jako URL produktu?" - kombinuje obecný seznam
 * ne-produktových cest (blog, kontakt, GDPR, ...) s volitelným vzorem pro
 * konkrétní platformu. Nejde o přesnou detekci (u Shoptet/neznámé platformy
 * nemáme spolehlivý vzor), jen o filtr, který ze sitemapy vyřadí zjevně
 * neproduktové URL dřív, než se na ně plýtvá rozpočet requestů.
 */
export function isLikelyProductUrl(url: string, platform: Platform): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  const pathname = parsed.pathname;
  if (pathname === '/' || pathname === '') {
    return false;
  }

  if (NON_PRODUCT_SEGMENTS.test(pathname)) {
    return false;
  }

  const platformPattern = PLATFORM_PRODUCT_PATTERNS[platform];
  if (platformPattern) {
    // Platformy jako OpenCart nesou rozlišující info v query stringu
    // (?route=product/product), ne v cestě - testuje se proto pathname+search.
    return platformPattern.test(pathname + parsed.search);
  }

  // Bez známého vzoru: aspoň vyřaď kořenové/velmi krátké cesty (často kategorie).
  return pathname.split('/').filter(Boolean).length >= 1;
}

/**
 * Typické cesty k feedům podle platformy, navíc k obecnému seznamu
 * (src/lib/crawl/feedPaths.ts). Jde o kvalifikovaný odhad z veřejné
 * dokumentace platforem, ne zaručenou konvenci - Shoptet feed cesty typicky
 * obsahují náhodný hash z administrace, proto pro ni nic nepřidáváme.
 */
export const PLATFORM_FEED_PATHS: Partial<Record<Platform, string[]>> = {
  upgates: ['/feed/heureka/', '/feed/google/', '/export/heureka.xml', '/export/google.xml'],
  'eshop-rychle': ['/heureka-feed.xml', '/feeds/heureka.txt', '/feeds/google.xml'],
  prestashop: [
    '/modules/heurekacz/heureka.xml',
    '/modules/googleshopping/google.xml',
    '/module/heurekafeed/export',
  ],
  opencart: [
    '/index.php?route=extension/feed/google_sitemap',
    '/index.php?route=feed/heureka',
    '/index.php?route=feed/google_base/sitemap',
  ],
  woocommerce: ['/?feed=heureka', '/?feed=google_product_feed', '/wp-content/uploads/heureka.xml'],
};

export function platformFeedPaths(platform: Platform): string[] {
  return PLATFORM_FEED_PATHS[platform] ?? [];
}
