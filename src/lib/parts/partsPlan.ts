import {
  fitKey,
  numberSet,
  VARIANT_ATTRIBUTES,
  type ClusterGroup,
  type ClusterItem,
} from './clusters';
import type { OfferVariant } from './parseOfferName';

/** parts.source pro automaticky vzniklé díly (check v migraci 015 povoluje 'auto' a 'manual'). */
export const PARTS_SOURCE = 'auto';
/** Díly s tímto source se nikdy nepřepisují. */
export const MANUAL_SOURCE = 'manual';
export const UNCATEGORIZED = 'Nezařazeno';
/** Kategorie Motomaxu, které nejsou kategorií dílu. */
const EXCLUDED_CATEGORIES = new Set(['nove naskladneno', 'akce', 'vyprodej']);

export type PlannedOffer = {
  id: string;
  shopId: string;
  name: string;
  price: number | null;
  matchStatus: string | null;
  /** shop_products.part_id (díl, ke kterému je nabídka už přiřazená) */
  partId: string | null;
};

export type PartPlan = {
  clusterKey: string;
  partType: string;
  /** Varianta dílu (bez note); jen vyplněné atributy. */
  variant: Partial<Record<keyof OfferVariant, string | number>>;
  name: string;
  slug: string;
  category: string;
  /** Sjednocení modelů nabídek (part_models). */
  models: string[];
  offers: PlannedOffer[];
};

export type PlanItem = ClusterItem;

function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase();
}

export function slugify(text: string, maxLength = 80): string {
  const slug = fold(text)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug.slice(0, maxLength).replace(/-+$/g, '');
}

/** FNV-1a 32 bit -> 8 hex znaků (krátký stabilní hash do slugu). */
export function shortHash(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/** Název nabídky bez značek shopu: "*M", "*JIKOV", ",,CZ". */
export function stripShopMarkers(name: string): string {
  return name
    .replace(/\*\S*/g, ' ')
    .replace(/,,\S*/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-–,.]+|[\s\-–,]+$/g, '')
    .trim();
}

/** Nejkratší název (bez značek) mezi nabídkami; při shodě délky abecedně. */
export function shortestName(names: string[]): string {
  const cleaned = names.map((name) => ({ name, clean: stripShopMarkers(name) }));
  const candidates = cleaned.filter((c) => c.clean.length > 0);
  const pool = candidates.length > 0 ? candidates : cleaned;
  return pool
    .map((c) => c.clean || c.name)
    .sort((a, b) => a.length - b.length || a.localeCompare(b))[0];
}

/** Poslední úroveň category_text ("A > B > C" -> "C"). Vyřazené kategorie vrací null. */
export function lastCategoryLevel(categoryText: string | null | undefined): string | null {
  const last = categoryText?.split('>').pop()?.trim();
  if (!last) return null;
  return EXCLUDED_CATEGORIES.has(fold(last)) ? null : last;
}

/** Nejčastější poslední úroveň kategorie nabídek Motomaxu; jinak "Nezařazeno". */
export function pickCategory(items: PlanItem[]): string {
  const counts = new Map<string, number>();
  for (const item of items) {
    if (item.shopId !== 'motomax') continue;
    const level = lastCategoryLevel(item.categoryText);
    if (level) counts.set(level, (counts.get(level) ?? 0) + 1);
  }
  const best = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  return best ? best[0] : UNCATEGORIZED;
}

/** Varianta dílu bez note; dimension jako seřazená čísla (aby klíč nezávisel na zápisu). */
export function variantForKey(variant: OfferVariant): PartPlan['variant'] {
  const out: PartPlan['variant'] = {};
  for (const key of VARIANT_ATTRIBUTES) {
    const value = variant[key];
    if (value === null) continue;
    out[key] =
      key === 'dimension'
        ? [...numberSet(String(value))].sort((a, b) => a - b).join(',')
        : key === 'ref' || key === 'code' || key === 'with'
          ? String(value).split(' ').sort().join(' ')
          : value;
  }
  return out;
}

export function buildClusterKey(
  partType: string,
  variant: PartPlan['variant'],
  models: string[],
  fits: string[],
): string {
  const variantText = Object.entries(variant)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, value]) => `${key}=${value}`)
    .join(';');
  const modelText = models.length > 0 ? models.join(',') : `fit:${fits.join('+')}`;
  return `${partType}|${variantText}|${modelText}`;
}

