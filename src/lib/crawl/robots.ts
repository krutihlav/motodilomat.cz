import { CRAWL_USER_AGENT, fetchText, waitForRateLimit } from './httpClient';
import type { Budget } from './requestBudget';

export type RobotsRules = {
  /** Disallow pravidla platná pro nás (User-agent: MotodilomatBot nebo *). */
  disallow: string[];
  allow: string[];
  sitemaps: string[];
  crawlDelaySeconds?: number;
};

const OUR_AGENT_TOKEN = 'MotodilomatBot';

/**
 * Minimalistický robots.txt parser. Bere v úvahu skupinu pro náš bot jménem
 * (User-agent: MotodilomatBot), jinak skupinu `User-agent: *`. Nepodporuje
 * wildcard/`$` v cestách - motodilomat.cz je jednoúčelový crawler nad
 * jednotkami domén, není potřeba plná specifikace.
 */
export function parseRobots(text: string): RobotsRules {
  const lines = text.split(/\r?\n/).map((line) => line.replace(/#.*$/, '').trim());

  type Group = {
    agents: string[];
    disallow: string[];
    allow: string[];
    crawlDelaySeconds?: number;
  };
  const groups: Group[] = [];
  const sitemaps: string[] = [];
  let current: Group | null = null;

  for (const line of lines) {
    if (!line) {
      continue;
    }

    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) {
      continue;
    }

    const field = line.slice(0, separatorIndex).trim().toLowerCase();
    const value = line.slice(separatorIndex + 1).trim();

    if (field === 'sitemap') {
      if (value) {
        sitemaps.push(value);
      }
      continue;
    }

    if (field === 'user-agent') {
      if (
        !current ||
        current.disallow.length > 0 ||
        current.allow.length > 0 ||
        current.crawlDelaySeconds !== undefined
      ) {
        current = { agents: [], disallow: [], allow: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      continue;
    }

    if (!current) {
      continue;
    }

    if (field === 'disallow') {
      if (value) {
        current.disallow.push(value);
      }
    } else if (field === 'allow') {
      if (value) {
        current.allow.push(value);
      }
    } else if (field === 'crawl-delay') {
      const seconds = Number.parseFloat(value);
      if (!Number.isNaN(seconds)) {
        current.crawlDelaySeconds = seconds;
      }
    }
  }

  const ourGroup = groups.find((group) =>
    group.agents.some(
      (agent) => OUR_AGENT_TOKEN.toLowerCase().includes(agent) || agent.includes('motodilomatbot'),
    ),
  );
  const wildcardGroup = groups.find((group) => group.agents.includes('*'));
  const chosen = ourGroup ?? wildcardGroup;

  return {
    disallow: chosen?.disallow ?? [],
    allow: chosen?.allow ?? [],
    sitemaps,
    crawlDelaySeconds: chosen?.crawlDelaySeconds,
  };
}

/** True, pokud danou cestu smíme podle robots.txt navštívit (nejdelší shoda vyhrává). */
export function isAllowed(rules: RobotsRules, pathname: string): boolean {
  let bestMatch: { length: number; allowed: boolean } | null = null;

  for (const rule of rules.disallow) {
    if (rule === '' || pathname.startsWith(rule)) {
      const length = rule.length;
      if (!bestMatch || length > bestMatch.length) {
        bestMatch = { length, allowed: false };
      }
    }
  }

  for (const rule of rules.allow) {
    if (pathname.startsWith(rule)) {
      const length = rule.length;
      if (!bestMatch || length > bestMatch.length) {
        bestMatch = { length, allowed: true };
      }
    }
  }

  return bestMatch?.allowed ?? true;
}

/**
 * 'found'     - robots.txt stažen a naparsován (2xx/3xx).
 * 'not_found' - server řekl, že tam žádný není (404, nebo jiná 4xx jako by nebyl).
 * 'unknown'   - nešlo zjistit (timeout/síťová chyba, nebo 5xx) - nespoléhat na crawlAllowed.
 */
export type RobotsStatus = 'found' | 'not_found' | 'unknown';

export type RobotsCheck = {
  status: RobotsStatus;
  rules: RobotsRules;
  /** Best-effort odhad - u 'unknown' je to jen "nemáme důvod nekrawlovat", ne záruka. */
  crawlAllowed: boolean;
};

const EMPTY_RULES: RobotsRules = { disallow: [], allow: [], sitemaps: [] };

/**
 * Stáhne a naparsuje /robots.txt pro danou base URL.
 * 404 (a jiné 4xx) = robots.txt neexistuje = vše povoleno ('not_found').
 * Timeout/síťová chyba/5xx = nevíme ('unknown') - crawlAllowed zůstává true
 * jako best-effort, ale volající by to měl v reportu odlišit od 'found'.
 */
export async function fetchRobots(baseUrl: string, budget?: Budget): Promise<RobotsCheck> {
  const robotsUrl = new URL('/robots.txt', baseUrl);
  await waitForRateLimit(robotsUrl.hostname);

  const response = await fetchText(robotsUrl.toString(), {
    headers: { 'User-Agent': CRAWL_USER_AGENT },
  });
  budget?.consume();

  if (!response) {
    return { status: 'unknown', rules: EMPTY_RULES, crawlAllowed: true };
  }
  if (response.status >= 500) {
    return { status: 'unknown', rules: EMPTY_RULES, crawlAllowed: true };
  }
  if (response.status >= 400) {
    return { status: 'not_found', rules: EMPTY_RULES, crawlAllowed: true };
  }

  const rules = parseRobots(response.text);
  return { status: 'found', rules, crawlAllowed: isAllowed(rules, '/') };
}
