import { describe, expect, it } from 'vitest';
import { normalizeProductName } from '../../src/lib/matching/normalizeName';

describe('normalizeProductName', () => {
  it('normalizes real-world variants of the same product to the same string', () => {
    const a = normalizeProductName('Pouzdro ojnice horní BABETTA 228, 207 (bronz)  *M');
    const b = normalizeProductName('Pouzdro ojnice horní, Babetta 228/207 (bronz)*M');

    expect(a).toBe(b);
    expect(a).toBe('pouzdro ojnice horni babetta 228 207 bronz');
  });

  it('strips diacritics and lowercases', () => {
    expect(normalizeProductName('Vodní pumpa ČZ')).toBe('vodni pumpa cz');
  });

  it('keeps distinguishing brand/model tokens', () => {
    expect(normalizeProductName('Píst Jawa 634')).toBe('pist jawa 634');
  });

  it('collapses multiple spaces and trims', () => {
    expect(normalizeProductName('  Šroub   M8   ')).toBe('sroub m8');
  });

  it('drops lone asterisk markers but keeps everything else', () => {
    expect(normalizeProductName('Kryt spojky *')).toBe('kryt spojky');
    expect(normalizeProductName('Kryt spojky **')).toBe('kryt spojky');
  });

  it('handles empty input', () => {
    expect(normalizeProductName('')).toBe('');
  });
});
