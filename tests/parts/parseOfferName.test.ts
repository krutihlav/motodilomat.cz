import { describe, expect, it } from 'vitest';
import { parseOfferName, stemWord } from '../../src/lib/parts/parseOfferName';
import {
  buildPartsReport,
  findNearPairs,
  renderPartsReport,
} from '../../src/lib/parts/partsReport';

const p = (name: string, shopId?: string) => parseOfferName(name, { shopId });
const v = (name: string, shopId?: string) => p(name, shopId).variant;

describe('parseOfferName - partType', () => {
  it('odstraní značku, model a rozsahy typů', () => {
    expect(p('Hřídel hlavní (CZ) - JAWA 550-555', 'motojelinek').partType).toBe('hlavn hridel');
    expect(p('Elektroinstalace - JAWA 90, Cross, Roadster, Trail', 'motojelinek').partType).toBe(
      'elektroinstalac',
    );
    expect(p('Silentblok zadního tlumiče Jawa 634-640, ČZ 476-488', 'jawa-korda').partType).toBe(
      'silentblok tlumic',
    );
  });

  it('je bez diakritiky, lowercase a nezávislý na pořadí slov', () => {
    expect(p('Kolo ozubené 19z. (2.rychl.), originál - ČZ 476-488', 'motojelinek').partType).toBe(
      'kol ozuben',
    );
    expect(p('Ozubené kolo Jawa 350 634').partType).toBe(p('KOLO OZUBENÉ Jawa 350 634').partType);
    expect(p('Píst kroužek Pionýr').partType).toBe(p('Kroužek píst Pionýr').partType);
  });

  it('polohu, stranu, barvu a povrch nechá jen ve variantě', () => {
    expect(p('Držák zadního světla Pionýr 555', 'motokramek').partType).toBe('drzak svetl');
    expect(p('Držák světla Pionýr 555').partType).toBe('drzak svetl');
    expect(p('Kryt nádrže, LEVÝ (JAWA) - JAWA 350 634, 350 OHC', 'motojelinek').partType).toBe(
      'kryt nadrz',
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
      size: null,
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
      'mfr:motomax',
    ]);
    expect(
      p('Kolo ozubené 19z. (2.rychl.), originál - ČZ 476-488', 'motojelinek').qualityTags,
    ).toEqual(['original']);
    expect(p('repasované kolo jawa 250/350 kývačka zadní nerez', 'jawa-korda').qualityTags).toEqual(
      ['refurbished'],
    );
  });
});

describe('parseOfferName - stemming', () => {
  it('sjednotí pádové tvary', () => {
    for (const form of ['kolena', 'koleno', 'kolen', 'kolene'])
      expect(stemWord(form)).toBe('kolen');
    expect(stemWord('paprsek')).toBe(stemWord('paprsky'));
    expect(stemWord('vyfuku')).toBe(stemWord('vyfuk'));
    expect(stemWord('pistni')).toBe(stemWord('pistniho'));
    expect(stemWord('osa')).toBe(stemWord('osy'));
  });

  it('kolena/koleno výfuku skončí ve stejném partType', () => {
    const a = p('Kolena výfuku (doutníky) JAWA 350 Kývačka, Panelka - sada L+P', 'motomax');
    const b = p('Koleno výfuku - Stadion S22', 'motojelinek');
    expect(a.partType).toBe('kolen vyfuk');
    expect(b.partType).toBe('kolen vyfuk');
  });
});

