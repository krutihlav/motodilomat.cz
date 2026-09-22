import type { Platform } from './types';

type PlatformSignature = { platform: Platform; patterns: RegExp[] };

/**
 * Heuristická detekce platformy podle HTML a hlaviček. Není to exaktní věda -
 * cíl je odlišit pár nejčastějších platforem u českých e-shopů pro účely
 * probe-shops.ts přehledu, ne 100% spolehlivá fingerprint databáze.
 */
const SIGNATURES: PlatformSignature[] = [
  {
    platform: 'shoptet',
    patterns: [
      /cdn\.myshoptet\.com/i,
      /shoptet-scripts/i,
      /data-shoptet/i,
      /"generator"\s*content="Shoptet/i,
    ],
  },
  {
    platform: 'woocommerce',
    patterns: [
      /wp-content\/plugins\/woocommerce/i,
      /class="[^"]*\bwoocommerce\b/i,
      /content=["']WooCommerce/i,
      /wp-content\/themes\//i,
    ],
  },
  {
    platform: 'prestashop',
    patterns: [/content=["']PrestaShop/i, /\/modules\/prestashop/i, /var prestashop\s*=/i],
  },
  {
    platform: 'opencart',
    patterns: [/index\.php\?route=product/i, /catalog\/view\/theme/i, /Powered By OpenCart/i],
  },
];

export function detectPlatform(html: string, headers?: Headers | Record<string, string>): Platform {
  const headerText = headers
    ? Object.entries(headers instanceof Headers ? Object.fromEntries(headers.entries()) : headers)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n')
    : '';
  const haystack = `${html}\n${headerText}`;

  for (const signature of SIGNATURES) {
    if (signature.patterns.some((pattern) => pattern.test(haystack))) {
      return signature.platform;
    }
  }

  return 'unknown';
}
