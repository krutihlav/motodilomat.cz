const nf = new Intl.NumberFormat('cs-CZ', {maximumFractionDigits: 0});

/** „1 190 Kč“ s nezlomitelnými mezerami. */
export function formatPrice(price: number | null | undefined): string {
  if (price === null || price === undefined) return '–';
  return `${nf.format(price).replace(/\s/g, ' ')} Kč`;
}

export function formatCount(n: number): string {
  return nf.format(n).replace(/\s/g, ' ');
}

/** Česká plurálová forma: plural(3, ['nabídka', 'nabídky', 'nabídek']). */
export function plural(n: number, forms: [string, string, string]): string {
  if (n === 1) return forms[0];
  if (n >= 2 && n <= 4) return forms[1];
  return forms[2];
}

export function countLabel(n: number, forms: [string, string, string]): string {
  return `${formatCount(n)} ${plural(n, forms)}`;
}

export const OFFERS: [string, string, string] = ['nabídka', 'nabídky', 'nabídek'];
export const SHOPS: [string, string, string] = ['e-shop', 'e-shopy', 'e-shopů'];
export const MODELS: [string, string, string] = ['model', 'modely', 'modelů'];

/** Zobrazovaný název shopu (bez technických přívěsků v DB, např. „MVDILY (motoveterandily.cz)“). */
export function shopLabel(name: string): string {
  return name.replace(/\s*\(.*\)\s*$/, '').replace(/\.cz$/i, '');
}

export function lastUpdateLabel(iso: string | null | undefined): string {
  if (!iso) return '–';
  const d = new Date(iso);
  return new Intl.DateTimeFormat('cs-CZ', {day: 'numeric', month: 'numeric', year: 'numeric', timeZone: 'Europe/Prague'}).format(d);
}
