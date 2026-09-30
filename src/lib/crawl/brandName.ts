function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/** Tokeny, ze kterých se skládají názvy výrobců/zemí původu ("CZ / HUN", "JAWA Moto spol s r. o."). */
const BRAND_TOKENS = new Set([
  'cz', 'jawa', 'twn', 'hun', 'tha', 'ckr', 'original', 'moto', 'spol', 's', 'r', 'o',
]);

/**
 * True, pokud se "název" skládá jen ze značek/zemí původu - typicky chybně
 * vytažený brand místo názvu produktu (motojelinek.cz před opravou:
 * "CZ", "CZ / HUN", "CZ (Originál)", "JAWA Moto spol s r. o.").
 */
export function isBrandLikeName(name: string): boolean {
  const tokens = normalize(name)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 0);
  return tokens.length > 0 && tokens.every((token) => BRAND_TOKENS.has(token));
}
