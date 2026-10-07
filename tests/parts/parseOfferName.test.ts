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
    ).toBe('m5x0.75-80');
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
      material: null,
      teeth: null,
      pack: null,
      size: null,
      ref: null,
      code: null,
      with: null,
      note: null,
      version: null,
    });
  });
});

describe('parseOfferName - qualityTags', () => {
  it('původ, výrobce, stav', () => {
    expect(
      p('Píst JAWA 50 - 05, 20, 21, 23  38,75 / 14,1 úpl. *RAM', 'motomax').qualityTags,
    ).toEqual(['mfr:ram']);
    expect(p('Věnec Rozeta 56z ČZ Sport SK', 'jawa-korda').qualityTags).toEqual(['origin-sk']);
    expect(p('Sedlo Jawa Pérák - tmavě hnědé - kůže - ČR', 'javarna').qualityTags).toEqual([
      'origin-cz',
    ]);
    expect(p('Potrubí sání karb. *JIKOV BABETTA - plast  *M', 'motomax').qualityTags).toEqual([
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

describe('parseOfferName - variant.code', () => {
  it('tokeny s číslicí se ukládají, ne zahazují', () => {
    for (const [name, code] of [
      ['Karburátor 2926 se sytičem JAWA, ČZ', '2926'],
      ['Pružina šoupátka JAWA Pérák (*JIKOV 2924H)  *M', '2924h'],
      ['Sada těsnění karb. *DELLORTO 1412L/1616G', '1412l 1616g'],
      ['Karburátor *DELLORTO PHBG17BS  ,,IT', 'phbg17bs'],
      ['Pneu 3,25 - 16 *FORTUNE F-876  4pl. -e-', 'f-876'],
      ['Ložisko 6306 C3  ,,NTN', 'c3'],
    ] as const) {
      expect(v(name, 'motomax').code).toBe(code);
    }
  });

  it('ložiska jsou dimension, množství s jednotkou, model a ordinály nejsou kód', () => {
    expect(v('Ložisko 6202 2RS', 'motomax')).toMatchObject({ dimension: '6202-2rs', code: null });
    for (const name of [
      'Pojistka keramická 16A',
      'Kabel zelený, průřez 1mm2 (cena za 1m)',
      'Montážní silikonový tmel *K2 - čirý 85g od -51°C do +204°C',
      'Sada šroubů BABETTA STAR M134',
      'Rámeček světlometu JAWA Pérák, 1Typ. Kývačka  ,,CZ',
    ]) {
      expect(v(name, 'motomax').code).toBeNull();
    }
  });

  it('kód není v partType', () => {
    expect(p('Karburátor 2926 se sytičem JAWA, ČZ', 'motomax')).toMatchObject({
      partType: 'karburator',
      variant: { code: '2926', with: 's:sytic' },
    });
  });
});

describe('parseOfferName - krok 2 (tryska, úpl., značky, povrch, kódy, synonyma)', () => {
  it('A1: číslo za pomlčkou u trysky je velikost (dimension)', () => {
    expect(v('Tryska M4 x 0,7 - 76 *JIKOV karb.', 'motomax').dimension).toBe('m4x0.7-76');
    expect(v('Tryska hlavní M4 x 0,7 - 95 Jawa, ČZ - Dellorto', 'motokramek').dimension).toBe(
      'm4x0.7-95',
    );
    // mimo trysky číslo za pomlčkou velikost není
    expect(v('Šroub M4 x 0,7 - JAWA 50', 'motomax').dimension).toBe('m4x0.7');
  });

  it('A2: úpl./kompletní -> pack=complete, ne tag', () => {
    for (const [name, shop] of [
      ['Ojnice úplná JAWA 50 - 20, 21, 23  *M', 'motomax'],
      ['Elektroinstalace úpl. 20W JAWA 50 - 05, 20', 'motojelinek'],
      ['Výfuk kompletní Jawa Babetta 207, 210, 225', 'javarna'],
    ] as const) {
      const parsed = p(name, shop);
      expect(parsed.variant.pack).toBe('complete');
      expect(parsed.qualityTags).not.toContain('complete');
    }
    // ks a sada mají přednost
    expect(v('Ložiska motoru JAWA 50 - 550 úpl. (sada)', 'motomax').pack).toBe('sada');
  });

  it('A4: lak -> finish, dovoz/jakost/top/standard/kvalitní -> tag, ne partType', () => {
    expect(v('Věšák BABETTA ocelový,černý lak', 'motomax')).toMatchObject({
      finish: 'painted',
      color: 'black',
    });
    expect(v('Krytka řídítek malá JAWA 50 - Lakovaná  *M', 'motomax').finish).toBe('painted');
    const parsed = p('Píst Jawa dovoz kvalitní top standard 1. jakost', 'jawa-korda');
    expect(parsed.qualityTags).toEqual(['import', 'quality', 'top']);
    expect(parsed.variant.note).toBe('standard');
    expect(parsed.partType).toBe('pist');
  });

  it('A4: proud, patice a řetězy -> dimension', () => {
    expect(v('Pojistka keramická 16A', 'motomax').dimension).toBe('16a');
    expect(v('Žárovka  6V 15W  P26s', 'motomax').dimension).toBe('15w p26s');
    expect(v('Žárovka 12V 10W E10', 'motomax').dimension).toBe('10w e10');
    expect(v('Objímka žárovky H4 kovová', 'motomax').dimension).toBe('h4');
    expect(
      v('Řetěz 1/2 x 5/16 - 134 článků, YBN-MOTOMAX 428H + spona, JAWA, ČZ  *M', 'motomax')
        .dimension,
    ).toBe('134cl 428h 1/2x5/16');
    // "350 a 250" není proud
    expect(
      v('Jawa 250/590 a 350/361 sport kompletní český výplet kola', 'javarna').dimension,
    ).toBeNull();
  });

  it('A5: code bez teček a mezer, PHBG/SHA se spojí s dalším tokenem', () => {
    expect(
      v('Sada volnoběžných tysek (38, 40, 42) pro *DELLORTO PHBG 19DS ,,IT', 'motomax').code,
    ).toBe('phbg19ds');
    expect(v('Příruba karburátoru *DELLORTO SHA 16.16G BABETTA  *M', 'motomax').code).toBe(
      'sha1616g',
    );
    expect(v('Příruba karburátoru *DELLORTO 16.16G BABETTA  *M', 'motomax').code).toBe('1616g');
    expect(p('Karburátor *DELLORTO PHBG 19DS ,,IT', 'motomax').partType).toBe('karburator');
  });

  it('A6: synonyma lanko/bowden, samolepka/nálepka, šimerink/gufero, pístní/píst, volnoběžný/volnoběh', () => {
    expect(p('Lanko plynu Jawa 350', 'javarna').partType).toBe(
      p('Bowden plynu JAWA 350', 'motomax').partType,
    );
    expect(p('Samolepka JAWA retro', 'motomax').partType).toBe(
      p('Nálepka JAWA retro', 'motomax').partType,
    );
    expect(p('Šimerink kliky JAWA 50', 'motomax').partType).toBe(
      p('Gufero kliky JAWA 50', 'motomax').partType,
    );
    expect(p('Pístní kroužek 40x2mm JAWA 50', 'motomax').partType).toBe('krouzk pist');
    expect(p('Volnoběžný šroub karburátoru', 'motomax').partType).toBe(
      p('Volnoběh šroub karburátoru', 'motomax').partType,
    );
    expect(stemWord('simerink')).toBe('gufer');
  });
});

describe('parseOfferName - krok 3b', () => {
  it('1: výčty typů modelů nejsou rozměr (555,05,20 není 555.05)', () => {
    for (const [name, shop] of [
      ['Krk řízení, CHROM (CZ) - Jawa 50 555,05,20', 'motojelinek'],
      ['Kryt náboje kola, PŘEDNÍ (LEŠTĚNÝ) - JAWA 50 555,05', 'motojelinek'],
      ['Manžeta sání - ČZ 476,477', 'motomax'],
      ['Zástěrka ČZ 488 487 485 471 472.5 472.6. Profi', 'motomax'],
      ['Dílenská příručka ČZ 125, 180 - 488.3, 487.3  *M', 'motomax'],
    ] as const) {
      expect(v(name, shop).dimension).toBeNull();
    }
    // rozměr pístu za výčtem typů zůstává
    expect(v('Píst JAWA 50 - 05, 20, 21, 23  38,75 / 14,1 *Almet', 'motomax').dimension).toBe(
      '38.75/14.1',
    );
    expect(v('Píst BABETTA 207, 210, 225 39,25 úpl. *RAM', 'motomax').dimension).toBe('39.25');
  });

  it('2: slova za s/se/včetně/bez -> variant.with', () => {
    expect(v('Brzdová pumpa přední MZ (s páčkou)  ,,TW', 'motomax').with).toBe('s:pack');
    expect(v('Karburátor 2926 se sytičem JAWA, ČZ', 'motomax').with).toBe('s:sytic');
    expect(v('Přední blatník JAWA 550 (bez držáků)', 'motomax').with).toBe('bez:drzak');
    expect(
      v('Elektroinstalace (VAPE) 12V - JAWA 350 634 (s jedním budíkem)', 'motojelinek').with,
    ).toBe('s:budik');
    expect(v('Těsnění pod hlavu vč. matice Jawa 350', 'javarna').with).toBe('s:matic');
    expect(v('Řídítka JAWA 350 - 639, 640  - chrom', 'motomax').with).toBeNull();
    // slovo za předložkou není v partType
    expect(p('Kluzáky vidlice s maticí JAWA Kývačka', 'motomax').partType).toBe('kluzak vidlic');
  });

  it('3: nerozpoznaný obsah závorek -> variant.note, standard už není tag', () => {
    expect(p('Pružina spojky JAWA Pérák/kývačka (standard) *M', 'motomax')).toMatchObject({
      qualityTags: ['mfr:motomax'],
      variant: { note: 'standard' },
    });
    expect(v('Klika JAWA 50 (tuning)', 'motomax').note).toBe('tuning');
    expect(v('Elektroinstalace JAWA / ČZ spínačka (relé samostatně)', 'motomax').note).toBe(
      'rele samostatne',
    );
    // rozpoznané věci v závorce jsou varianty, ne note
    expect(v('Kryt nádrže, LEVÝ (JAWA) - JAWA 350 634', 'motojelinek')).toMatchObject({
      side: 'left',
      note: null,
    });
    expect(p('Pružina spojky JAWA 50 (tuning)', 'motomax').partType).toBe('pruzin spojk');
  });

  it('5: position může mít víc hodnot, side samostatné L, P, L+P', () => {
    expect(v('Vzpěra blatníku JAWA 50 -550 (přední horní)', 'motomax').position).toBe(
      'front+upper',
    );
    expect(v('Vzpěra blatníku JAWA 50 -550 (přední dolní)', 'motomax').position).toBe(
      'front+lower',
    );
    expect(v('Pružina přd./zadní brzdy STADION S11 - chrom  *M', 'motomax').position).toBe(
      'front+rear',
    );
    expect(v('Zrcátko oválné M8, L / P - chrom', 'motomax').side).toBe('both');
    expect(v('Zrcátko M8 L - chrom', 'motomax').side).toBe('left');
    expect(v('Zrcátko M8 P - chrom', 'motomax').side).toBe('right');
    expect(v('Kolena výfuku JAWA 350 - sada L+P', 'motomax').side).toBe('both');
  });

  it('6: pack 1kus / 1 kus / 1ks, ZN = zinek, mototechna a duells = mfr', () => {
    for (const name of [
      'Řadící čelist lehká Babetta 210 1kus',
      'Řadící čelist lehká Babetta 210 1 kus',
      'Řadící čelist lehká Babetta 210 1ks',
    ]) {
      expect(v(name, 'motomax').pack).toBe('1ks');
    }
    expect(v('Matice M8 ZN JAWA 50', 'motomax').finish).toBe('zinc');
    expect(p('Kabel Mototechna 2m', 'motomax').qualityTags).toEqual(['mfr:mototechna']);
    expect(p('Kapota Duells Jawa 350', 'motomax').qualityTags).toEqual(['mfr:duells']);
  });

  it('7: *M = mfr:motomax ve všech shopech', () => {
    for (const shop of ['motomax', 'jawa-korda', 'javarna', 'motojelinek', 'motokramek']) {
      expect(p('Pružina spojky JAWA 50 - 550, 555  *M', shop).qualityTags).toEqual(['mfr:motomax']);
    }
  });
});

describe('parseOfferName - version (1.typ / 2.typ)', () => {
  it('1.typ, 1. Typ, 1 typ, (1 typ), 1Typ. -> variant.version', () => {
    for (const [name, shop] of [
      ['Matice předního teleskopu - JAWA 50 23 (Mustang) 1.typ', 'motojelinek'],
      ['Víko spínací skříňky JAWA Pérák, Kývačka 1. Typ (logo Zbrojovka) - plast', 'motomax'],
      ['Řídítka standard JAWA 634 (1 typ)  "B', 'motomax'],
      ['Rámeček světlometu JAWA Pérák, 1Typ. Kývačka  ,,CZ', 'motomax'],
      ['Podložka startovací hřídele JAWA Pérák, Kývačka 1 Typ. 33x24x1mm', 'motomax'],
    ] as const) {
      expect(v(name, shop).version).toBe('1');
    }
    expect(v('Kryt světlometu JAWA Pérák 2.typ', 'motomax').version).toBe('2');
  });

  it('"typ 634" ani "Jawa 50 typ 550" nejsou version a typ nezůstane v partType', () => {
    expect(v('Přední světlo Jawa 350 typ 634 retro', 'motomax').version).toBeNull();
    expect(v('Výrobní štítek Jawa 50 typ 05 Pionýr leptaný', 'motomax').version).toBeNull();
    expect(
      p('Kryt řetězu JAWA 50 - 23A Mustang Golden Sport 1.Typ', 'motomax').partType,
    ).not.toContain('typ');
  });
});

describe('parseOfferName - stemming', () => {
  it('sjednotí pádové tvary', () => {
    for (const form of ['kolena', 'koleno', 'kolen', 'kolene'])
      expect(stemWord(form)).toBe('kolen');
    expect(stemWord('paprsek')).toBe(stemWord('paprsky'));
    expect(stemWord('vyfuku')).toBe(stemWord('vyfuk'));
    expect(stemWord('pistni')).toBe(stemWord('pistniho'));
    expect(stemWord('pistni')).toBe('pist');
    expect(stemWord('osa')).toBe(stemWord('osy'));
  });

  it('slova do 4 znaků se neřeší pravidlem, jen výčtem', () => {
    expect(stemWord('pneu')).toBe('pneu');
    expect(stemWord('kryt')).toBe('kryt');
    expect(stemWord('pist')).toBe('pist');
    expect(stemWord('kolo')).toBe('kol');
    expect(stemWord('kola')).toBe('kol');
    expect(stemWord('sady')).toBe(stemWord('sada'));
    expect(p('Pneu 3,25 - 18 *MITAS H-04', 'motomax').partType).toBe('pneu');
  });

  it('kolena/koleno výfuku skončí ve stejném partType', () => {
    const a = p('Kolena výfuku (doutníky) JAWA 350 Kývačka, Panelka - sada L+P', 'motomax');
    const b = p('Koleno výfuku - Stadion S22', 'motojelinek');
    expect(a.partType).toBe('kolen vyfuk');
    expect(b.partType).toBe('kolen vyfuk');
  });
});

describe('parseOfferName - značky Motomaxu podle prefixu', () => {
  it('*M = mfr:motomax u všech shopů (Korda prodává jejich výrobky)', () => {
    expect(p('Pružina spojky JAWA 50 - 550, 555  *M', 'motomax')).toMatchObject({
      qualityTags: ['mfr:motomax'],
      variant: { ref: null },
    });
    expect(p('Pružina spojky JAWA 50 - 550, 555  *M', 'jawa-korda').qualityTags).toEqual([
      'mfr:motomax',
    ]);
  });

  it('jikov, dellorto, domino, pal, bosch, vape -> variant.ref (s prefixem i bez, ve všech shopech)', () => {
    for (const [name, shop, ref] of [
      ['Tryska M4 x 0,7 - 50 *JIKOV karb.', 'motomax', 'jikov'],
      ['Karburátor *DELLORTO PHBG17BS  ,,IT', 'motomax', 'dellorto'],
      ['Karburátor Jikov 2926 JAWA', 'jawa-korda', 'jikov'],
      ['Tryska hlavní M4 x 0,7 - 95 Jawa, ČZ - Dellorto', 'motokramek', 'dellorto'],
      ['Stavěcí šroub bowdenu *DOMINO rukojeť', 'motomax', 'domino'],
      ['Mřížka bzučáku pro originál *PAL JAWA 50 - 550 - 23', 'motomax', 'pal'],
      ['Spínací skříňka JAWA, ČZ  *BOSCH (2 polohy-šroubky)', 'motomax', 'bosch'],
      ['Zapalování *VAPE JAWA 50 - 550, 555 6V 20W', 'motomax', 'vape'],
      [
        'Koleno sání karburátoru *JIKOV / *DELLORTO 16mm BABETTA 210, 225  *M',
        'motomax',
        'dellorto jikov',
      ],
    ] as const) {
      const parsed = p(name, shop);
      expect(parsed.variant.ref).toBe(ref);
      expect(
        parsed.qualityTags.filter((tag) => tag.startsWith('mfr:') && tag !== 'mfr:motomax'),
      ).toEqual([]);
    }
  });

  it('ostatní značky -> tag mfr:x (s prefixem i bez)', () => {
    expect(p('Žárovka  6V 15W  Ba15s *Elta', 'motomax')).toMatchObject({
      qualityTags: ['mfr:elta'],
      variant: { ref: null },
    });
    expect(p('Pneu 2,25 - 19 *FORTUNE F-851  2pl.', 'motomax').qualityTags).toEqual([
      'mfr:fortune',
    ]);
    expect(
      p('Kryt zadní svítilny BABETTA 228, 207 (náhrada *SIM)', 'motomax').qualityTags,
    ).toContain('mfr:sim');
    expect(p('Sada pístů 59,50 Jawa 350 čep 16 Almet', 'jawa-korda').qualityTags).toEqual([
      'mfr:almet',
    ]);
    expect(p('Ložiska motoru JAWA 50 - 550  ,,NTN (sada)', 'motomax')).toMatchObject({
      qualityTags: ['mfr:ntn'],
      variant: { ref: null },
    });
  });

  it('ref není v partType', () => {
    expect(p('Tryska M4 x 0,7 - 50 *JIKOV karb.', 'motomax').partType).toBe('karburator trysk');
  });

  it(',,CZ = původ ČR, ostatní kódy zemí taky', () => {
    expect(p('Indukční cívka 12V s objímkou  ,,CZ', 'motomax').qualityTags).toEqual(['origin-cz']);
    expect(p('Brzdová pumpa přední MZ (s páčkou)  ,,TW', 'motomax').qualityTags).toEqual([
      'origin-tw',
    ]);
    expect(p('Karburátor *DELLORTO PHBG17BS  ,,IT', 'motomax').qualityTags).toEqual(['origin-it']);
    expect(p('Ložisko 6306 C3  ,,NTN', 'motomax').qualityTags).toEqual(['mfr:ntn']);
  });

  it('"X na konci názvu = jakost, -e- = homologace', () => {
    const rings = p('Pístní kroužek 38,75x2mm  STADION, JAWA 50 - 05, 20, 21, 23 "B', 'motomax');
    expect(rings.qualityTags).toEqual(['grade:b']);
    expect(rings.partType).toBe('krouzk pist');
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
    expect(p('Indukční cívka 12V s objímkou  ,,CZ', 'motomax').partType).toBe('civk indukcn');
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
    ).toBe('114cl 428s 1/2x5.2');
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
      ['SADA TĚSNĚNÍ MOTORU JAWA 50 - 550, 555  *M', 'motomax', 'motor sada tesnen'],
      ['Sada šroubů motoru BABETTA 207 (velká)  *M', 'motomax', 'motor sada sroub'],
      ['Pístní sada P+L s kroužky 59,75,na čep 16 - Jawa 350', 'motojelinek', 'cep pist sada'],
      ['Kompletní sada BABETTA STAR 134, STELLA  *M', 'motomax', 'sada'],
    ] as const) {
      const parsed = p(name, shop);
      expect(parsed.partType).toBe(partType);
      expect(parsed.variant.pack).toBe(name.startsWith('Kompletní') ? 'complete' : null);
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
    expect(md).toContain('## Top 0 variant.ref');
    expect(md).toContain('## Top 0 variant.code');
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

describe('parseOfferName - materiál a barva na konci', () => {
  const parse = (name: string, shopId = 'motojelinek') => parseOfferName(name, { shopId });

  it('materiál na konci jde do varianty, ne do partType', () => {
    const leather = parse('Sedlo Jawa Pérák - tmavě hnědé - kůže - ČR', 'javarna');
    expect(leather.partType).toBe('sedl');
    expect(leather.variant.material).toBe('leather');
    expect(leather.variant.color).toBe('brown');
    const rubber = parse('Gumová rukojeť Jawa předválečná velká', 'jawa-korda');
    expect(rubber.partType).toContain('gum');
    expect(rubber.variant.material).toBeNull();
  });

  it('materiál v závorce a víc materiálů', () => {
    const p = parse('Pouzdro přední vidlice, HORNÍ (hliník) - JAWA, ČZ');
    expect(p.variant.material).toBe('aluminium');
    expect(p.partType).toBe('pouzdr vidlic');
    const q = parse('Kryt zadního světla - plast, guma', 'motomax');
    expect(q.variant.material).toBe('plastic+rubber');
    expect(q.partType).toBe('kryt svetl');
  });

  it('materiál na začátku je součást dílu', () => {
    const p = parse('Guma nádrže 54x2cm - JAWA 50 23', 'motomax');
    expect(p.variant.material).toBeNull();
    expect(p.partType).toContain('gum');
    expect(parse('Plech sedla JAWA 50 - 05, 20, 21', 'motomax').variant.material).toBeNull();
  });

  it('barva: béžový, rudá, černo-červený', () => {
    expect(parse('Potah sedla BÉŽOVÝ - Jawetta Sport', 'motojelinek').variant.color).toBe('beige');
    const s = parse('Samolepka Mustang - rudá - sada', 'motokramek');
    expect(s.variant.color).toBe('red');
    expect(s.partType).toBe('nalepk');
    expect(parse('Koberec pod motocykl ČERNO-ČERVENÝ - JAWA', 'motojelinek').partType).toBe(
      'koberec motocykl',
    );
  });
});
