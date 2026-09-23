/**
 * Normalizuje název produktu pro porovnávání napříč shopy (Tier C matching).
 * Značkové/modelové tokeny (babetta, jawa, čz, 350, 634...) záměrně
 * zůstávají - jsou rozlišující, ne šum. Odstraňují se jen interpunkce a
 * osamocené "hvězdičkové" markery typu "*m", "*", které se v katalozích
 * různých shopů liší nebo nejsou vždy přítomné.
 */
export function normalizeProductName(name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    // Interpunkce -> mezera, ale zachová písmena/čísla/mezery a "*" pro krok níže.
    .replace(/[^\p{L}\p{N}\s*]+/gu, ' ');

  const tokens = base
    .split(/\s+/)
    .filter((token) => token.length > 0)
    // Osamocené markery typu "*", "*m", "**" - ne skutečná slova.
    .filter((token) => !/^\*+[a-z0-9]?$/.test(token))
    .map((token) => token.replace(/\*/g, ''))
    .filter((token) => token.length > 0);

  return tokens.join(' ');
}
