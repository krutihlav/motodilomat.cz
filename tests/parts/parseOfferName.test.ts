import { describe, expect, it } from 'vitest';
import { parseOfferName } from '../../src/lib/parts/parseOfferName';
import { buildPartsReport, renderPartsReport } from '../../src/lib/parts/partsReport';

const p = (name: string, shopId?: string) => parseOfferName(name, { shopId });
const v = (name: string, shopId?: string) => p(name, shopId).variant;

describe('parseOfferName - partType', () => {
  it('odstraní značku, model a rozsahy typů', () => {
    expect(p('Hřídel hlavní (CZ) - JAWA 550-555', 'motojelinek').partType).toBe('hlavni hridel');
    expect(p('Elektroinstalace - JAWA 90, Cross, Roadster, Trail', 'motojelinek').partType).toBe(
      'elektroinstalace',
    );
    expect(p('Silentblok zadního tlumiče Jawa 634-640, ČZ 476-488', 'jawa-korda').partType).toBe(
      'silentblok tlumice',
    );
  });

  it('je bez diakritiky, lowercase a nezávislý na pořadí slov', () => {
    expect(p('Kolo ozubené 19z. (2.rychl.), originál - ČZ 476-488', 'motojelinek').partType).toBe(
      'kolo ozubene',
    );
    expect(p('Ozubené kolo Jawa 350 634').partType).toBe(p('KOLO OZUBENÉ Jawa 350 634').partType);
    expect(p('Píst kroužek Pionýr').partType).toBe(p('Kroužek píst Pionýr').partType);
  });

  it('polohu, stranu, barvu a povrch nechá jen ve variantě', () => {
    expect(p('Držák zadního světla Pionýr 555', 'motokramek').partType).toBe('drzak svetla');
    expect(p('Držák světla Pionýr 555').partType).toBe('drzak svetla');
    expect(p('Kryt nádrže, LEVÝ (JAWA) - JAWA 350 634, 350 OHC', 'motojelinek').partType).toBe(
      'kryt nadrze',
    );
  });

  it('vrátí prázdný partType, když zbyde jen model/rozměr', () => {
    expect(p('Jawa 350 634').partType).toBe('');
  });
});

describe('parseOfferName - varianty', () => {
  it('rozměry', () => {
    expect(
      v('Ráfek 1,50 x 16" JAWA 50 - 550, 555, 05, 20, 21, 23 - INDIE chrom', 'motomax'),
    ).toMatchObject({
      dimension: '1.50x16"',
      finish: 'chrome',
    });
    expect(
      v('Paprsky M3 x 148mm chrom JAWA 50 - 555, 05, 20, 21, 23  (sada 36ks)', 'motomax'),
    ).toMatchObject({
      dimension: 'm3x148mm',
      finish: 'chrome',
      pack: '36ks',
    });
    expect(v('Pístní kroužek  41,50x2mm SIMSON  ,,CZ', 'motomax').dimension).toBe('41.50x2mm');
    expect(
      v('Vymezovací kroužek řadicího bubnu 15 × 4mm – BABETTA 210, 225, STELLA M134  *M', 'motomax')
        .dimension,
    ).toBe('15x4mm');
    expect(
      v('Tryska hlavní M5 x 0,75 - 80 Simson, Babetta - Dellorto', 'motokramek').dimension,
    ).toBe('m5x0.75');
    expect(v('Sítko kohoutu Jawa ČZ vnitřní průměr 9,2mm', 'jawa-korda')).toMatchObject({
      dimension: '9.2mm',
      position: 'inner',
    });
    expect(v('Ložisko 6202 2RS - ZVL - rozeta Stadion', 'motokramek').dimension).toBe('6202-2rs');
    expect(
      v('Duše - 19" x 2,25 - 2,50" , Stadion, Jawetta apod. - Mitroc', 'javarna').dimension,
    ).toBe('19"x2.25 2.50"');
  });

  it('rozměry pístu nepohltí rozsah modelů', () => {
    expect(v('Píst JAWA 50 - 05, 20, 21, 23  38,75 / 14,1 úpl. *RAM', 'motomax').dimension).toBe(
      '38.75/14.1',
    );
    expect(v('Sada pístů 59,50 Jawa 350 čep 16 Almet', 'jawa-korda').dimension).toBe('59.50');
  });

  it('napětí a výkon', () => {
    expect(v('Žárovka hlavního světla Babetta 6V 15W', 'jawa-korda')).toMatchObject({
      voltage: '6v',
      dimension: '15w',
    });
    expect(
      v('Labyrint ložiska (kliková hřídel) 12V - JAWA 350 638-640', 'motojelinek').voltage,
    ).toBe('12v');
  });

  it('strana a pozice', () => {
    expect(v('Kryt nádrže, LEVÝ (JAWA) - JAWA 350 634, 350 OHC', 'motojelinek').side).toBe('left');
    expect(v('Držák výfuk k navaření, PRAVÝ - JAWA Kývačka, Panelka', 'motojelinek').side).toBe(
      'right',
    );
    expect(
      v('Kolena výfuku (doutníky) JAWA 350 Kývačka, Panelka - sada L+P', 'motomax'),
    ).toMatchObject({
      side: 'both',
      pack: 'sada',
    });
    expect(v('Držák zadního světla Pionýr 555', 'motokramek').position).toBe('rear');
    expect(v('Silentblok předního a zadního tlumiče Jawa').position).toBe('front+rear');
  });

  it('povrch, barva, zuby, balení', () => {
    expect(v('Páčka klíče zadní brzdy Jawa pérák bez povrchové úpravy', 'jawa-korda').finish).toBe(
      'raw',
    );
    expect(v('Sedlo Jawa Pérák - tmavě hnědé - kůže - ČR', 'javarna').color).toBe('brown');
    expect(v('Spona náhonu tachometru ČZ černá', 'jawa-korda').color).toBe('black');
    expect(v('Věnec Rozeta 56z ČZ Sport SK', 'jawa-korda').teeth).toBe(56);
    expect(v('Kolo ozubené 19z. (2.rychl.), originál - ČZ 476-488', 'motojelinek').teeth).toBe(19);
    expect(v('Pružiny skla paraboly Pérák - 4ks', 'motokramek').pack).toBe('4ks');
    expect(v('Šlapadla (pedály) plast Babetta - sada', 'motokramek').pack).toBe('sada');
  });

  it('prázdné varianty jsou null', () => {
    expect(v('Elektroinstalace - JAWA 90, Cross, Roadster, Trail', 'motojelinek')).toEqual({
      dimension: null,
      voltage: null,
      side: null,
      position: null,
      finish: null,
      color: null,
      teeth: null,
      pack: null,
    });
  });
});

