import type {FeedItem} from './types';

/**
 * Klíčová slova (bez diakritiky, malými písmeny) pro filtr relevantních
 * produktů z feedu. Rozšiřuj podle potřeby - odpovídají značkám/modelům
 * dvoutaktů z ČSSR, kterým se web věnuje (viz docs/ROADMAP.md).
 */
export const RELEVANT_KEYWORDS = [
  'jawa',
  'cz', // pokrývá i "čz" po odstranění diakritiky
  'babetta',
  'pionyr', // pokrývá i "pionýr"
  'perak', // pokrývá i "pérák"
  'kyvacka', // pokrývá i "kývačka"
  'panelka',
  'stadion',
  'mustang',
  'jawetta',
  'cezeta', // pokrývá i "čezeta" po odstranění diakritiky
  'velorex',
  'babeta', // častý překlep Babetty
  // Modely Stadion - jen jako celé slovo (\b), "S110" ani "S11W" nesmí projít.
  's11',
  's22',
  's23',
] as const;

function stripDiacritics(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function normalize(text: string): string {
  return stripDiacritics(text).toLowerCase();
}

const KEYWORD_PATTERNS = RELEVANT_KEYWORDS.map(
  (keyword) => new RegExp(`\\b${keyword}\\b`, 'i'),
);

/**
 * Vrací true, pokud název nebo kategorie položky obsahuje některé z
 * RELEVANT_KEYWORDS (case-insensitive, bez ohledu na diakritiku).
 */
export function isRelevantItem(item: FeedItem): boolean {
  const haystack = normalize(`${item.productName} ${item.categoryText ?? ''}`);
  return KEYWORD_PATTERNS.some((pattern) => pattern.test(haystack));
}
