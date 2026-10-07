import { matchesRelevantKeywords } from '../feed/relevanceFilter';

/**
 * Text z cesty URL pro předfiltr relevance: dekódovaná cesta bez koncovky
 * (.html), kde pomlčky, podtržítka, lomítka a tečky nahradí mezery - stejná
 * "celá slova" jako u názvu produktu v isRelevantItem.
 */
export function slugText(url: string): string {
  let pathname: string;
  try {
    pathname = new URL(url).pathname;
  } catch {
    return '';
  }
  try {
    pathname = decodeURIComponent(pathname);
  } catch {
    // neplatné %-kódování: použij cestu tak, jak je
  }
  return pathname.replace(/\.(html?|php)$/i, '').replace(/[-_/.+]+/g, ' ');
}

/**
 * Předfiltr před stažením stránky: projde URL, jejíž slug obsahuje některé
 * z RELEVANT_KEYWORDS. Jen heuristika - název produktu může klíčové slovo
 * obsahovat, i když slug ne (a naopak).
 */
export function isRelevantSlug(url: string): boolean {
  return matchesRelevantKeywords(slugText(url));
}
