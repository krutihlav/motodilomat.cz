#!/usr/bin/env tsx
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceRoleClient } from '../src/lib/supabase/server';
import { normalizeProductName } from '../src/lib/matching/normalizeName';
import { slugify } from '../src/lib/util/slugify';

const PAGE_SIZE = 1_000;
const MIN_NAME_WORDS = 3;

export type MatchTier = 'ean' | 'mpn' | 'name';

const TIER_CONFIDENCE: Record<MatchTier, number> = {
  ean: 1.0,
  mpn: 0.9,
  name: 0.55,
};

/**
 * Jeden shop_products řádek relevantní pro matching. Načítá se jen
 * part_id IS NULL AND match_status = 'pending' - lidská rozhodnutí
 * (manual/rejected/ignored) se nikdy nepřepisují.
 */
export type MatchCandidate = {
  id: string;
  shopId: string;
  ean: string | null;
  mpn: string | null;
  name: string;
  categoryText: string | null;
  partId: string | null;
};

export type MatchCluster = {
  tier: MatchTier;
  key: string;
  members: MatchCandidate[];
};

export type PartDraft = {
  oemNumber: string | null;
  name: string;
  category: string;
  slug: string;
  matchConfidence: number;
  tier: MatchTier;
  memberIds: string[];
};

