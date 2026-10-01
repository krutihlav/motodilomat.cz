import { describe, expect, it } from 'vitest';
import { extractModelScope, parseModels } from '../../src/lib/models/parseModels';

const slugs = (name: string, shopId?: string) =>
  parseModels(name, { shopId }).models.map((m) => m.slug);
const level = (name: string, shopId?: string) => parseModels(name, { shopId }).level;

describe('parseModels - reálné názvy z DB', () => {
  // [název, shop, očekávané modely, úroveň]
  const cases: [string, string, string[], string | null][] = [
    // Jawa 50: rozsahy, seznamy, závorky
    ['Hřídel hlavní (CZ) - JAWA 550-555', 'motojelinek', ['pionyr-550', 'pionyr-555'], 'type'],
    [
      'Kryt řídítek, velký - JAWA 50 20-23',
      'motojelinek',
      ['mustang-23', 'pionyr-20', 'pionyr-21'],
      'type',
    ],
    [
      'Kolo 16" NEREZ výplet - JAWA 50 05,20-23',
      'motojelinek',
      ['mustang-23', 'pionyr-05', 'pionyr-20', 'pionyr-21'],
      'type',
    ],
    [
      'Krk řízení, CHROM (CZ) - Jawa 50 555,05,20',
      'motojelinek',
      ['pionyr-05', 'pionyr-20', 'pionyr-555'],
      'type',
    ],
    ['Elektroinstalace (30W) - JAWA 50 23 (Mustang)', 'motojelinek', ['mustang-23'], 'type'],
    ['Bowden rychlopalu JAWA 21, 23  *M', 'motomax', ['mustang-23', 'pionyr-21'], 'type'],
    [
      'Kolo hlavní hřídele Pionýr 05, 20, 21, 23 - zinek',
      'motokramek',
      ['mustang-23', 'pionyr-05', 'pionyr-20', 'pionyr-21'],
      'type',
    ],
    ['Držák zadního světla Jawa Pionýr 23 Mustang', 'motokramek', ['mustang-23'], 'type'],
    ['Kryt lanek Pionýr 550/555 - bez díry', 'motokramek', ['pionyr-550', 'pionyr-555'], 'type'],
    [
      'Těsnění víka zapalování JAWA50 20/21/23 *M',
      'motomax',
      ['mustang-23', 'pionyr-20', 'pionyr-21'],
      'type',
    ],
    ['Samolepka Mustang - rudá - sada', 'motokramek', ['mustang-23'], 'nickname'],
    ['plech Jawa 50/550 pařez', 'javarna', ['pionyr-550'], 'type'],
    // Jawetta (551) a Stadion (552)
    ['vidlice Jawa 50/551 Jawetta', 'javarna', ['jawetta', 'jawetta-sport'], 'type'],
    ['M6 úplná JAWETTA 551  *M', 'motomax', ['jawetta', 'jawetta-sport'], 'type'],
    ['Držák stojanu, CHROM - Jawetta', 'motojelinek', ['jawetta'], 'nickname'],
    ['Sedlo Jawetta Sport', 'x', ['jawetta-sport'], 'nickname'],
    ['Potah sedla BÉŽOVÝ - Jaweta Sport', 'motojelinek', ['jawetta-sport'], 'nickname'],
    ['motor Jawa 50 typ 552', 'x', ['stadion-s11', 'stadion-s22', 'stadion-s23'], 'type'],
    [
      'Bowden přední brzdy - Stadion S22, Jawetta',
      'motojelinek',
      ['jawetta', 'stadion-s22'],
      'nickname',
    ],
    ['Ložisko řízení, věneček - S11', 'motojelinek', ['stadion-s11'], 'nickname'],
    [
      'dekompresoru Stadion S 11/22, Jawetta ZN',
      'jawa-korda',
      ['jawetta', 'stadion-s11', 'stadion-s22'],
      'nickname',
    ],
    [
      'Držák bzučáku, zesílený - Stadion, Jawetta',
      'motojelinek',
      ['jawetta', 'stadion-s11', 'stadion-s22', 'stadion-s23'],
      'nickname',
    ],
    // Jawa 90
    [
      'Elektroinstalace - JAWA 90, Cross, Roadster, Trail',
      'motojelinek',
      ['jawa-90-cross-trail', 'jawa-90-roadster'],
      'nickname',
    ],
    ['Bowden PLYN - JAWA 90 Cross', 'motojelinek', ['jawa-90-cross-trail'], 'nickname'],
    ['Koleno výfuku (CZ) - JAWA 90 Roadster', 'motojelinek', ['jawa-90-roadster'], 'nickname'],
    ['Kabel Jawa 90 typ 31', 'x', ['jawa-90-roadster'], 'type'],
    // Pérák, OHC, Kývačka
    [
      'Osa kola (PŘEDNÍ), ZINEK - JAWA 250/350 Pérák',
      'motojelinek',
      ['perak-250', 'perak-350'],
      'nickname',
    ],
    [
      'Ampérmetr 10A - JAWA Pérák, 500 OHC',
      'motojelinek',
      ['ohc-500', 'perak-250', 'perak-350'],
      'nickname',
    ],
    ['Ciferník Jawa 500 OHC šnek a 01', 'jawa-korda', ['ohc-500'], 'nickname'],
    [
      'Filtr sání Jawa 250 350 Pérák Kývačka chrom',
      'jawa-korda',
      ['kyvacka-250', 'kyvacka-350', 'perak-250', 'perak-350'],
      'nickname',
    ],
    ['Kryt klaksonu, CHROM - Kývačka', 'motojelinek', ['kyvacka-250', 'kyvacka-350'], 'nickname'],
    ['Sada těsnění Jawa 175/356 Kývačka', 'javarna', ['jawa-cz-175-356'], 'type'],
    ['k navaření Jawa čz 250/353 a 350/354', 'javarna', ['kyvacka-250', 'kyvacka-350'], 'type'],
    // Panelka, Sport, Californian
    [
      'Páčka klíče brzdy, ZINEK (90mm) - Panelka',
      'motojelinek',
      ['panelka-250-559', 'panelka-250-592', 'panelka-350-360'],
      'nickname',
    ],
    [
      'Nádstavec - držák krytu řetězu JAWA 250 Panelka',
      'motomax',
      ['panelka-250-559', 'panelka-250-592'],
      'nickname',
    ],
    [
      'Mazací kolínko kyvné vidlice - JAWA 350 Kývačka, Panelka',
      'motojelinek',
      ['kyvacka-350', 'panelka-350-360'],
      'nickname',
    ],
    [
      'Kryt řetězu Jawa Panelka 250, 350 - 559, 592, 360',
      'motomax',
      ['panelka-250-559', 'panelka-250-592', 'panelka-350-360'],
      'type',
    ],
    [
      'Jawa 250/350 Panelka 559/360 na Vape',
      'jawa-korda',
      ['panelka-250-559', 'panelka-350-360'],
      'type',
    ],
    [
      'Záchyt reakce JAWA Sport 590, 361 -zinek',
      'motomax',
      ['sport-250-590', 'sport-350-361'],
      'type',
    ],
    [
      'Kryt řetězu (CZ) - JAWA 350 Californian',
      'motojelinek',
      ['californian-362', 'sport-350-361'],
      'nickname',
    ],
    [
      'blatník Jawa Californian',
      'jawa-korda',
      ['californian-362', 'sport-250-590', 'sport-350-361'],
      'nickname',
    ],
    // 350 63x a rozsahy
    [
      'Blinkr, PRAVÝ (JAWA) - JAWA 350 634-640',
      'motojelinek',
      ['jawa-350-634', 'jawa-350-638', 'jawa-350-639', 'jawa-350-640'],
      'type',
    ],
    [
      'Čep rozety Jawa 350 634 - 640 nový',
      'jawa-korda',
      ['jawa-350-634', 'jawa-350-638', 'jawa-350-639', 'jawa-350-640'],
      'type',
    ],
    [
      'Sada misek řízení s ložiskem JAWA350 - 634, 638, 639, 640',
      'motomax',
      ['jawa-350-634', 'jawa-350-638', 'jawa-350-639', 'jawa-350-640'],
      'type',
    ],
    ['Držák přístrojů - Jawa 350 638-639', 'motojelinek', ['jawa-350-638', 'jawa-350-639'], 'type'],
    ['Bowden přední brzdy - Velorex 350 (3-kolový)', 'motojelinek', ['velorex-350'], 'nickname'],
    // ČZ
    [
      'Bakelitový kryt baterie s víkem - ČZ 125 B,T',
      'motojelinek',
      ['cz-125-b', 'cz-125-t'],
      'type',
    ],
    ['kola ČZ 125/150C', 'x', ['cz-125-c', 'cz-150-c'], 'type'],
    ['stupaček ČZ 125T, 150 C - nerez', 'motokramek', ['cz-125-t', 'cz-150-c'], 'type'],
    [
      'Hřídel startovací ČZ 125,175 typ  476, 477, 487, 488 - dovoz',
      'motokramek',
      ['cz-125-476', 'cz-125-488', 'cz-175-477', 'cz-175-487'],
      'type',
    ],
    [
      'Kolo ozubené 16z, 3rychl. - ČZ 476-488',
      'motojelinek',
      ['cz-125-476', 'cz-125-488', 'cz-175-477', 'cz-175-487'],
      'type',
    ],
    [
      'Karburátor ČZ 250/471, 350/472, 125/477',
      'javarna',
      ['cz-125-476', 'cz-175-477', 'cz-250-471', 'cz-350-472'].filter((s) => s !== 'cz-125-476'),
      'type',
    ],
    ['Držák sedla ČZ - kulatý rám', 'motokramek', [], 'brand'],
    ['Přední světlo ČZ 150 Miss Kevelos', 'x', ['cz-150-miss'], 'nickname'],
    ['Čep klikové hřídele, LEVÝ - ČZ 125/175', 'motojelinek', [], 'displacement'],
    ['Těsnění pod hlavu Al otvor 60mm x 0,5mm JAWA/ČZ-175/350  *M', 'motomax', [], 'displacement'],
    // Čezeta
    ['Guma krytu zadní rozety - ČZ 502', 'motojelinek', ['cezeta-502'], 'type'],
    ['Skútr Čezeta 501.01 Prase, čokoláda', 'motomax', ['cezeta-501'], 'type'],
    ['Řetěz pro Čezeta', 'x', ['cezeta-501', 'cezeta-502'], 'nickname'],
    ['Řetěz pro Čezetu 125', 'x', [], 'brand'],
    // Babetta
    [
      'Kryt řetězu (ČERNÝ) - Babetta 210, 225',
      'motojelinek',
      ['babetta-210', 'babetta-225'],
      'type',
    ],
    [
      'Elektroinstalace (VAPE) - Babetta 207 228 206',
      'motojelinek',
      ['babetta-206', 'babetta-207', 'babetta-228'],
      'type',
    ],
    ['Řetěz Babetta134 zadní', 'x', ['babetta-134'], 'type'],
    [
      'Čelist těžká BABETTA 210, 225, Stella M134 (2ks sada)',
      'motomax',
      ['babetta-134', 'babetta-210', 'babetta-225'],
      'type',
    ],
    ['blatník BABETTA STAR 134, STELLA  *M', 'motomax', ['babetta-134'], 'nickname'],
    ['Bowden ZADNÍ BRZDA, DOMINO - Babetta', 'motojelinek', [], 'brand'],
    // bez shody, brand
    ['Ložisko 6302 2RS', 'motomax', [], null],
    ['Kulička d=6  BAB-225', 'motomax', [], null],
    ['Držák kontrolek tachometru - JAWA, ČZ', 'motojelinek', [], 'brand'],
    ['Čep klikové hřídele, středový - JAWA 350', 'motojelinek', [], 'displacement'],
    ['Píst BABETTA  40,25', 'motomax', [], 'brand'],
    [
      'Píst JAWA 50 - 05, 20, 21, 23  39,00 / 14,1',
      'motomax',
      ['mustang-23', 'pionyr-05', 'pionyr-20', 'pionyr-21'],
      'type',
    ],
    ['Kryt JAWA 350 640', 'motojelinek', ['jawa-350-640'], 'type'],
  ];

  it.each(cases)('%s', (name, shop, expectedSlugs, expectedLevel) => {
    expect(slugs(name, shop)).toEqual(expectedSlugs);
    expect(level(name, shop)).toBe(expectedLevel);
  });
});

