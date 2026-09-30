import { describe, expect, it } from 'vitest';
import { CANONICAL_MODELS } from '../../src/lib/models/seed';

const find = (slug: string) => CANONICAL_MODELS.find((m) => m.slug === slug)!;

describe('CANONICAL_MODELS', () => {
  it('má unikátní slugy a 57 modelů ze zadání', () => {
    const slugs = CANONICAL_MODELS.map((m) => m.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs).toHaveLength(57);
  });

  it('neseeduje Simson, předválečné ČZ, ČZ 500 ani motokros 968/980', () => {
    const banned = ['968', '980'];
    for (const model of CANONICAL_MODELS) {
      expect(model.brand).not.toBe('Simson');
      for (const type of model.typeNumbers) expect(banned).not.toContain(type);
      expect(model.aliases.join(' ')).not.toMatch(/ohc\s*350|350 ohc/i);
    }
    expect(CANONICAL_MODELS.some((m) => m.slug === 'ohc-350')).toBe(false);
  });

  it('typy sdílené víc modely: 551 = obě Jawetty, 552 = tři Stadiony', () => {
    const owners = (type: string) =>
      CANONICAL_MODELS.filter((m) => m.typeNumbers.includes(type)).map((m) => m.slug);
    expect(owners('551')).toEqual(['jawetta', 'jawetta-sport']);
    expect(owners('552')).toEqual(['stadion-s11', 'stadion-s22', 'stadion-s23']);
    expect(owners('550')).toEqual(['pionyr-550']);
  });

  it('ověřená typová čísla', () => {
    expect(find('perak-250').typeNumbers).toEqual(['11']);
    expect(find('perak-350').typeNumbers).toEqual(['12']);
    expect(find('ohc-500').typeNumbers).toEqual(['15']);
    expect(find('kyvacka-250').typeNumbers).toEqual(['353']);
    expect(find('kyvacka-350').typeNumbers).toEqual(['354']);
    expect(find('panelka-250-559').typeNumbers).toEqual(['559']);
    expect(find('panelka-250-592').typeNumbers).toEqual(['592']);
    expect(find('panelka-350-360').typeNumbers).toEqual(['360']);
    expect(find('jawa-90-trail').typeNumbers).toEqual(['30', '36']);
    expect(find('jawa-90-roadster').typeNumbers).toEqual(['31', '37']);
    expect(find('babetta-134').aliases).toEqual(['stella', 'star', 'star 134']);
    expect(CANONICAL_MODELS.every((m) => !m.needsVerification)).toBe(true);
  });
});
