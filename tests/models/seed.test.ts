import { describe, expect, it } from 'vitest';
import { CANONICAL_MODELS } from '../../src/lib/models/seed';

describe('CANONICAL_MODELS', () => {
  it('má unikátní slugy', () => {
    const slugs = CANONICAL_MODELS.map((m) => m.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('neseeduje ČZ typy ani Simson', () => {
    const banned = ['355', '450', '453', '455', '470', '471', '472', '476', '477', '487', '488'];
    for (const model of CANONICAL_MODELS) {
      expect(model.brand).not.toMatch(/^(ČZ|Simson)$/);
      for (const type of model.typeNumbers) expect(banned).not.toContain(type);
    }
  });

  it('typová čísla označená „ověřit“ nejsou v type_numbers', () => {
    const find = (slug: string) => CANONICAL_MODELS.find((m) => m.slug === slug)!;
    for (const slug of [
      'jawetta',
      'jawetta-sport',
      'ohc-350',
      'ohc-500',
      'panelka-250',
      'panelka-350',
      'cezeta',
    ]) {
      expect(find(slug).typeNumbers).toEqual([]);
      expect(find(slug).needsVerification).toBe(true);
    }
    expect(find('perak-250').typeNumbers).toEqual(['11']);
    expect(find('perak-350').typeNumbers).toEqual(['12']);
    expect(find('perak-350').typeNumbers).not.toContain('353');
    expect(find('kyvacka-250').typeNumbers).toEqual(['353']);
    expect(find('kyvacka-350').typeNumbers).toEqual(['354']);
    expect(find('babetta-134').aliases).toEqual([]);
    expect(CANONICAL_MODELS.some((m) => m.aliases.some((a) => /californian/i.test(a)))).toBe(false);
  });

  it('obsahuje všech 34 modelů ze zadání', () => {
    expect(CANONICAL_MODELS.map((m) => m.slug).sort()).toEqual(
      [
        'pionyr-550',
        'pionyr-555',
        'pionyr-05',
        'pionyr-20',
        'pionyr-21',
        'mustang-23',
        'jawetta',
        'jawetta-sport',
        'stadion-s11',
        'stadion-s22',
        'stadion-s23',
        'jawa-90',
        'perak-250',
        'perak-350',
        'ohc-350',
        'ohc-500',
        'kyvacka-250',
        'kyvacka-350',
        'kyvacka-175',
        'jawa-250-559',
        'panelka-250',
        'panelka-350',
        'jawa-350-634',
        'jawa-350-638',
        'jawa-350-639',
        'jawa-350-640',
        'velorex-350',
        'babetta-207',
        'babetta-210',
        'babetta-225',
        'babetta-228',
        'babetta-134',
        'cezeta',
      ].sort(),
    );
  });
});