describe('parseModels - pravidla', () => {
  it('Motojelinek bere modely jen za posledním " - "', () => {
    const result = parseModels('Hrdlo Jawa 550 sání - Babetta 210', { shopId: 'motojelinek' });
    expect(result.scope).toBe('Babetta 210');
    expect(result.models.map((m) => m.slug)).toEqual(['babetta-210']);
  });

  it('jiné shopy čtou celý název včetně částí před pomlčkou', () => {
    expect(slugs('Hrdlo Jawa 550 - sání', 'motomax')).toEqual(['pionyr-550']);
  });

  it('extractModelScope bez " - " vrací celý název', () => {
    expect(extractModelScope('Kryt JAWA 350 640', 'motojelinek')).toBe('Kryt JAWA 350 640');
  });

  it('holá čísla bez značky nikdy nevedou na model (551, 552, 90, 31, 11)', () => {
    expect(slugs('Kolo ozubené 23z, 550 mm, 551, 552')).toEqual([]);
    expect(slugs('Šroub 21 x 20, rozteč 05, 90')).toEqual([]);
    expect(level('Kolo II. 18z org.')).toBeNull();
    expect(level('Držák 90')).toBeNull();
  });

  it('rozsah se nerozvíjí mimo typy existující v seedu', () => {
    // 350 není typ, rozsah "350-640" se neexpanduje
    expect(slugs('Excentr JAWA 350 - 640', 'motomax')).toEqual(['jawa-350-640']);
  });

  it('250/350 bez přezdívky = displacement, bez vazby na generaci', () => {
    const result = parseModels('Píst Jawa 250/350');
    expect(result.level).toBe('displacement');
    expect(result.models).toEqual([]);
    expect(
      result.generic.filter((g) => g.level === 'displacement').map((g) => g.displacement),
    ).toEqual([250, 350]);
  });

  it('priorita type > nickname: každý model nese svou nejvyšší úroveň', () => {
    const result = parseModels('Kryt Jawa 350 Panelka, 634');
    const byLevel = Object.fromEntries(result.models.map((m) => [m.slug, m.level]));
    expect(byLevel['jawa-350-634']).toBe('type');
    expect(byLevel['panelka-350-360']).toBe('nickname');
    expect(result.level).toBe('type');
  });

  it('"354/06" mapuje na Kývačku 350 i první 350 Panelku (type)', () => {
    const result = parseModels('Katalog ND Jawa 350 354/06');
    expect(result.models.map((m) => [m.slug, m.level])).toEqual([
      ['kyvacka-350', 'type'],
      ['panelka-350-360', 'type'],
    ]);
  });

  it('"350 OHC" je moderní Jawa a nemapuje se, "500 OHC" ano', () => {
    expect(slugs('Lamela spojky, kovová (JAWA) - JAWA 350 OHC', 'motojelinek')).toEqual([]);
    expect(slugs('Kryt nádrže, LEVÝ (JAWA) - JAWA 350 634, 350 OHC', 'motojelinek')).toEqual([
      'jawa-350-634',
    ]);
    expect(slugs('Řetěz 100 čl. JAWA 500 OHC')).toEqual(['ohc-500']);
  });

  it('dvouciferné typy Péráku (11/12) jen s "typ"', () => {
    expect(slugs('přední úplný JAWA Pérák 11, 18 Komunista', 'motomax')).toEqual([
      'perak-250',
      'perak-350',
    ]);
    expect(slugs('Kryt Jawa 350 typ 12', 'motomax')).toEqual(['perak-350']);
  });

  it('písmena ČZ patří k objemům od posledního bloku písmen', () => {
    expect(slugs('ČZ 125, 150 B, T, C')).toEqual(['cz-125-b', 'cz-125-c', 'cz-125-t', 'cz-150-c']);
    expect(slugs('ČZ 125 a 175')).toEqual([]);
  });

  it('ukládá matched_text', () => {
    const result = parseModels('Bowden - Jawa 350 - 638, 639', { shopId: 'x' });
    expect(result.models.find((m) => m.slug === 'jawa-350-638')?.matchedText).toBe(
      'Jawa 350 - 638, 639',
    );
    expect(parseModels('Samolepka Mustang - rudá').models[0].matchedText).toBe('Mustang');
  });

  it('nerozřešené tokeny: neseedované ČZ typy a čísla', () => {
    const result = parseModels('Hřídel ČZ 125, 150 - 353a, 500');
    expect(result.unresolved.map((u) => u.token)).toEqual(['500']);
    expect(parseModels('Teleskop Jawa Babetta 209, 207').unresolved).toEqual([
      { kind: 'number', brand: 'Jawa/Babetta', token: '209' },
    ]);
  });

  it('neseedované přezdívky řetěz čísel nepřerušují', () => {
    const result = parseModels('pod válce Jawa 350 Pérák, Kývačka, Panelka, Calif, 634 1mm', {
      shopId: 'jawa-korda',
    });
    expect(result.models.map((m) => m.slug)).toContain('jawa-350-634');
    expect(result.unresolved).toContainEqual({ kind: 'nickname', brand: 'Jawa', token: 'calif' });
  });

  it('kvótované kódy původu (,,CZ) a *výrobce se ignorují, ,,ČZ 125 ne', () => {
    expect(level('(cena 1m)  ,,CZ', 'motomax')).toBeNull();
    expect(level('Pístní kroužek 39,75 STADION ,,CZ *Almet', 'motomax')).toBe('nickname');
    expect(slugs('s nýty  ,,ČZ 125 B', 'motomax')).toEqual(['cz-125-b']);
  });
});