describe('parseOfferName - značky Motomaxu podle prefixu', () => {
  it('*M = výrobce Motomax, *X = výrobce X (bez slovníku)', () => {
    expect(p('Pružina spojky JAWA 50 - 550, 555  *M', 'motomax').qualityTags).toEqual([
      'mfr:motomax',
    ]);
    expect(p('Žárovka  6V 15W  Ba15s *Elta', 'motomax').qualityTags).toEqual(['mfr:elta']);
    expect(p('Pneu 2,25 - 19 *FORTUNE F-851  2pl.', 'motomax').qualityTags).toEqual([
      'mfr:fortune',
    ]);
    expect(p('Řídítka s hrazdou JAWA *NOVYVYROBCE', 'motomax').qualityTags).toEqual([
      'mfr:novyvyrobce',
    ]);
  });

  it(',,CZ = původ ČR, ostatní kódy zemí taky', () => {
    expect(p('Indukční cívka 12V s objímkou  ,,CZ', 'motomax').qualityTags).toEqual(['origin-cz']);
    expect(p('Brzdová pumpa přední MZ (s páčkou)  ,,TW', 'motomax').qualityTags).toEqual([
      'origin-tw',
    ]);
    expect(p('Karburátor *DELLORTO PHBG17BS  ,,IT', 'motomax').qualityTags).toEqual([
      'mfr:dellorto',
      'origin-it',
    ]);
    expect(p('Ložisko 6306 C3  ,,NTN', 'motomax').qualityTags).toEqual(['mfr:ntn']);
  });

  it('"X na konci názvu = jakost, -e- = homologace', () => {
    const rings = p('Pístní kroužek 38,75x2mm  STADION, JAWA 50 - 05, 20, 21, 23 "B', 'motomax');
    expect(rings.qualityTags).toEqual(['grade:b']);
    expect(rings.partType).toBe('krouzk pistn');
    expect(p('Pneu 3,25 - 16 *FORTUNE F-876  4pl. -e-', 'motomax').qualityTags).toEqual([
      'e-mark',
      'mfr:fortune',
    ]);
    // uvozovky uprostřed názvu jakost nejsou
    expect(p('Sedlo BABETTA 210, 225 černo-šedé "PUNK"  *M', 'motomax').qualityTags).toEqual([
      'mfr:motomax',
    ]);
  });

  it('značky a kódy nezůstanou v partType', () => {
    expect(p('Ložisko 6306 C3  ,,NTN', 'motomax').partType).toBe('lozisk');
    expect(p('Indukční cívka 12V s objímkou  ,,CZ', 'motomax').partType).toBe(
      'civk indukcn objimk',
    );
  });
});

describe('parseOfferName - jednotky a zbytky rozměrů', () => {
  it('ccm, Ba15s, P45t, PL, Kč, Hz, km/h, mm2 skončí v dimension', () => {
    expect(v('Píst JAWA-ČZ, ČZ - 175ccm 60,00 / 16 *Almet', 'motomax').dimension).toBe(
      '175ccm 60.00',
    );
    expect(p('Píst JAWA-ČZ, ČZ - 175ccm 60,00 / 16 *Almet', 'motomax').partType).toBe('pist');
    expect(p('Žárovka  6V 15W  Ba15s *Elta', 'motomax')).toMatchObject({
      partType: 'zarovk',
      variant: { voltage: '6v', dimension: '15w ba15s' },
    });
    expect(v('Žárovka 12V 35/35W P45t', 'motomax').dimension).toContain('p45t');
    expect(p('Pneu 3,25 - 16 *FORTUNE F-876  4pl. -e-', 'motomax').variant.dimension).toBe(
      '4pl 3.25-16',
    );
    expect(p('Dárkový poukaz v hodnotě 1000 Kč', 'motomax').variant.dimension).toBe('1000kc');
    expect(v('Houkačka 12V 420Hz D-88mm šnek  *Elta', 'motomax').dimension).toBe('420hz d88mm');
    expect(v('Tachometr 110km/h ČZ 476, 477, Tatran, Manet', 'motomax').dimension).toBe('110kmh');
    expect(v('Kabel bílý, průřez 1mm2 (cena za 1m)', 'motomax').dimension).toBe('1mm2');
  });

  it('řetěz a rozměry s lomítkem', () => {
    expect(
      v(
        'Řetěz 1/2 x 5,2 - 114 článků, YBN-MOTOMAX 428S + spona, BABETTA, JAWA 50, SIMSON  *M',
        'motomax',
      ).dimension,
    ).toBe('1/2x5.2');
  });

  it('jednotky a kódy s číslicí nejsou v partType', () => {
    const noise = /\b(ccm|ba|pl|kc|hz|mm|w|kmh)\b/;
    for (const name of [
      'Píst JAWA-ČZ, ČZ - 175ccm 60,00 / 16 *Almet',
      'Žárovka  12V 10W  Ba15s',
      'Pneu 3,25 - 16 *FORTUNE F-876  4pl. -e-',
      'Dárkový poukaz v hodnotě 1000 Kč',
      'Karburátor *DELLORTO PHBG17BS  ,,IT',
    ]) {
      expect(p(name, 'motomax').partType).not.toMatch(noise);
    }
    expect(p('Karburátor *DELLORTO PHBG17BS  ,,IT', 'motomax').partType).toBe('karburator');
  });
});