/** Z shluků A vyrobí plán dílů. Nabídky bez povolených stavů se vynechají. */
export function buildPartPlans(
  clusters: ClusterGroup[],
  options: { writableStatuses?: string[] } = {},
): PartPlan[] {
  const writable = options.writableStatuses ?? ['pending', 'auto'];
  const plans: PartPlan[] = [];
  for (const cluster of clusters) {
    const items = (cluster.items as PlanItem[]).filter((item) =>
      writable.includes(item.matchStatus ?? 'pending'),
    );
    if (items.length < 2) continue;
    const models = [...new Set(items.flatMap((item) => item.modelIds))].sort();
    const fits = [...new Set(items.map((item) => fitKey(item.fitGeneric)))].sort();
    const representative = [...items].sort(
      (a, b) => a.shopId.localeCompare(b.shopId) || a.name.localeCompare(b.name),
    )[0];
    const variant = variantForKey(representative.parsed.variant);
    const clusterKey = buildClusterKey(cluster.partType, variant, models, fits);
    const name = shortestName(items.map((item) => item.name));
    plans.push({
      clusterKey,
      partType: cluster.partType,
      variant,
      name,
      slug: `${slugify(name)}-${shortHash(clusterKey)}`,
      category: pickCategory(items),
      models,
      offers: items.map((item) => ({
        id: item.id,
        shopId: item.shopId,
        name: item.name,
        price: item.price,
        matchStatus: item.matchStatus ?? null,
        partId: item.partId ?? null,
      })),
    });
  }
  return plans.sort((a, b) => a.clusterKey.localeCompare(b.clusterKey));
}

export type ResolvedInfo = { slug: string; via: 'part_id' | 'cluster_key'; keyConflict?: boolean };

/** Nabídky s match_status=auto a part_id, které nepatří do žádného dnešního shluku (zůstávají beze změny). */
export function countStaleAuto(
  sources: { id: string; matchStatus?: string | null; partId?: string | null }[],
  plans: PartPlan[],
): number {
  const inPlan = new Set(plans.flatMap((plan) => plan.offers.map((offer) => offer.id)));
  return sources.filter((s) => s.matchStatus === 'auto' && s.partId && !inPlan.has(s.id)).length;
}

export function renderPartPlans(
  plans: PartPlan[],
  extra: {
    existing?: number;
    staleAuto?: number;
    columnsMissing?: boolean;
    /** cluster_key plánu -> existující díl, který se použije */
    resolved?: Map<string, ResolvedInfo>;
  } = {},
): string {
  const offers = plans.reduce((sum, plan) => sum + plan.offers.length, 0);
  const out: string[] = ['# Díly ze shluků A (parts)', ''];
  out.push(`Dílů: **${plans.length}**, nabídek k přiřazení: **${offers}**`);
  if (extra.columnsMissing) {
    out.push(
      '- sloupec parts.cluster_key v DB zatím není (migrace 015?) – nevím, které díly už existují',
    );
  } else if (extra.existing !== undefined) {
    out.push(
      `- existujících dílů (podle cluster_key): ${extra.existing}, nových: ${plans.length - extra.existing}`,
    );
  }
  if (extra.staleAuto !== undefined) {
    out.push(
      `- nabídky s match_status=auto mimo dnešní shluky (nechávám beze změny): ${extra.staleAuto}`,
    );
  }
  out.push('');
  plans.forEach((plan, index) => {
    out.push(`### ${index + 1}. ${plan.name}`);
    const resolved = extra.resolved?.get(plan.clusterKey);
    out.push(
      resolved
        ? `- existující díl: \`${resolved.slug}\` (nalezen podle ${resolved.via}${resolved.keyConflict ? '; cluster_key se nemění, nový klíč už má jiný díl' : ''}) – slug se nemění`
        : `- slug: \`${plan.slug}\``,
    );
    out.push(`- category: ${plan.category}`);
    out.push(`- partType: ${plan.partType}; variant: ${JSON.stringify(plan.variant)}`);
    out.push(`- modely: ${plan.models.join(', ') || '—'}`);
    out.push(`- cluster_key: \`${plan.clusterKey}\``);
    out.push(`- nabídky (${plan.offers.length}):`);
    for (const offer of plan.offers) {
      out.push(
        `  - \`${offer.shopId}\` ${offer.name} — ${offer.price ?? '?'} Kč [${offer.matchStatus ?? 'pending'}]`,
      );
    }
    out.push('');
  });
  return `${out.join('\n')}\n`;
}
