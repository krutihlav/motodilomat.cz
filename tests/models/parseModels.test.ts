import {describe, expect, it} from 'vitest';
import {parseModels, extractModelScope} from '../../src/lib/models/parseModels';

const slugs = (name: string, shopId?: string) =>
  parseModels(name, {shopId}).models.map((m) => m.slug);
const level = (name: string, shopId?: string) => parseModels(name, {shopId}).level;

describe('parseModels - reálné názvy z DB', () => {
  // [název, shop, očekávané modely, úroveň]
  const cases: [string, string, string[], string | null][] = [
    // rozsahy
    ['Hřídel hlavní (CZ) - JAWA 550-555', 'motojelinek', ['pionyr-550', 'pionyr-555'], 'type'],
    ['Kryt řídítek, velký - JAWA 50 20-23', 'motojelinek', ['mustang-23', 'pionyr-20', 'pionyr-21'], 'type'],
    ['Labyrint ložiska (kliková hřídel) 12V - JAWA 350 638-640', 'motojelinek', ['jawa-350-638', 'jawa-350-639', 'jawa-350-640'], 'type'],
    ['Blinkr, PRAVÝ (JAWA) - JAWA 350 634-640', 'motojelinek', ['jawa-350-634', 'jawa-350-638', 'jawa-350-639', 'jawa-350-640'], 'type'],
    ['Kolo 16" NEREZ výplet - JAWA 50 05,20-23', 'motojelinek', ['mustang-23', 'pionyr-05', 'pionyr-20', 'pionyr-21'], 'type'],
    ['Krk řízení, CHROM (CZ) - Jawa 50 555,05,20', 'motojelinek', ['pionyr-05', 'pionyr-20', 'pionyr-555'], 'type'],
    // závorka = alias
    ['Elektroinstalace (30W) - JAWA 50 23 (Mustang)', 'motojelinek', ['mustang-23'], 'type'],
    // seznamy s čárkou
    ['Kryt řetězu (ČERNÝ) - Babetta 210, 225', 'motojelinek', ['babetta-210', 'babetta-225'], 'type'],
    ['Elektroinstalace (VAPE) - Babetta 207 228 206', 'motojelinek', ['babetta-207', 'babetta-228'], 'type'],
    ['Držák přístrojů - Jawa 350 638-639', 'motojelinek', ['jawa-350-638', 'jawa-350-639'], 'type'],
    ['Pant sedla - JAWA 50 550-555', 'motojelinek', ['pionyr-550', 'pionyr-555'], 'type'],
    // objemy + přezdívka
    ['Osa kola (PŘEDNÍ), ZINEK - JAWA 250/350 Pérák', 'motojelinek', ['perak-250', 'perak-350'], 'nickname'],
    ['Lamela spojky, kovová (JAWA) - JAWA 350 OHC', 'motojelinek', ['ohc-350'], 'nickname'],
    ['Ampérmetr 10A - JAWA Pérák, 500 OHC', 'motojelinek', ['ohc-500', 'perak-250', 'perak-350'], 'nickname'],
    ['Filtr sání Jawa 250 350 Pérák Kývačka chrom', 'jawa-korda', ['kyvacka-250', 'kyvacka-350', 'perak-250', 'perak-350'], 'nickname'],
    ['Guma masky paraboly JAWA Kývačka, Panelka (U profil)', 'motomax', ['kyvacka-175', 'kyvacka-250', 'kyvacka-350', 'panelka-250', 'panelka-350'], 'nickname'],
    ['Nádstavec - držák krytu řetězu JAWA 250 Panelka', 'motomax', ['panelka-250'], 'nickname'],
    // typ + přezdívka
    ['Panelka', 'x', ['panelka-250', 'panelka-350'], 'nickname'],
    ['Sada šroubů motoru Jawa 250 typ 559  Panelka', 'motokramek', ['jawa-250-559', 'panelka-250'], 'type'],
    // slepené tvary
    ['Sada misek řízení s ložiskem JAWA350 - 634, 638, 639, 640', 'motomax', ['jawa-350-634', 'jawa-350-638', 'jawa-350-639', 'jawa-350-640'], 'type'],
    ['Těsnění víka zapalování JAWA50 20/21/23 *M', 'motomax', ['mustang-23', 'pionyr-20', 'pionyr-21'], 'type'],
    ['Řetěz Babetta134 zadní', 'x', ['babetta-134'], 'type'],
    // malá čísla s kontextem
    ['Bowden rychlopalu JAWA 21, 23  *M', 'motomax', ['mustang-23', 'pionyr-21'], 'type'],
    ['Držák / kříž stupaček JAWA 50 - 05', 'motomax', ['pionyr-05'], 'type'],
    ['Kolo hlavní hřídele Pionýr 05, 20, 21, 23 - zinek', 'motokramek', ['mustang-23', 'pionyr-05', 'pionyr-20', 'pionyr-21'], 'type'],
    ['Držák zadního světla Jawa Pionýr 23 Mustang', 'motokramek', ['mustang-23'], 'type'],
    ['Kryt lanek Pionýr 550/555 - bez díry', 'motokramek', ['pionyr-550', 'pionyr-555'], 'type'],
    // nickname bez čísla
    ['Samolepka Mustang - rudá - sada', 'motokramek', ['mustang-23'], 'nickname'],
    ['Držák stojanu, CHROM - Jawetta', 'motojelinek', ['jawetta'], 'nickname'],
    ['Sedlo Jawetta Sport', 'x', ['jawetta-sport'], 'nickname'],
    ['Bowden přední brzdy - Stadion S22, Jawetta', 'motojelinek', ['jawetta', 'stadion-s22'], 'nickname'],
    ['Držák světlometu STADION S11 sada -zinek', 'motomax', ['stadion-s11'], 'nickname'],
    ['Držák bzučáku - Stadion, Jawetta', 'motojelinek', ['jawetta', 'stadion-s11', 'stadion-s22', 'stadion-s23'], 'nickname'],
    ['Ložisko řízení, věneček - S11', 'motojelinek', ['stadion-s11'], 'nickname'],
    ['Bowden přední brzdy - Velorex 350 (3-kolový)', 'motojelinek', ['velorex-350'], 'nickname'],
    ['Vratná pružina startovací hřídele Jawa-ČZ Kývačka', 'jawa-korda', ['kyvacka-175', 'kyvacka-250', 'kyvacka-350'], 'nickname'],
    // objem bez přezdívky / jen značka
    ['Čep klikové hřídele, středový - JAWA 350', 'motojelinek', [], 'displacement'],
    ['Těsnění pod hlavu Al otvor 60mm x 0,5mm JAWA/ČZ-175/350  *M', 'motomax', [], 'displacement'],
    ['Držák kontrolek tachometru - JAWA, ČZ', 'motojelinek', [], 'brand'],
    ['Bowden ZADNÍ BRZDA, DOMINO - Babetta', 'motojelinek', [], 'brand'],
    // bez shody / holá čísla
    ['Ložisko 6302 2RS', 'motomax', [], null],
    ['Kulička d=6  BAB-225', 'motomax', [], null],
    ['Tryska hlavní M4 x 0,7 - 95 Jawa, ČZ', 'motomax', [], 'brand'],
    // řádek bez " - " u motojelinku = celý název
    ['Kryt JAWA 350 640', 'motojelinek', ['jawa-350-640'], 'type'],
    // desetinná čísla nejsou typy
    ['Píst BABETTA  40,25', 'motomax', [], 'brand'],
    ['Píst JAWA 50 - 05, 20, 21, 23  39,00 / 14,1', 'motomax', ['mustang-23', 'pionyr-05', 'pionyr-20', 'pionyr-21'], 'type'],
    ['Pístní sada s kroužky 58,25,na čep 16 - Jawa 350', 'motojelinek', [], 'displacement'],
  ];

  it.each(cases)('%s', (name, shop, expectedSlugs, expectedLevel) => {
    expect(slugs(name, shop)).toEqual(expectedSlugs);
    expect(level(name, shop)).toBe(expectedLevel);
  });
});

