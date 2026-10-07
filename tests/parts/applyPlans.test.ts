import { describe, expect, it } from 'vitest';
import {
  applyPlans,
  WRITABLE_STATUSES,
  type ExistingPart,
  type NewPart,
  type PartsRepository,
} from '../../src/lib/parts/applyPlans';
import { PARTS_SOURCE, type PartPlan } from '../../src/lib/parts/partsPlan';

type StoredPart = ExistingPart & { name: string; category: string; isPublic: boolean };

function makeRepo(offerStatuses: Record<string, string>) {
  const parts = new Map<string, StoredPart>();
  const partModels = new Map<string, Set<string>>();
  const offers = new Map(
    Object.entries(offerStatuses).map(([id, status]) => [
      id,
      { status, partId: null as string | null, confidence: null as number | null },
    ]),
  );
  let counter = 0;
  const repo: PartsRepository = {
    findPartsByClusterKeys: async (keys) =>
      [...parts.values()].filter((p) => keys.includes(p.clusterKey)),
    insertPart: async (part: NewPart) => {
      counter += 1;
      const id = `part-${counter}`;
      parts.set(id, {
        id,
        clusterKey: part.clusterKey,
        slug: part.slug,
        source: part.source,
        name: part.name,
        category: part.category,
        isPublic: part.isPublic,
      });
      return id;
    },
    updatePart: async (id, fields) => {
      const part = parts.get(id)!;
      part.name = fields.name;
      part.category = fields.category;
    },
    getPartModels: async (id) => [...(partModels.get(id) ?? [])],
    deletePartModels: async (id, ids) => ids.forEach((m) => partModels.get(id)?.delete(m)),
    insertPartModels: async (id, ids) => {
      const set = partModels.get(id) ?? new Set<string>();
      ids.forEach((m) => set.add(m));
      partModels.set(id, set);
    },
    assignOffers: async (partId, ids) => {
      let n = 0;
      for (const id of ids) {
        const offer = offers.get(id);
        if (!offer || !WRITABLE_STATUSES.includes(offer.status)) continue;
        Object.assign(offer, { status: 'auto', partId, confidence: 1 });
        n += 1;
      }
      return n;
    },
  };
  return { repo, parts, partModels, offers };
}

const plan = (overrides: Partial<PartPlan> = {}): PartPlan => ({
  clusterKey: 'sroub||babetta-207',
  partType: 'sroub',
  variant: {},
  name: 'Šroub setrvačníku Babetta 207',
  slug: 'sroub-setrvacniku-babetta-207-deadbeef',
  category: 'Setrvačník',
  models: ['babetta-207', 'babetta-228'],
  offers: [
    { id: 'o1', shopId: 'motomax', name: 'a', price: 60, matchStatus: 'pending' },
    { id: 'o2', shopId: 'javarna', name: 'b', price: 50, matchStatus: 'pending' },
  ],
  ...overrides,
});

describe('applyPlans', () => {
  it('vytvoří díl s is_public=false, part_models a přiřadí nabídky (auto, confidence 1)', async () => {
    const { repo, parts, partModels, offers } = makeRepo({ o1: 'pending', o2: 'auto' });
    const summary = await applyPlans(repo, [plan()]);
    expect(summary).toMatchObject({
      partsCreated: 1,
      partsUpdated: 0,
      modelsAdded: 2,
      offersAssigned: 2,
    });
    const part = [...parts.values()][0];
    expect(part).toMatchObject({
      isPublic: false,
      source: PARTS_SOURCE,
      clusterKey: 'sroub||babetta-207',
    });
    expect([...partModels.get(part.id)!].sort()).toEqual(['babetta-207', 'babetta-228']);
    expect(offers.get('o1')).toEqual({ status: 'auto', partId: part.id, confidence: 1 });
    expect(offers.get('o2')).toEqual({ status: 'auto', partId: part.id, confidence: 1 });
  });

  it('je idempotentní: druhý běh nic nevytvoří ani nezmění', async () => {
    const { repo, parts, partModels } = makeRepo({ o1: 'pending', o2: 'pending' });
    await applyPlans(repo, [plan()]);
    const before =
      JSON.stringify([...parts.values()]) +
      JSON.stringify([...partModels.entries()].map(([k, v]) => [k, [...v]]));
    const second = await applyPlans(repo, [plan()]);
    expect(second).toMatchObject({
      partsCreated: 0,
      partsUpdated: 1,
      modelsAdded: 0,
      modelsRemoved: 0,
    });
    expect(parts.size).toBe(1);
    expect(
      JSON.stringify([...parts.values()]) +
        JSON.stringify([...partModels.entries()].map(([k, v]) => [k, [...v]])),
    ).toBe(before);
  });

  it('existující díl: aktualizuje name/category, nemění slug ani is_public', async () => {
    const { repo, parts } = makeRepo({ o1: 'pending', o2: 'pending' });
    await applyPlans(repo, [plan()]);
    const part = [...parts.values()][0];
    part.isPublic = true; // zveřejněno ručně
    await applyPlans(repo, [
      plan({ name: 'Nový název', category: 'Jiná', slug: 'jiny-slug-00000000' }),
    ]);
    expect(part).toMatchObject({
      name: 'Nový název',
      category: 'Jiná',
      slug: 'sroub-setrvacniku-babetta-207-deadbeef',
      isPublic: true,
    });
  });

  it('part_models se srovnají na sjednocení modelů (přidá nové, odebere zrušené)', async () => {
    const { repo, parts, partModels } = makeRepo({ o1: 'pending', o2: 'pending' });
    await applyPlans(repo, [plan()]);
    const summary = await applyPlans(repo, [plan({ models: ['babetta-207', 'babetta-210'] })]);
    expect(summary).toMatchObject({ modelsAdded: 1, modelsRemoved: 1 });
    expect([...partModels.get([...parts.keys()][0])!].sort()).toEqual([
      'babetta-207',
      'babetta-210',
    ]);
  });

  it('nepřepisuje nabídky manual / ignored / rejected', async () => {
    const { repo, offers } = makeRepo({ o1: 'manual', o2: 'ignored' });
    const summary = await applyPlans(repo, [plan()]);
    expect(summary.offersAssigned).toBe(0);
    expect(offers.get('o1')).toEqual({ status: 'manual', partId: null, confidence: null });
    expect(offers.get('o2')).toEqual({ status: 'ignored', partId: null, confidence: null });
    const rejected = makeRepo({ o1: 'rejected', o2: 'pending' });
    expect((await applyPlans(rejected.repo, [plan()])).offersAssigned).toBe(1);
    expect(rejected.offers.get('o1')!.status).toBe('rejected');
  });

  it('ruční díl (jiný source) se stejným klíčem přeskočí včetně nabídek', async () => {
    const { repo, parts, offers } = makeRepo({ o1: 'pending', o2: 'pending' });
    parts.set('manual-1', {
      id: 'manual-1',
      clusterKey: 'sroub||babetta-207',
      slug: 'rucni',
      source: 'manual',
      name: 'Ruční',
      category: 'X',
      isPublic: true,
    });
    const logs: string[] = [];
    const summary = await applyPlans(repo, [plan()], (m) => logs.push(m));
    expect(summary).toMatchObject({ partsSkippedManual: 1, partsCreated: 0, offersAssigned: 0 });
    expect(parts.get('manual-1')!.name).toBe('Ruční');
    expect(offers.get('o1')!.status).toBe('pending');
    expect(logs[0]).toContain('rucni');
  });
});
