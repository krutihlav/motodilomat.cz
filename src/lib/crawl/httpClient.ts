export const CRAWL_USER_AGENT = 'MotodilomatBot/0.1 (+mailto:adas.kment@gmail.com)';

const MIN_INTERVAL_MS = 3_000;
const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 2;

/** Poslední čas requestu na danou doménu, pro dodržení 1 request / 3 s / doména. */
const lastRequestAt = new Map<string, number>();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Počká, dokud neuplyne MIN_INTERVAL_MS od posledního requestu na tuto doménu. */
export async function waitForRateLimit(hostname: string): Promise<void> {
  const last = lastRequestAt.get(hostname);
  const now = Date.now();

  if (last !== undefined) {
    const elapsed = now - last;
    if (elapsed < MIN_INTERVAL_MS) {
      await sleep(MIN_INTERVAL_MS - elapsed);
    }
  }

  lastRequestAt.set(hostname, Date.now());
}

/** Vymaže interní stav rate limiteru - jen pro testy. */
export function resetRateLimiter(): void {
  lastRequestAt.clear();
}

export type FetchTextOptions = {
  timeoutMs?: number;
  maxRetries?: number;
  headers?: Record<string, string>;
};

/**
 * GET requestu s User-Agentem, timeoutem a max. `maxRetries` opakováními
 * (bez čekání na rate-limit - to řeší volající přes waitForRateLimit, protože
 * ví, kdy je vhodné dělat requesty souběžně na jiné domény).
 */
export async function fetchText(
  url: string,
  options: FetchTextOptions = {},
): Promise<{ status: number; text: string; headers: Headers } | null> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = options.maxRetries ?? MAX_RETRIES;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': CRAWL_USER_AGENT,
          ...options.headers,
        },
      });
      clearTimeout(timeout);

      if (response.status >= 500 && attempt < maxRetries) {
        continue;
      }

      const text = await response.text();
      return { status: response.status, text, headers: response.headers };
    } catch (err) {
      lastError = err;
      if (attempt >= maxRetries) {
        break;
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  console.error(`Crawl fetch selhal pro "${url}":`, lastError);
  return null;
}
