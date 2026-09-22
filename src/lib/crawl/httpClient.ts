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

export type NetworkErrorKind = 'timeout' | 'dns' | 'other';

/** DNS chyba (ENOTFOUND/EAI_AGAIN) vs. timeout/spojení odmítnuto vs. cokoliv jiného. */
export function classifyNetworkError(err: unknown): NetworkErrorKind {
  if (err instanceof Error && err.name === 'AbortError') {
    return 'timeout';
  }

  const code =
    (err as { code?: string } | undefined)?.code ??
    (err as { cause?: { code?: string } } | undefined)?.cause?.code;

  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
    return 'dns';
  }
  if (code === 'ETIMEDOUT' || code === 'ECONNRESET' || code === 'ECONNREFUSED') {
    return 'timeout';
  }

  return 'other';
}

export type FetchOutcome =
  | { ok: true; status: number; text: string; headers: Headers }
  | { ok: false; kind: NetworkErrorKind; message: string };

/**
 * GET requestu s User-Agentem, timeoutem a max. `maxRetries` opakováními
 * (bez čekání na rate-limit - to řeší volající přes waitForRateLimit, protože
 * ví, kdy je vhodné dělat requesty souběžně na jiné domény). Na rozdíl od
 * fetchText nezahazuje důvod selhání - vrátí ho klasifikovaný
 * (timeout/dns/other), což probe-shops.ts potřebuje pro sloupec "dosažitelnost".
 */
export async function fetchWithDiagnostics(
  url: string,
  options: FetchTextOptions = {},
): Promise<FetchOutcome> {
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
      return { ok: true, status: response.status, text, headers: response.headers };
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
  return {
    ok: false,
    kind: classifyNetworkError(lastError),
    message: lastError instanceof Error ? lastError.message : String(lastError),
  };
}

/** Zpětně kompatibilní zkratka - zahazuje diagnostiku, na null selhání stačí většině volajících. */
export async function fetchText(
  url: string,
  options: FetchTextOptions = {},
): Promise<{ status: number; text: string; headers: Headers } | null> {
  const outcome = await fetchWithDiagnostics(url, options);
  return outcome.ok
    ? { status: outcome.status, text: outcome.text, headers: outcome.headers }
    : null;
}