function normalizeEan(value: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeMpn(value: string | null): string | null {
  const trimmed = value?.trim().toUpperCase();
  return trimmed ? trimmed : null;
}

function groupByKey(
  candidates: MatchCandidate[],
  keyFn: (candidate: MatchCandidate) => string | null,
): Map<string, MatchCandidate[]> {
  const groups = new Map<string, MatchCandidate[]>();
  for (const candidate of candidates) {
    const key = keyFn(candidate);
    if (!key) {
      continue;
    }
    const existing = groups.get(key);
    if (existing) {
      existing.push(candidate);
    } else {
      groups.set(key, [candidate]);
    }
  }
  return groups;
}

function distinctShopCount(members: MatchCandidate[]): number {
  return new Set(members.map((member) => member.shopId)).size;
}

/**
 * Tiered clustering (EAN -> MPN -> normalizovaný název) nad shop_products
 * bez part_id. Produkt s už vyplněným part_id je defenzivně přeskočen -
 * primární filtr (part_id IS NULL AND match_status = 'pending') patří do
 * DB dotazu, tohle je jen pojistka nad čistou funkcí.
 */
export function computeClusters(candidates: MatchCandidate[]): {
  clusters: MatchCluster[];
  unmatched: MatchCandidate[];
} {
  const pending = candidates.filter((candidate) => candidate.partId === null);
  const claimed = new Set<string>();
  const clusters: MatchCluster[] = [];

  const tierA = groupByKey(pending, (candidate) => normalizeEan(candidate.ean));
  for (const [key, members] of tierA) {
    if (distinctShopCount(members) >= 2) {
      clusters.push({ tier: 'ean', key, members });
      members.forEach((member) => claimed.add(member.id));
    }
  }

  const remainingAfterA = pending.filter((candidate) => !claimed.has(candidate.id));
  const tierB = groupByKey(remainingAfterA, (candidate) => normalizeMpn(candidate.mpn));
  for (const [key, members] of tierB) {
    if (distinctShopCount(members) >= 2) {
      clusters.push({ tier: 'mpn', key, members });
      members.forEach((member) => claimed.add(member.id));
    }
  }

  const remainingAfterB = remainingAfterA.filter((candidate) => !claimed.has(candidate.id));
  const tierC = groupByKey(remainingAfterB, (candidate) => {
    const normalized = normalizeProductName(candidate.name);
    const wordCount = normalized.split(' ').filter(Boolean).length;
    return wordCount >= MIN_NAME_WORDS ? normalized : null;
  });
  for (const [key, members] of tierC) {
    if (distinctShopCount(members) >= 2) {
      clusters.push({ tier: 'name', key, members });
      members.forEach((member) => claimed.add(member.id));
    }
  }

  const unmatched = pending.filter((candidate) => !claimed.has(candidate.id));

  return { clusters, unmatched };
}

function extractCategory(categoryText: string | null): string | null {
  if (!categoryText) {
    return null;
  }
  const segments = categoryText
    .split('>')
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
  return segments.length > 0 ? segments[segments.length - 1] : null;
}

function resolveOemNumber(members: MatchCandidate[]): string | null {
  for (const member of members) {
    const mpn = normalizeMpn(member.mpn);
    if (mpn) {
      return mpn;
    }
  }
  for (const member of members) {
    const ean = normalizeEan(member.ean);
    if (ean) {
      return ean;
    }
  }
  return null;
}

function resolveName(members: MatchCandidate[]): string {
  return members.reduce(
    (longest, member) => (member.name.length > longest.length ? member.name : longest),
    members[0].name,
  );
}

function resolveCategory(members: MatchCandidate[]): string {
  for (const member of members) {
    const category = extractCategory(member.categoryText);
    if (category) {
      return category;
    }
  }
  return 'ostatni';
}

/** Při kolizi slugu připojí -2, -3, ... - první volný vůči `existingSlugs`. */
export function resolveSlug(baseSlug: string, existingSlugs: Set<string>): string {
  if (!existingSlugs.has(baseSlug)) {
    return baseSlug;
  }
  let counter = 2;
  while (existingSlugs.has(`${baseSlug}-${counter}`)) {
    counter += 1;
  }
  return `${baseSlug}-${counter}`;
}

function buildPartDraft(cluster: MatchCluster, existingSlugs: Set<string>): PartDraft {
  const name = resolveName(cluster.members);
  const slug = resolveSlug(slugify(name), existingSlugs);
  return {
    oemNumber: resolveOemNumber(cluster.members),
    name,
    category: resolveCategory(cluster.members),
    slug,
    matchConfidence: TIER_CONFIDENCE[cluster.tier],
    tier: cluster.tier,
    memberIds: cluster.members.map((member) => member.id),
  };
}

/**
 * Sestaví draft pro každý cluster a průběžně registruje nově přiřazené
 * slugy do `existingSlugs`, aby si i dva clustery ve stejném běhu se stejným
 * názvem nekolidovaly (druhý dostane -2).
 */
export function buildPartDrafts(clusters: MatchCluster[], existingSlugs: Set<string>): PartDraft[] {
  const seen = new Set(existingSlugs);
  const drafts: PartDraft[] = [];
  for (const cluster of clusters) {
    const draft = buildPartDraft(cluster, seen);
    seen.add(draft.slug);
    drafts.push(draft);
  }
  return drafts;
}

export interface MatchRepository {
  fetchPendingCandidates(): Promise<MatchCandidate[]>;
  fetchExistingSlugs(): Promise<Set<string>>;
  /** Vrátí existující part.id při konfliktu slugu (created=false), jinak nově vytvořené (created=true). */
  upsertPart(draft: PartDraft, write: boolean): Promise<{ id: string | null; created: boolean }>;
  markMatched(
    memberIds: string[],
    partId: string,
    matchConfidence: number,
  ): Promise<void>;
}

export class SupabaseMatchRepository implements MatchRepository {
  constructor(private readonly client: SupabaseClient) {}

  async fetchPendingCandidates(): Promise<MatchCandidate[]> {
    const rows: MatchCandidate[] = [];
    let from = 0;

    for (;;) {
      const { data, error } = await this.client
        .from('shop_products')
        .select('id, shop_id, ean, name, category_text, part_id, mpn:raw->>mpn')
        .is('part_id', null)
        .eq('match_status', 'pending')
        .range(from, from + PAGE_SIZE - 1);

      if (error) {
        throw new Error(`Nepodařilo se načíst shop_products k párování: ${error.message}`);
      }
      if (!data || data.length === 0) {
        break;
      }

      for (const row of data as {
        id: string;
        shop_id: string;
        ean: string | null;
        name: string;
        category_text: string | null;
        part_id: string | null;
        mpn: string | null;
      }[]) {
        rows.push({
          id: row.id,
          shopId: row.shop_id,
          ean: row.ean,
          mpn: row.mpn,
          name: row.name,
          categoryText: row.category_text,
          partId: row.part_id,
        });
      }

      if (data.length < PAGE_SIZE) {
        break;
      }
      from += PAGE_SIZE;
    }

    return rows;
  }

  async fetchExistingSlugs(): Promise<Set<string>> {
    const slugs = new Set<string>();
    let from = 0;

    for (;;) {
      const { data, error } = await this.client
        .from('parts')
        .select('slug')
        .range(from, from + PAGE_SIZE - 1);

      if (error) {
        throw new Error(`Nepodařilo se načíst existující sluglist parts: ${error.message}`);
      }
      if (!data || data.length === 0) {
        break;
      }

      for (const row of data as { slug: string }[]) {
        slugs.add(row.slug);
      }

      if (data.length < PAGE_SIZE) {
        break;
      }
      from += PAGE_SIZE;
    }

    return slugs;
  }

  async upsertPart(draft: PartDraft, write: boolean): Promise<{ id: string | null; created: boolean }> {
    const { data: existing, error: selectError } = await this.client
      .from('parts')
      .select('id')
      .eq('slug', draft.slug)
      .maybeSingle();

    if (selectError) {
      throw new Error(`Nepodařilo se ověřit existující part (slug=${draft.slug}): ${selectError.message}`);
    }
    if (existing) {
      return { id: existing.id, created: false };
    }
    if (!write) {
      return { id: null, created: true };
    }

    const { data, error } = await this.client
      .from('parts')
      .upsert(
        {
          oem_number: draft.oemNumber,
          name: draft.name,
          slug: draft.slug,
          category: draft.category,
        },
        { onConflict: 'slug', ignoreDuplicates: true },
      )
      .select('id')
      .maybeSingle();

    if (error) {
      throw new Error(`Upsert parts selhal (slug=${draft.slug}): ${error.message}`);
    }
    if (data) {
      return { id: data.id, created: true };
    }

    // Souběh: mezi select a upsert vložil part se stejným slugem jiný proces.
    const { data: raceExisting, error: raceError } = await this.client
      .from('parts')
      .select('id')
      .eq('slug', draft.slug)
      .single();
    if (raceError || !raceExisting) {
      throw new Error(`Part se slugem "${draft.slug}" nenalezen po konfliktu: ${raceError?.message}`);
    }
    return { id: raceExisting.id, created: false };
  }

  async markMatched(memberIds: string[], partId: string, matchConfidence: number): Promise<void> {
    const { error } = await this.client
      .from('shop_products')
      .update({ part_id: partId, match_status: 'auto', match_confidence: matchConfidence })
      .in('id', memberIds);

    if (error) {
      throw new Error(`Update shop_products (part_id=${partId}) selhal: ${error.message}`);
    }
  }
}

export type RunSummary = {
  partsCreated: number;
  partsReused: number;
  matchedByTier: Record<MatchTier, number>;
  remainingPending: number;
};

export async function runMatchParts(repository: MatchRepository, write: boolean): Promise<RunSummary> {
  const candidates = await repository.fetchPendingCandidates();
  const { clusters, unmatched } = computeClusters(candidates);
  const existingSlugs = await repository.fetchExistingSlugs();
  const drafts = buildPartDrafts(clusters, existingSlugs);

  const summary: RunSummary = {
    partsCreated: 0,
    partsReused: 0,
    matchedByTier: { ean: 0, mpn: 0, name: 0 },
    remainingPending: unmatched.length,
  };

  for (const draft of drafts) {
    const { id, created } = await repository.upsertPart(draft, write);
    if (created) {
      summary.partsCreated += 1;
    } else {
      summary.partsReused += 1;
    }
    summary.matchedByTier[draft.tier] += draft.memberIds.length;

    if (write && id) {
      await repository.markMatched(draft.memberIds, id, draft.matchConfidence);
    }
  }

  return summary;
}

function printSummary(summary: RunSummary, write: boolean): void {
  console.log(write ? '--- Souhrn párování (zapsáno) ---' : '--- Souhrn párování (dry-run, nic se nezapsalo) ---');
  console.log(`Parts vytvořeno:           ${summary.partsCreated}`);
  console.log(`Parts znovupoužito:        ${summary.partsReused}`);
  console.log(`Spárováno Tier A (ean):    ${summary.matchedByTier.ean}`);
  console.log(`Spárováno Tier B (mpn):    ${summary.matchedByTier.mpn}`);
  console.log(`Spárováno Tier C (name):   ${summary.matchedByTier.name}`);
  console.log(`Zůstalo 'pending':         ${summary.remainingPending}`);
}

async function main() {
  const write = process.argv.includes('--write');
  const repository = new SupabaseMatchRepository(createServiceRoleClient());
  const summary = await runMatchParts(repository, write);
  printSummary(summary, write);
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
