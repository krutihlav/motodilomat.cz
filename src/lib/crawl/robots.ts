import { CRAWL_USER_AGENT, fetchText, waitForRateLimit } from './httpClient';

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

export type RobotsCheck = {
  fetched: boolean;
  rules: RobotsRules;
  crawlAllowed: boolean;
};

/** Stáhne a naparsuje /robots.txt pro danou base URL. Chybějící robots.txt = vše povoleno. */
export async function fetchRobots(baseUrl: string): Promise<RobotsCheck> {
  const robotsUrl = new URL('/robots.txt', baseUrl);
  await waitForRateLimit(robotsUrl.hostname);

  const response = await fetchText(robotsUrl.toString(), {
    headers: { 'User-Agent': CRAWL_USER_AGENT },
  });

  if (!response || response.status >= 400) {
    return { fetched: false, rules: { disallow: [], allow: [], sitemaps: [] }, crawlAllowed: true };
  }

  const rules = parseRobots(response.text);
  return { fetched: true, rules, crawlAllowed: isAllowed(rules, '/') };
}
