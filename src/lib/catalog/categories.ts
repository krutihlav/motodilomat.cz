/**
 * Dočasné kategorie podle klíčových slov v názvu nabídky – počítá je SQL funkce
 * catalog_category (migrace 025/025b). Viz docs/decisions.md 2026-10-25.
 */
export type CategoryKey =
  | 'valec-pist'
  | 'karburator'
  | 'prevody'
  | 'spojka'
  | 'klikovka'
  | 'vyfuk'
  | 'ram-kryty'
  | 'vidlice'
  | 'brzdy'
  | 'kola'
  | 'elektro'
  | 'nezarazene';

export const CATEGORY_GROUPS: {label: string; keys: CategoryKey[]}[] = [
  {label: 'Motor', keys: ['valec-pist', 'karburator', 'prevody', 'spojka', 'klikovka', 'vyfuk']},
  {label: 'Podvozek', keys: ['ram-kryty', 'vidlice', 'brzdy', 'kola']},
  {label: 'Elektro', keys: ['elektro']},
  {label: 'Nezařazené', keys: ['nezarazene']},
];

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  'valec-pist': 'Válec a píst',
  karburator: 'Karburátor',
  prevody: 'Převody a řetěz',
  spojka: 'Spojka',
  klikovka: 'Klikovka, ložiska, těsnění',
  vyfuk: 'Výfuk',
  'ram-kryty': 'Rám, kryty, nádrž',
  vidlice: 'Vidlice a pérování',
  brzdy: 'Brzdy a bowdeny',
  kola: 'Kola',
  elektro: 'Elektro',
  nezarazene: 'Nezařazené',
};

export function isCategoryKey(v: unknown): v is CategoryKey {
  return typeof v === 'string' && v in CATEGORY_LABELS;
}

export function groupOf(key: CategoryKey): string {
  return CATEGORY_GROUPS.find((g) => g.keys.includes(key))?.label ?? '';
}