describe('parseOfferName - qualityTags', () => {
  it('původ, výrobce, stav', () => {
    expect(
      p('Píst JAWA 50 - 05, 20, 21, 23  38,75 / 14,1 úpl. *RAM', 'motomax').qualityTags,
    ).toEqual(['complete', 'mfr:ram']);
    expect(p('Věnec Rozeta 56z ČZ Sport SK', 'jawa-korda').qualityTags).toEqual(['origin-sk']);
    expect(p('Sedlo Jawa Pérák - tmavě hnědé - kůže - ČR', 'javarna').qualityTags).toEqual([
      'origin-cz',
    ]);
    expect(p('Potrubí sání karb. *JIKOV BABETTA - plast  *M', 'motomax').qualityTags).toEqual([
      'mfr:jikov',
    ]);
    expect(
      p('Kolo ozubené 19z. (2.rychl.), originál - ČZ 476-488', 'motojelinek').qualityTags,
    ).toEqual(['original']);
    expect(p('repasované kolo jawa 250/350 kývačka zadní nerez', 'jawa-korda').qualityTags).toEqual(
      ['refurbished'],
    );
  });
});

describe('partsReport', () => {
  const rows = [
    { shopId: 'motomax', name: 'Píst JAWA 50 - 05, 20, 21, 23  38,75 / 14,1 úpl. *RAM' },
    { shopId: 'motomax', name: 'Píst JAWA 50 - 05, 20, 21, 23  38,75 / 14,1' },
    { shopId: 'motojelinek', name: 'Kryt nádrže, LEVÝ (JAWA) - JAWA 350 634, 350 OHC' },
    { shopId: 'javarna', name: 'Jawa 350 634' },
  ];

  it('spočítá pokrytí, top partType a prázdné nabídky', () => {
    const report = buildPartsReport(rows, { sampleSize: 2 });
    expect(report.total).toBe(4);
    expect(report.topPartTypes[0]).toMatchObject({
      partType: 'pist',
      total: 2,
      byShop: { motomax: 2 },
    });
    expect(report.coverage.dimension.all).toBe(2);
    expect(report.coverage.side.motojelinek).toBe(1);
    expect(report.emptyPartType.items).toEqual([rows[3]]);
    expect(report.samples).toHaveLength(2);
    expect(buildPartsReport(rows, { sampleSize: 2 }).samples).toEqual(report.samples);
  });

  it('vyrenderuje markdown se všemi sekcemi', () => {
    const md = renderPartsReport(buildPartsReport(rows, { sampleSize: 2 }));
    for (const heading of [
      '## Pokrytí atributů',
      '## Top',
      '## 2 náhodných rozkladů',
      '## Nabídky s prázdným partType (1)',
    ]) {
      expect(md).toContain(heading);
    }
  });
});
