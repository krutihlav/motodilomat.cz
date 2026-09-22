import type { Platform } from './types';

type PlatformSignature = { platform: Platform; patterns: RegExp[] };

/**
 * Heuristická detekce platformy podle HTML a hlaviček. Není to exaktní věda -
 * cíl je odlišit pár nejčastějších platforem u českých e-shopů pro účely
 * probe-shops.ts přehledu, ne 100% spolehlivá fingerprint databáze. Pořadí
 * signatur je záměrné - konkrétnější/méně obvyklé platformy jdou první, ať
 * je nepřebije obecnější shoda (např. WooCommerce běží na wp-content/themes,
 * což by jinak mohlo chytit i cizí motivy).
 */
const SIGNATURES: PlatformSignature[] = [
  {
    platform: 'shoptet',
    patterns: [
      /cdn\.myshoptet\.com/i,
      /shoptet-scripts/i,
      /data-shoptet/i,
      /"generator"\s*content="Shoptet/i,
      /shoptet-livechat/i,
      /window\.shoptet/i,
    ],
  },
  {
    platform: 'upgates',
    patterns: [
      /cdn\.upgates\.com/i,
      /data-upgates/i,
      /"generator"\s*content="Upgates/i,
      /window\.UPGATES/i,
    ],
  },
  {
    platform: 'eshop-rychle',
    patterns: [/eshop-rychle\.cz/i, /"generator"\s*content="Eshop.?Rychle/i],
  },
  {
    platform: 'prestashop',
    patterns: [
      /content=["']PrestaShop/i,
      /\/modules\/prestashop/i,
      /var\s+prestashop\s*=/i,
      /id=["']prestashop["']/i,
      /\/themes\/[^"']+\/assets\/cache/i,
    ],
  },
  {
    platform: 'opencart',
    patterns: [
      /index\.php\?route=product/i,
      /catalog\/view\/theme/i,
      /Powered By OpenCart/i,
      /catalog\/view\/javascript\/common/i,
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
