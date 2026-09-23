import { describe, expect, it } from 'vitest';
import { slugify } from '../../src/lib/util/slugify';

describe('slugify', () => {
  it('strips diacritics', () => {
    expect(slugify('Pouzdro ojnice horní')).toBe('pouzdro-ojnice-horni');
  });

  it('keeps numbers', () => {
    expect(slugify('Babetta 228 207')).toBe('babetta-228-207');
  });

  it('collapses multiple separators and whitespace', () => {
    expect(slugify('Kryt   spojky,, (bronz)')).toBe('kryt-spojky-bronz');
  });

  it('trims leading and trailing separators', () => {
    expect(slugify('  -- Šroub M8 --  ')).toBe('sroub-m8');
  });

  it('returns an empty string for empty input', () => {
    expect(slugify('')).toBe('');
  });

  it('returns an empty string for input with no alphanumeric characters', () => {
    expect(slugify('***')).toBe('');
  });
});
