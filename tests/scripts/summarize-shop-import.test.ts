import { describe, expect, it } from 'vitest';
import { summarizeRows, type ShopProductRow } from '../../scripts/summarize-shop-import';

function row(overrides: Partial<ShopProductRow>): ShopProductRow {
  return { price: 100, inStock: true, itemGroupId: null, ...overrides };
}

describe('summarizeRows', () => {
  it('counts total rows and availability breakdown', () => {
    const stats = summarizeRows([
      row({ inStock: true }),
      row({ inStock: true }),
      row({ inStock: false }),
      row({ inStock: null }),
    ]);

    expect(stats.totalRows).toBe(4);
    expect(stats.byAvailability).toEqual({ inStock: 2, outOfStock: 1, unknown: 1 });
  });

  it('computes min/max/avg price', () => {
    const stats = summarizeRows([row({ price: 10 }), row({ price: 20 }), row({ price: 30 })]);
    expect(stats.price).toEqual({ min: 10, max: 30, avg: 20 });
  });

  it('rounds the average price to 2 decimal places', () => {
    const stats = summarizeRows([row({ price: 10 }), row({ price: 10 }), row({ price: 11 })]);
    expect(stats.price?.avg).toBe(10.33);
  });

  it('returns null price when there are no rows', () => {
    expect(summarizeRows([]).price).toBeNull();
  });

  it('groups items by item_group_id and identifies multi-member groups (variants)', () => {
    const stats = summarizeRows([
      row({ itemGroupId: 'SEDLO-JAWA-350' }),
      row({ itemGroupId: 'SEDLO-JAWA-350' }),
      row({ itemGroupId: 'PEDAL-CZ-175' }),
      row({ itemGroupId: null }),
    ]);

    expect(stats.itemGroups).toEqual({
      itemsWithGroupId: 3,
      itemsWithoutGroupId: 1,
      distinctGroups: 2,
      groupsWithMultipleMembers: 1,
      itemsInMultiMemberGroups: 2,
    });
  });

  it('treats a single-member group as not a variant group', () => {
    const stats = summarizeRows([row({ itemGroupId: 'SOLO-GROUP' })]);
    expect(stats.itemGroups.groupsWithMultipleMembers).toBe(0);
    expect(stats.itemGroups.itemsInMultiMemberGroups).toBe(0);
  });
});
