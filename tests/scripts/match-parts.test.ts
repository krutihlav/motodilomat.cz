import { describe, expect, it } from 'vitest';
import {
  buildPartDrafts,
  computeClusters,
  resolveSlug,
  type MatchCandidate,
} from '../../scripts/match-parts';

function candidate(overrides: Partial<MatchCandidate> & { id: string; shopId: string }): MatchCandidate {
  return {
    ean: null,
    mpn: null,
    name: 'Bezejmenný díl',
    categoryText: null,
    partId: null,
    ...overrides,
  };
}

describe('computeClusters', () => {
  it('creates one cluster from an EAN match across 2 shops', () => {
    const candidates: MatchCandidate[] = [
      candidate({ id: '1', shopId: 'motomax', ean: '8594000000012', name: 'Karburátor Jikov 350' }),
      candidate({ id: '2', shopId: 'babetamania', ean: ' 8594000000012 ', name: 'Karburátor Jikov 350' }),
    ];

    const { clusters, unmatched } = computeClusters(candidates);

    expect(clusters).toHaveLength(1);
    expect(clusters[0].tier).toBe('ean');
    expect(clusters[0].members).toHaveLength(2);
    expect(unmatched).toHaveLength(0);
  });

  it('does not cluster an EAN seen at only one shop', () => {
    const candidates: MatchCandidate[] = [
      candidate({ id: '1', shopId: 'motomax', ean: '111' }),
      candidate({ id: '2', shopId: 'motomax', ean: '111' }),
    ];

    const { clusters, unmatched } = computeClusters(candidates);

    expect(clusters).toHaveLength(0);
    expect(unmatched).toHaveLength(2);
  });

  it('Tier C does not catch a short normalized name', () => {
    const candidates: MatchCandidate[] = [
      candidate({ id: '1', shopId: 'motomax', name: 'Píst Jawa' }),
      candidate({ id: '2', shopId: 'babetamania', name: 'Píst Jawa' }),
    ];

    const { clusters, unmatched } = computeClusters(candidates);

    expect(clusters).toHaveLength(0);
    expect(unmatched).toHaveLength(2);
  });

  it('Tier C catches a name with >= 3 words across shops', () => {
    const candidates: MatchCandidate[] = [
      candidate({ id: '1', shopId: 'motomax', name: 'Pouzdro ojnice horní Babetta 228' }),
      candidate({ id: '2', shopId: 'babetamania', name: 'pouzdro  ojnice  horní, Babetta 228' }),
    ];

    const { clusters, unmatched } = computeClusters(candidates);

    expect(clusters).toHaveLength(1);
    expect(clusters[0].tier).toBe('name');
    expect(unmatched).toHaveLength(0);
  });

  it('skips a product that already has a part_id, even if it would otherwise match', () => {
    const candidates: MatchCandidate[] = [
      candidate({ id: '1', shopId: 'motomax', ean: '111', partId: 'existing-part' }),
      candidate({ id: '2', shopId: 'babetamania', ean: '111' }),
    ];

    const { clusters, unmatched } = computeClusters(candidates);

    expect(clusters).toHaveLength(0);
    expect(unmatched).toHaveLength(1);
    expect(unmatched[0].id).toBe('2');
  });

  it('prefers Tier A over Tier B/C for the same members', () => {
    const candidates: MatchCandidate[] = [
      candidate({ id: '1', shopId: 'motomax', ean: '111', mpn: 'ABC' }),
      candidate({ id: '2', shopId: 'babetamania', ean: '111', mpn: 'ABC' }),
    ];

    const { clusters } = computeClusters(candidates);

    expect(clusters).toHaveLength(1);
    expect(clusters[0].tier).toBe('ean');
  });

  it('falls back to Tier B (mpn) when EAN does not match across shops', () => {
    const candidates: MatchCandidate[] = [
      candidate({ id: '1', shopId: 'motomax', mpn: 'abc-123' }),
      candidate({ id: '2', shopId: 'babetamania', mpn: 'ABC-123' }),
    ];

    const { clusters, unmatched } = computeClusters(candidates);

    expect(clusters).toHaveLength(1);
    expect(clusters[0].tier).toBe('mpn');
    expect(unmatched).toHaveLength(0);
  });
});

describe('resolveSlug', () => {
  it('returns the base slug when free', () => {
    expect(resolveSlug('kryt-spojky', new Set())).toBe('kryt-spojky');
  });

  it('appends -2, -3, ... on collision', () => {
    const existing = new Set(['kryt-spojky', 'kryt-spojky-2']);
    expect(resolveSlug('kryt-spojky', existing)).toBe('kryt-spojky-3');
  });
});

describe('buildPartDrafts', () => {
  it('resolves oem_number from mpn first, then ean, uses longest name and last category segment', () => {
    const clusters = computeClusters([
      candidate({
        id: '1',
        shopId: 'motomax',
        ean: '111',
        mpn: 'ABC',
        name: 'Karburátor',
        categoryText: 'Díly > Motor > Karburátory',
      }),
      candidate({
        id: '2',
        shopId: 'babetamania',
        ean: '111',
        name: 'Karburátor Jikov 350 pro Babettu',
      }),
    ]).clusters;

    const drafts = buildPartDrafts(clusters, new Set());

    expect(drafts).toHaveLength(1);
    expect(drafts[0].oemNumber).toBe('ABC');
    expect(drafts[0].name).toBe('Karburátor Jikov 350 pro Babettu');
    expect(drafts[0].category).toBe('Karburátory');
    expect(drafts[0].slug).toBe('karburator-jikov-350-pro-babettu');
    expect(drafts[0].matchConfidence).toBe(1.0);
  });

  it('falls back to "ostatni" category when no member has one', () => {
    const clusters = computeClusters([
      candidate({ id: '1', shopId: 'a', ean: '111', name: 'X' }),
      candidate({ id: '2', shopId: 'b', ean: '111', name: 'X' }),
    ]).clusters;

    const drafts = buildPartDrafts(clusters, new Set());

    expect(drafts[0].category).toBe('ostatni');
  });

  it('avoids slug collisions within the same run', () => {
    const clusters = computeClusters([
      candidate({ id: '1', shopId: 'a', ean: '111', name: 'Kryt spojky' }),
      candidate({ id: '2', shopId: 'b', ean: '111', name: 'Kryt spojky' }),
      candidate({ id: '3', shopId: 'a', ean: '222', name: 'Kryt spojky' }),
      candidate({ id: '4', shopId: 'b', ean: '222', name: 'Kryt spojky' }),
    ]).clusters;

    const drafts = buildPartDrafts(clusters, new Set());

    expect(drafts).toHaveLength(2);
    const slugs = drafts.map((d) => d.slug).sort();
    expect(slugs).toEqual(['kryt-spojky', 'kryt-spojky-2']);
  });
});