describe('parseModels - pravidla', () => {
  it('Motojelinek bere modely jen za posledním " - "', () => {
    // "Jawa 550" před pomlčkou je název dílu, ne model.
    const result = parseModels('Hrdlo Jawa 550 sání - Babetta 210', {shopId: 'motojelinek'});
    expect(result.scope).toBe('Babetta 210');
    expect(result.models.map((m) => m.slug)).toEqual(['babetta-210']);
  });

  it('jiné shopy čtou celý název včetně částí před pomlčkou', () => {
    expect(slugs('Hrdlo Jawa 550 - sání', 'motomax')).toEqual(['pionyr-550']);
  });

  it('extractModelScope bez " - " vrací celý název', () => {
    expect(extractModelScope('Kryt JAWA 350 640', 'motojelinek')).toBe('Kryt JAWA 350 640');
  });

  it('holá čísla bez značky nikdy nevedou na model', () => {
    expect(slugs('Kolo ozubené 23z, 550 mm')).toEqual([]);
    expect(slugs('Šroub 21 x 20, rozteč 05')).toEqual([]);
    expect(level('Kolo II. 18z org.')).toBeNull();
  });

  it('rozsah se nerozvíjí mimo typy existující v seedu', () => {
    // 476 a 488 nejsou v seedu (ČZ), nic se nerozvine
    const result = parseModels('Kolo ozubené - ČZ 476-488');
    expect(result.models).toEqual([]);
    expect(result.level).toBe('brand');
  });

  it('250/350 bez přezdívky = displacement, bez vazby na generaci', () => {
    const result = parseModels('Píst Jawa 250/350');
    expect(result.level).toBe('displacement');
    expect(result.models).toEqual([]);
    expect(result.generic.filter((g) => g.level === 'displacement').map((g) => g.displacement)).toEqual([250, 350]);
  });

  it('priorita type > nickname > displacement > brand', () => {
    const result = parseModels('Kryt Jawa 350 Panelka 634');
    expect(result.level).toBe('type');
    const byLevel = Object.fromEntries(result.models.map((m) => [m.slug, m.level]));
    expect(byLevel['jawa-350-634']).toBe('type');
  });

  it('ukládá matched_text', () => {
    const result = parseModels('Bowden - Jawa 350 - 638, 639', {shopId: 'x'});
    expect(result.models.find((m) => m.slug === 'jawa-350-638')?.matchedText).toBe('Jawa 350 - 638, 639');
    const nick = parseModels('Samolepka Mustang - rudá');
    expect(nick.models[0].matchedText).toBe('Mustang');
  });

  it('nerozřešené tokeny: ČZ typy a neseedované přezdívky', () => {
    const cz = parseModels('Hřídel startovací ČZ 125,175 typ 476, 477, 487, 488 - dovoz');
    expect(cz.models).toEqual([]);
    expect(cz.unresolved.map((u) => u.token)).toEqual(['125', '175', '476', '477', '487', '488']);
    expect(cz.unresolved.every((u) => u.brand === 'ČZ')).toBe(true);
    const stella = parseModels('Čelist řadící BABETTA 210, 225, Stella M134');
    expect(stella.models.map((m) => m.slug)).toEqual(['babetta-210', 'babetta-225']);
    expect(stella.unresolved).toEqual([{kind: 'nickname', brand: 'Babetta', token: 'stella'}]);
    expect(parseModels('Kryt JAWA 350 Californian').unresolved).toEqual([
      {kind: 'nickname', brand: 'Jawa', token: 'californian'},
    ]);
  });

  it('Californian ani Sport nejsou aliasy modelů', () => {
    expect(slugs('Kryt řetězu (CZ) - JAWA 350 Californian', 'motojelinek')).toEqual([]);
  });
});