describe('parseOfferName - size', () => {
  it('velký/malý/dlouhý/krátký -> variant.size', () => {
    expect(v('Kryt řídítek, velký - JAWA 50 20-23', 'motojelinek').size).toBe('large');
    expect(v('Krytka řídítek malá JAWA 50, BABETTA 207, 228 - Lakovaná  *M', 'motomax').size).toBe(
      'small',
    );
    expect(v('Výztuha / držák přd. blatníku krátký STADION S11 - surová', 'motomax').size).toBe(
      'short',
    );
    expect(v('Sada šroubů motoru BABETTA 207 (velká)  *M', 'motomax').size).toBe('large');
    expect(v('Gumy podlahy JAWA 50 - 05, 20 sada (1x dlouhá, 1x krátká)  *M', 'motomax').size).toBe(
      'long',
    );
    expect(v('Píst JAWA 50 - 05, 20, 21, 23  38,75 / 14,1', 'motomax').size).toBeNull();
  });

  it('slovo size není v partType', () => {
    expect(p('Kryt řídítek, velký - JAWA 50 20-23', 'motojelinek').partType).toBe('kryt riditk');
  });
});

describe('parseOfferName - "Sada" v názvu', () => {
  it('Sada na začátku / před modelem je součást partType, ne pack', () => {
    for (const [name, shop, partType] of [
      ['SADA TĚSNĚNÍ MOTORU JAWA 50 - 550, 555  *M', 'motomax', 'motor sad tesnen'],
      ['Sada šroubů motoru BABETTA 207 (velká)  *M', 'motomax', 'motor sad sroub'],
      [
        'Pístní sada P+L s kroužky 59,75,na čep 16 - Jawa 350',
        'motojelinek',
        'cep krouzk pistn sad',
      ],
      ['Kompletní sada BABETTA STAR 134, STELLA  *M', 'motomax', 'sad'],
    ] as const) {
      const parsed = p(name, shop);
      expect(parsed.partType).toBe(partType);
      expect(parsed.variant.pack).toBeNull();
    }
  });

  it('sada za modelem, za pomlčkou nebo v závorce je pack', () => {
    expect(
      p('Kolena výfuku (doutníky) JAWA 350 Kývačka, Panelka - sada L+P', 'motomax').variant.pack,
    ).toBe('sada');
    expect(p('Ložiska motoru JAWA 50 - 550, 555  ,,NTN (sada)', 'motomax')).toMatchObject({
      partType: 'lozisk motor',
      variant: { pack: 'sada' },
    });
    expect(p('Šlapadla (pedály) plast Babetta - sada', 'motokramek').variant.pack).toBe('sada');
    expect(
      p('Paprsky M3 x 160mm chrom BABETTA 207, 210, 225  (sada 36ks)', 'motomax').variant.pack,
    ).toBe('36ks');
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

  it('vypíše top qualityTags a dvojice partType lišící se jedním slovem', () => {
    const data = [
      { shopId: 'motomax', name: 'Pružina spojky JAWA 50 - 550, 555  *M' },
      { shopId: 'motomax', name: 'Pružina spojky JAWA 350  *M' },
      { shopId: 'motomax', name: 'Pružina brzdy JAWA 350' },
      { shopId: 'javarna', name: 'Pružina spojky Jawa Babetta 210' },
      { shopId: 'motomax', name: 'Pružina JAWA 350' },
    ];
    const report = buildPartsReport(data);
    expect(report.topQualityTags[0]).toEqual({
      tag: 'mfr:motomax',
      total: 2,
      byShop: { motomax: 2 },
    });
    const pairs = report.nearPairs.map((pr) => [pr.a, pr.b, pr.diff]);
    expect(pairs).toContainEqual(['pruzin spojk', 'brzd pruzin', ['spojk', 'brzd']]);
    expect(pairs).toContainEqual(['pruzin spojk', 'pruzin', ['spojk', '']]);
    const md = renderPartsReport(report);
    expect(md).toContain('## Top 1 qualityTags');
    expect(md).toContain('## Dvojice partType lišící se jedním slovem');
  });

  it('findNearPairs: záměna slova i slovo navíc, bez duplicit', () => {
    const counts = new Map([
      ['kryt retez', 5],
      ['kryt ridit', 3],
      ['kryt', 2],
      ['sedl potah', 1],
      ['paprsk', 4],
    ]);
    const pairs = findNearPairs(counts);
    expect(pairs.map((pr) => [pr.a, pr.b, pr.diff])).toEqual([
      ['kryt retez', 'kryt ridit', ['retez', 'ridit']],
      ['kryt retez', 'kryt', ['retez', '']],
      ['kryt ridit', 'kryt', ['ridit', '']],
    ]);
  });
});
