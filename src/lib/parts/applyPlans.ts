import { PARTS_SOURCE, type PartPlan } from './partsPlan';

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
  insertPart(part: NewPart): Promise<string>;
  /** Aktualizuje jen name/category/part_type/variant; slug, is_public ani source se nemění. */
  updatePart(
    id: string,
    fields: Pick<NewPart, 'name' | 'category' | 'partType' | 'variant'>,
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

/** Idempotentní zápis: díly podle cluster_key, part_models = sjednocení modelů, nabídky -> auto. */
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
  const existing = new Map(
    (await repo.findPartsByClusterKeys(plans.map((p) => p.clusterKey))).map((part) => [
      part.clusterKey,
      part,
    ]),
  );

  for (const plan of plans) {
    const found = existing.get(plan.clusterKey);
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
    } else if (found.source !== PARTS_SOURCE) {
      // ruční díl se stejným klíčem: nesahám na něj ani na jeho nabídky
      summary.partsSkippedManual += 1;
      log(`Přeskakuji ruční díl ${found.slug} (source=${found.source})`);
      continue;
    } else {
      partId = found.id;
      await repo.updatePart(partId, {
        name: plan.name,
        category: plan.category,
        partType: plan.partType,
        variant: plan.variant,
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
