/**
 * Běžné cesty, kde e-shopy na českých platformách zveřejňují Heureka/Google
 * XML feedy bez nutnosti znát tajný hash z administrace. Nejde o vyčerpávající
 * seznam - probe-shops.ts je jen zkouší jako první rychlý odhad.
 */
export const COMMON_HEUREKA_FEED_PATHS = [
  '/heureka.xml',
  '/heureka-feed.xml',
  '/feed/heureka.xml',
  '/feeds/heureka.xml',
  '/export/heureka.xml',
  '/xml/heureka.xml',
  '/export/heureka-full.xml',
];

export const COMMON_GOOGLE_FEED_PATHS = [
  '/google.xml',
  '/google-feed.xml',
  '/feed/google.xml',
  '/feeds/google.xml',
  '/export/google.xml',
  '/xml/google.xml',
  '/export/google-merchant.xml',
];

export const COMMON_FEED_PATHS = [...COMMON_HEUREKA_FEED_PATHS, ...COMMON_GOOGLE_FEED_PATHS];
