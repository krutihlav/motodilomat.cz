import { describe, expect, it } from 'vitest';
import { buildWritePlan, summarizePlan } from '../../scripts/write-product-models';
import { buildProductModels } from '../../src/lib/models/productModels';

describe('buildProductModels', () => {
  it('match_level vazby je úroveň zásahu, ne úroveň řádku', () => {
    const result = buildProductModels('Kryt Jawa 350 Panelka, 634');
    expect(result.modelMatchLevel).toBe('type');
    expect(result.links.map((l) => [l.modelId, l.matchLevel])).toEqual([
      ['jawa-350-634', 'type'],
      ['panelka-350-360', 'nickname'],
    ]);
    expect(result.links.every((l) => l.source === 'name')).toBe(true);
  });

  it('displacement a brand jdou do fitGeneric, ne do vazeb', () => {
    expect(buildProductModels('Píst Jawa 250/350')).toEqual({
      modelMatchLevel: 'displacement',
      links: [],
      fitGeneric: [
        { brand: 'Jawa', displacement: 250 },
        { brand: 'Jawa', displacement: 350 },
        { brand: 'Jawa' },
      ],
    });
    expect(buildProductModels('Držák - JAWA, ČZ', 'motojelinek').fitGeneric).toEqual([
      { brand: 'Jawa' },
      { brand: 'ČZ' },
    ]);
  });

  it('řádek bez shody má none', () => {
    expect(buildProductModels('Ložisko 6302 2RS')).toEqual({
      modelMatchLevel: 'none',
      links: [],
      fitGeneric: [],
    });
  });
});

describe('buildWritePlan', () => {
  it('přeskočí merch a Simson bez naší značky a spočítá vazby', () => {
    const plan = buildWritePlan([
      { id: '1', shop_id: 'motomax', name: 'Sedlo Babetta 210, 225' },
      { id: '2', shop_id: 'motomax', name: 'Tričko s potiskem Jawa Pionýr' },
      { id: '3', shop_id: 'motomax', name: 'Zadní stupačka úpl. SIMSON' },
      { id: '4', shop_id: 'motomax', name: 'Ložisko 6302 2RS' },
    ]);
    expect(plan.rows.map((r) => r.id)).toEqual(['1', '4']);
    expect(plan.skipped).toEqual({ merch: 1, simson_only: 1 });
    const text = summarizePlan(plan);
    expect(text).toContain('Vazeb shop_product_models celkem: 2 (type 2, nickname 0)');
    expect(text).toContain('none 1');
  });
});