describe('parseModels - další pravidla z reálných dat', () => {
  it('rozsah i s mezerami kolem pomlčky: "634 - 640"', () => {
    expect(slugs('Čep rozety Jawa 350 634 - 640 nový', 'jawa-korda')).toEqual([
      'jawa-350-634', 'jawa-350-638', 'jawa-350-639', 'jawa-350-640',
    ]);
  });

  it('"350 - 640" není rozsah (350 není typ), jen typ 640', () => {
    expect(slugs('Excentr JAWA 350 - 640', 'motomax')).toEqual(['jawa-350-640']);
  });

  it('objem/typ se slashem: Jawa 50/550, 555', () => {
    expect(slugs('Píst Jawa 50/550, 555, Stadion 11/22, Jawetta 38,25 mm', 'jawa-korda')).toEqual([
      'jawetta', 'pionyr-550', 'pionyr-555', 'stadion-s11', 'stadion-s22',
    ]);
  });

  it('Stadion S 11/22 a S11/S22', () => {
    expect(slugs('dekompresoru Stadion S 11/22, Jawetta ZN', 'jawa-korda')).toEqual([
      'jawetta', 'stadion-s11', 'stadion-s22',
    ]);
    expect(slugs('Brzdový štít Stadion S11, S22, Jawetta', 'javarna')).toEqual([
      'jawetta', 'stadion-s11', 'stadion-s22',
    ]);
  });

  it('dvouciferné typy Péráku (11/12) jen s "typ"', () => {
    expect(slugs('přední úplný JAWA Pérák 11, 18 Komunista', 'motomax')).toEqual(['perak-250', 'perak-350']);
    expect(slugs('Kryt Jawa 350 typ 12', 'motomax')).toEqual(['perak-350']);
  });

  it('neseedované přezdívky řetěz čísel nepřerušují', () => {
    const result = parseModels('pod válce Jawa 350 Pérák, Kývačka, Panelka, Calif, 634 1mm', {shopId: 'jawa-korda'});
    expect(result.models.map((m) => m.slug)).toContain('jawa-350-634');
    expect(result.unresolved).toContainEqual({kind: 'nickname', brand: 'Jawa', token: 'calif'});
  });

  it('kvótované kódy původu (,,CZ) a *výrobce se ignorují', () => {
    expect(level('Pístní kroužek 39,75 STADION ,,CZ *Almet', 'motomax')).toBe('nickname');
    expect(level('(cena 1m)  ,,CZ', 'motomax')).toBeNull();
  });
});

describe('parseModels - závorky', () => {
  it('závorka jen se značkou je původ, ne model', () => {
    expect(level('Hřídel hlavní (CZ) karburátor', 'motomax')).toBeNull();
    expect(level('Páčka plechová s kuličkou (TWN/CZ), CHROM', 'motomax')).toBeNull();
  });

  it('závorka s čísly se čte normálně', () => {
    expect(slugs('(základní Jawa 50 - 550, 555 pravostranný karb.)', 'motomax')).toEqual(['pionyr-550', 'pionyr-555']);
    expect(slugs('(náhrada Jawa 50 - 23 Mustang)', 'motomax')).toEqual(['mustang-23']);
  });
});
