import { MANUAL_SOURCE, PARTS_SOURCE, type PartPlan, type ResolvedInfo } from './partsPlan';

/** Stavy nabídek, které se smí přepsat (manual, rejected a ignored jsou lidská rozhodnutí). */
export const WRITABLE_STATUSES = ['pending', 'auto'];

export type ExistingPart = { id: string; clusterKey: string; slug: string; source: string | null };

export type NewPart = {
  name: string;
  slug: string;
  category: string;
  partType: string;
  variant: PartPlan['variant'];
  clusterKey: string;
  isPublic: false;
  source: string;
};

/** Přístup do DB (v testech nahrazený pamětí). */
export interface PartsRepository {
  findPartsByClusterKeys(keys: string[]): Promise<ExistingPart[]>;
  findPartsByIds(ids: string[]): Promise<ExistingPart[]>;
  insertPart(part: NewPart): Promise<string>;
  /** Aktualizuje name/category/part_type/variant (a cluster_key, je-li zadán); slug, is_public ani source se nemění. */
  updatePart(
    id: string,
    fields: Pick<NewPart, 'name' | 'category' | 'partType' | 'variant'> & { clusterKey?: string },
  ): Promise<void>;
  getPartModels(partId: string): Promise<string[]>;
  deletePartModels(partId: string, modelIds: string[]): Promise<void>;
  insertPartModels(partId: string, modelIds: string[]): Promise<void>;
  /** Nastaví part_id, match_status='auto', match_confidence=1 jen u řádků ve WRITABLE_STATUSES. */
  assignOffers(partId: string, offerIds: string[]): Promise<number>;
}

export type ApplySummary = {
  partsCreated: number;
  partsUpdated: number;
  partsSkippedManual: number;
  modelsAdded: number;
  modelsRemoved: number;
  offersAssigned: number;
};

export type Resolution = { part: ExistingPart; via: ResolvedInfo['via']; keyConflict: boolean };

/**
 * Najde existující díl pro každý plán: nejdřív podle part_id nabídek ve shluku (nejčastější
 * dosud nepřidělený), až pak podle cluster_key. Díl, který už převzal jiný plán v tomto běhu,
 * se nepřidělí podruhé (rozdělený shluk -> druhá půlka dostane nový díl).
 */
export async function resolveParts(
  repo: PartsRepository,
  plans: PartPlan[],
): Promise<Map<string, Resolution>> {
  const partIds = [
    ...new Set(
      plans.flatMap((p) => p.offers.map((o) => o.partId)).filter((id): id is string => !!id),
    ),
  ];
  const byId = new Map(
    (partIds.length > 0 ? await repo.findPartsByIds(partIds) : []).map((p) => [p.id, p]),
  );
  const byKey = new Map(
    (await repo.findPartsByClusterKeys(plans.map((p) => p.clusterKey))).map((p) => [
      p.clusterKey,
      p,
    ]),
  );

  const resolved = new Map<string, Resolution>();
  const claimed = new Set<string>();
  for (const plan of plans) {
    const counts = new Map<string, number>();
    for (const offer of plan.offers) {
      if (offer.partId && byId.has(offer.partId)) {
        counts.set(offer.partId, (counts.get(offer.partId) ?? 0) + 1);
      }
    }
    const byOffers = [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([id]) => byId.get(id)!)
      .find((part) => !claimed.has(part.id));
    const byClusterKey = byKey.get(plan.clusterKey);
    const keyed = byClusterKey && !claimed.has(byClusterKey.id) ? byClusterKey : undefined;
    const part = byOffers ?? keyed;
    if (!part) continue;
    claimed.add(part.id);
    resolved.set(plan.clusterKey, {
      part,
      via: byOffers ? 'part_id' : 'cluster_key',
      // nový klíč už patří jinému dílu -> klíč nalezeného dílu se nemění (unique)
      keyConflict: !!byClusterKey && byClusterKey.id !== part.id,
    });
  }
  return resolved;
}

/** Idempotentní zápis: díly podle part_id nabídek / cluster_key, part_models = sjednocení modelů, nabídky -> auto. */
export async function applyPlans(
  repo: PartsRepository,
  plans: PartPlan[],
  log: (message: string) => void = () => {},
): Promise<ApplySummary> {
  const summary: ApplySummary = {
    partsCreated: 0,
    partsUpdated: 0,
    partsSkippedManual: 0,
    modelsAdded: 0,
    modelsRemoved: 0,
    offersAssigned: 0,
  };
  const resolved = await resolveParts(repo, plans);

  for (const plan of plans) {
    const found = resolved.get(plan.clusterKey);
    let partId: string;
    if (!found) {
      partId = await repo.insertPart({
        name: plan.name,
        slug: plan.slug,
        category: plan.category,
        partType: plan.partType,
        variant: plan.variant,
        clusterKey: plan.clusterKey,
        isPublic: false,
        source: PARTS_SOURCE,
      });
      summary.partsCreated += 1;
    } else if (found.part.source === MANUAL_SOURCE) {
      // ruční díl: nesahám na něj ani na jeho nabídky
      summary.partsSkippedManual += 1;
      log(`Přeskakuji ruční díl ${found.part.slug} (source=${found.part.source})`);
      continue;
    } else {
      partId = found.part.id;
      if (found.keyConflict) {
        log(`Díl ${found.part.slug}: nový cluster_key už má jiný díl, klíč nechávám`);
      }
      await repo.updatePart(partId, {
        name: plan.name,
        category: plan.category,
        partType: plan.partType,
        variant: plan.variant,
        ...(found.keyConflict ? {} : { clusterKey: plan.clusterKey }),
      });
      summary.partsUpdated += 1;
    }

    const current = new Set(await repo.getPartModels(partId));
    const wanted = new Set(plan.models);
    const toRemove = [...current].filter((id) => !wanted.has(id));
    const toAdd = [...wanted].filter((id) => !current.has(id));
    if (toRemove.length > 0) await repo.deletePartModels(partId, toRemove);
    if (toAdd.length > 0) await repo.insertPartModels(partId, toAdd);
    summary.modelsRemoved += toRemove.length;
    summary.modelsAdded += toAdd.length;

    summary.offersAssigned += await repo.assignOffers(
      partId,
      plan.offers.map((offer) => offer.id),
    );
  }
  return summary;
}
