import { describe, expect, it } from 'vitest';
import { isRelevantSlug, slugText } from '../../src/lib/crawl/slugRelevance';

describe('slugText', () => {
  it('nahradí oddělovače mezerami a odstraní koncovku', () => {
    expect(slugText('https://x.cz/p/retez-jawa_350.html?a=1')).toBe(' p retez jawa 350');
  });

  it('dekóduje %-kódovanou diakritiku a snese neplatné URL', () => {
    expect(slugText('https://x.cz/p%C3%A9r%C3%A1k-tlumic')).toContain('pérák');
    expect(slugText('neni url')).toBe('');
  });
});

describe('isRelevantSlug', () => {
  it('pustí slug s klíčovým slovem jako celým slovem', () => {
    expect(isRelevantSlug('https://x.cz/p/lozisko-jawa-350-640')).toBe(true);
    expect(isRelevantSlug('https://x.cz/zadni-tlumice-babetta-par/')).toBe(true);
    expect(isRelevantSlug('https://x.cz/p/spojka-cz-125-175')).toBe(true);
    expect(isRelevantSlug('https://x.cz/p/kluzak-p%C3%A9r%C3%A1k')).toBe(true);
  });

  it('vyřadí slug bez klíčového slova a částečné shody', () => {
    expect(isRelevantSlug('https://x.cz/p/svicka-ngk-b6hs')).toBe(false);
    expect(isRelevantSlug('https://x.cz/p/retez-simson-s51')).toBe(false);
    expect(isRelevantSlug('https://x.cz/p/zarovka-s110')).toBe(false);
    expect(isRelevantSlug('https://x.cz/p/czech-tlumic')).toBe(false);
  });
});