describe('parseModels - závorky', () => {
  it('závorka jen se značkou je původ, ne model', () => {
    expect(level('Hřídel hlavní (CZ) karburátor', 'motomax')).toBeNull();
    expect(level('Páčka plechová s kuličkou (TWN/CZ), CHROM', 'motomax')).toBeNull();
  });

  it('závorka s čísly se čte normálně', () => {
    expect(slugs('(základní Jawa 50 - 550, 555 pravostranný karb.)', 'motomax')).toEqual([
      'pionyr-550',
      'pionyr-555',
    ]);
    expect(slugs('(náhrada Jawa 50 - 23 Mustang)', 'motomax')).toEqual(['mustang-23']);
  });
});

describe('parseModels - opravy 2026-10-01', () => {
  it.each([
    // Pérák 11 / 12 / 18
    ['přední úplný JAWA Pérák 11, 18 Komunista', 'motomax', ['perak-250', 'perak-350'], 'type'],
    ['s nýty  ,,JAWA PÉRÁK typ 11, 18 Komunista', 'motomax', ['perak-250', 'perak-350'], 'type'],
    ['hřídel Jawa 250/11 Pérák', 'x', ['perak-250'], 'type'],
    ['MOTORU JAWA 350/12 Ogar *M', 'motomax', ['perak-350'], 'type'],
    ['Kryt Jawa 350/18', 'x', ['perak-350'], 'type'],
    ['Písty Jawa 350 OGAR, 59,00mm', 'motomax', ['perak-350'], 'nickname'],
    ['Řetěz Ogar 59', 'x', [], null],
    // typ těsně před přezdívkou zužuje
    ['štítek Jawa 50 typ 20 Pionýr leptaný', 'jawa-korda', ['pionyr-20'], 'type'],
    ['štítek Jawa 50 typ 05 Pionýr leptaný', 'jawa-korda', ['pionyr-05'], 'type'],
    ['Kryt JAWA 353 Kývačka', 'x', ['kyvacka-250'], 'type'],
    ['štítek Jawa 350 typ 362 Californian , leptaný', 'jawa-korda', ['californian-362'], 'type'],
    ['Šrouby motoru Jawa 250 typ 559  Panelka', 'motokramek', ['panelka-250-559'], 'type'],
    // (základní Babetta) a Californian s typy
    ['Tryska M6 x 1 - 63 *JIKOV karb. (základní Babetta)', 'motomax', [], 'brand'],
    [
      'světla Jawa ČZ Californian 634 477 Pav dovoz',
      'jawa-korda',
      ['californian-362', 'cz-175-477', 'jawa-350-634', 'sport-250-590', 'sport-350-361'],
      'type',
    ],
    // Bizon, 632, rozsahy
    ['Typový štítek Jawa 350 633/02 Bizon', 'jawa-korda', ['jawa-350-633'], 'type'],
    ['Plakát Jawa 350 Bizon', 'motomax', ['jawa-350-633'], 'nickname'],
    ['Karburátor Jawa Bizon', 'x', ['jawa-250-623', 'jawa-350-633'], 'nickname'],
    ['Karburátor Jawa 350/632, 634 - D26', 'javarna', ['jawa-350-632', 'jawa-350-634'], 'type'],
    [
      'Tlumič Jawa 632-640',
      'x',
      ['jawa-350-632', 'jawa-350-634', 'jawa-350-638', 'jawa-350-639', 'jawa-350-640'],
      'type',
    ],
    // Jawa-ČZ 351/352, Jawa 90, Pařez, ČZ 180, Babetta 206/215
    [
      'cívka ČZ 125, 150 - JAWA-ČZ 351, 352',
      'motomax',
      ['jawa-cz-125-351', 'jawa-cz-150-352'],
      'type',
    ],
    ['cívka JAWA-ČZ 125/150 351/352', 'jawa-korda', ['jawa-cz-125-351', 'jawa-cz-150-352'], 'type'],
    ['Kabel Jawa 90 Cross', 'x', ['jawa-90-cross-trail'], 'nickname'],
    [
      'Kabel - JAWA 90, Cross, Roadster, Trail',
      'motojelinek',
      ['jawa-90-cross-trail', 'jawa-90-roadster'],
      'nickname',
    ],
    ['Kabel Jawa 90 typ 36', 'x', ['jawa-90-cross-trail'], 'type'],
    ['Kabel Cross', 'x', [], null],
    ['Sedlo pařez', 'x', ['pionyr-550', 'pionyr-555'], 'nickname'],
    ['příručka ČZ 125, 180 - 488.3, 487.3', 'motomax', ['cz-125-488', 'cz-175-487'], 'type'],
    ['teleskop Babetta 206, 215, 207', 'x', ['babetta-206', 'babetta-207', 'babetta-215'], 'type'],
  ] as [string, string, string[], string | null][])('%s', (name, shop, expected, expectedLevel) => {
    expect(slugs(name, shop)).toEqual(expected);
    expect(level(name, shop)).toBe(expectedLevel);
  });
});

describe('parseModels - Kývačka ve výčtu objemů', () => {
  it('Karburátor Jawa-ČZ 175, 250, 350 Kyvacka vede na 175, 250 i 350', () => {
    const result = slugs('Karburátor Jawa-ČZ 175, 250, 350 Kyvacka - D26 se sytičem', 'javarna');
    expect(result).toEqual(
      expect.arrayContaining(['jawa-cz-175-356', 'kyvacka-250', 'kyvacka-350']),
    );
    expect(result).not.toContain('velorex-350');
  });

  it('s Velorexem ve výčtu přibude velorex-350', () => {
    const result = slugs(
      'Karburátor Jawa-ČZ 175, 250, 350 Kyvačka, Panelka a Velorex - D26 se sytičem',
      'javarna',
    );
    expect(result).toEqual(
      expect.arrayContaining(['jawa-cz-175-356', 'kyvacka-250', 'kyvacka-350', 'velorex-350']),
    );
  });

  it('samotné Kývačka bez objemu je jen 250 a 350', () => {
    expect(slugs('Kryt klaksonu - Kývačka')).toEqual(['kyvacka-250', 'kyvacka-350']);
  });
});
