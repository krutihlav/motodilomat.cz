import { parseModels } from '../models/parseModels';

export type Side = 'left' | 'right' | 'both';
export type Position =
  'front' | 'rear' | 'front+rear' | 'side' | 'upper' | 'lower' | 'inner' | 'outer';

export type Size = 'large' | 'small' | 'long' | 'short';

export type OfferVariant = {
  /** Rozměry normalizované: "2.15x16\"", "m6x90", "59.50", "38.50mm", "15w". Víc hodnot odděleno mezerou. */
  dimension: string | null;
  voltage: string | null;
  side: Side | null;
  position: Position | null;
  finish: string | null;
  color: string | null;
  teeth: number | null;
  /** "36ks", "sada" (jen za modelem nebo v závorce; "Sada šroubů" je součást partType) */
  pack: string | null;
  size: Size | null;
  /** Odkaz na značku/výrobce z "*X" (kromě *M): "jikov", "dellorto", "pal", "sim". Víc hodnot oddělených mezerou. */
  ref: string | null;
  /** Kódy s číslicí (2926, 2924h, sha1616g, phbg19ds, f-876). Víc hodnot oddělených mezerou. */
  code: string | null;
};

export type ParsedOffer = {
  /** Bez diakritiky, lowercase, slova seřazená abecedně (nezávislé na pořadí). '' = nic nezbylo. */
  partType: string;
  variant: OfferVariant;
  qualityTags: string[];
};

export type ParseOfferOptions = { shopId?: string };

// ---------------------------------------------------------------------------
// Slovníky (všechno už foldované: bez diakritiky, lowercase)

/** Značky a přezdívky strojů, které parser modelů nemusí vždy odstranit. */
const VEHICLE_WORDS = new Set([
  'jawa',
  'cz',
  'babetta',
  'babeta',
  'simson',
  'pionyr',
  'perak',
  'kyvacka',
  'panelka',
  'stadion',
  'jawetta',
  'mustang',
  'stella',
  'pares',
  'ogar',
  'bizon',
  'calif',
  'libenak',
  'velorex',
  'cezeta',
  'skutr',
  'roadster',
  'cross',
  'trail',
  'ohc',
  'sport',
  'pařez',
  'parez',
  'dvoupaka',
  'jikov',
  'mz',
  'tatran',
  'manet',
  'betka',
  'korado',
  'star',
  'pav',
  'dkw',
]);

const STOPWORDS = new Set([
  'a',
  'i',
  's',
  'se',
  'pro',
  'na',
  'do',
  'od',
  'z',
  'ze',
  'v',
  'k',
  'ke',
  'o',
  'u',
  'po',
  'pod',
  'bez',
  'vc',
  'vcetne',
  'apod',
  'typ',
  'typy',
  'cislo',
  'cisla',
  'model',
  'cena',
  'tmave',
  'svetle',
  'ks',
  'mm',
  'ml',
  'cm',
  'm',
  'x',
  'ii',
  // jednotky a zbytky rozměrů
  'pl',
  'kc',
  'hz',
  'ccm',
  'kg',
  'ah',
  'cl',
  'km',
  'ba',
  'pvc',
  'vc',
]);

/** Výrobci/značky dílů -> tag mfr:<x> (značka zboží, ne stroje). */
const MANUFACTURERS = new Set([
  'zvl',
  'almet',
  'mitroc',
  'dellorto',
  'jikov',
  'hiflofiltro',
  'ram',
  'skf',
  'ina',
  'koyo',
  'ngk',
  'bosch',
  'brisk',
  'tesla',
  'ntn',
  'ybn',
  'ckr',
  'motomax',
]);

const SIDE_LEFT = /^(lev(y|a|e|ou|eho|ych)|levostran\w*)$/;
const SIDE_RIGHT = /^(prav(y|a|e|ou|eho|ych)|pravostran\w*)$/;

const POSITION_PREFIX: [RegExp, Exclude<Position, 'front+rear'>][] = [
  [/^(predn|prd$)/, 'front'],
  [/^(zadn|zad$)/, 'rear'],
  [/^bocn/, 'side'],
  [/^horn/, 'upper'],
  [/^doln/, 'lower'],
  [/^vnitrn/, 'inner'],
  [/^venkovn/, 'outer'],
];

const FINISH_WORDS: [RegExp, string][] = [
  [/^chrom/, 'chrome'],
  [/^(zinek|zinkovan|pozinkovan)/, 'zinc'],
  [/^nerez/, 'stainless'],
  [/^nikl/, 'nickel'],
  [/^lesten/, 'polished'],
  [/^lakovan/, 'painted'],
  [/^surov/, 'raw'],
  [/^eloxovan/, 'anodized'],
  [/^cernen/, 'blackened'],
];

const COLOR_STEMS: [string, string][] = [
  ['cern', 'black'],
  ['sed', 'grey'],
  ['bil', 'white'],
  ['cerven', 'red'],
  ['modr', 'blue'],
  ['zelen', 'green'],
  ['zlut', 'yellow'],
  ['hned', 'brown'],
  ['oranzov', 'orange'],
  ['stribrn', 'silver'],
  ['zlat', 'gold'],
  ['ruzov', 'pink'],
  ['fialov', 'purple'],
];
const COLOR_ENDINGS = /^(y|a|e|ou|ych|eho|ym)$/;

function colorOf(word: string): string | null {
  for (const [stem, color] of COLOR_STEMS) {
    if (word.startsWith(stem) && COLOR_ENDINGS.test(word.slice(stem.length))) return color;
  }
  return null;
}

const SIZE_STEMS: [RegExp, Size][] = [
  [/^velk(y|a|e|ou|ych)$/, 'large'],
  [/^mal(y|a|e|ou|ych)$/, 'small'],
  [/^dlouh(y|a|e|ou|ych)$/, 'long'],
  [/^kratk(y|a|e|ou|ych)$/, 'short'],
];

/** Země původu z kódu "*X"/",,X" (Motomax). */
const ORIGIN_CODES: Record<string, string> = {
  cz: 'origin-cz',
  cr: 'origin-cz',
  sk: 'origin-sk',
  tw: 'origin-tw',
  twn: 'origin-tw',
  it: 'origin-it',
  ind: 'origin-in',
  indie: 'origin-in',
  tur: 'origin-tr',
  tr: 'origin-tr',
  cina: 'origin-cn',
  cn: 'origin-cn',
};

const TAG_WORDS: [RegExp, string][] = [
  [/^(original|org)$/, 'original'],
  [/^nahrada$/, 'replacement'],
  [/^(repasovan|renovovan|regenerovan)/, 'refurbished'],
  [/^(novy|nova|nove)$/, 'new'],
  [/^(kompletni|upl\w*)$/, 'complete'],
  [/^zesilen/, 'reinforced'],
  [/^(cr|cesk[yae]|ceska)$/, 'origin-cz'],
  [/^(sk|slovensk[yae]|slovenska)$/, 'origin-sk'],
  [/^(indie|ind)$/, 'origin-in'],
  [/^(twn|tw|tajwan|taiwan)$/, 'origin-tw'],
];

// ---------------------------------------------------------------------------
// Pomocné

/** lowercase + bez diakritiky. */
export function foldText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase();
}

/** Nahradí první dosud nezablankovaný výskyt `needle` mezerami; `at` = jeho pozice (-1 = nenalezen). */
function blankFirst(text: string, needle: string): { text: string; at: number } {
  const at = needle ? text.indexOf(needle) : -1;
  if (at < 0) return { text, at };
  return {
    text: text.slice(0, at) + ' '.repeat(needle.length) + text.slice(at + needle.length),
    at,
  };
}

const VOWEL_END = /[aeiouy]$/;
const STEM_ENDINGS = [
  'ovych',
  'ovymi',
  'ovym',
  'ovou',
  'ovem',
  'ovi',
  'ymi',
  'ych',
  'ich',
  'ami',
  'emi',
  'ach',
  'ove',
  'ova',
  'ovy',
  'ovo',
  'eho',
  'iho',
  'emu',
  'ymu',
  'imu',
  'ym',
  'im',
  'ou',
  'em',
  'um',
  'ho',
  'mu',
];

/**
 * Lehký stemming češtiny pro partType: odřízne pádovou příponu / koncovou samohlásku
 * a sjednotí "-ek" -> "-k" (kolena/koleno/kolen -> kolen, paprsek/paprsky -> paprsk).
 * Kmen má vždy aspoň 3 znaky. Slova do 4 znaků se pravidlem neřeší, jen výčtem SHORT_FORMS
 * (pneu zůstane pneu, kryt kryt).
 */
const ABBREVIATIONS: Record<string, string> = { karb: 'karburator', bow: 'bowden' };

const SHORT_FORMS: Record<string, string> = {
  osa: 'os',
  osy: 'os',
  ose: 'os',
  osu: 'os',
  kolo: 'kol',
  kola: 'kol',
  kole: 'kol',
  kolu: 'kol',
  sady: 'sada',
  sade: 'sada',
  sadu: 'sada',
};

export function stemWord(input: string): string {
  const word = ABBREVIATIONS[input] ?? input;
  if (word.length <= 4) return SHORT_FORMS[word] ?? word;
  let stem = word;
  const ending = STEM_ENDINGS.find((e) => stem.endsWith(e) && stem.length - e.length >= 3);
  if (ending) stem = stem.slice(0, -ending.length);
  else if (VOWEL_END.test(stem) && stem.length - 1 >= 3) stem = stem.slice(0, -1);
  if (stem.length >= 5 && stem.endsWith('ek')) stem = `${stem.slice(0, -2)}k`;
  return stem;
}

/** Vyřízne všechny shody regexu z textu (nahradí mezerou) a vrátí je. */
function take(text: string, re: RegExp): { text: string; matches: RegExpExecArray[] } {
  const matches = [...text.matchAll(re)];
  if (matches.length === 0) return { text, matches: [] };
  return { text: text.replace(re, (m) => ' '.repeat(m.length)), matches };
}

/** Tokeny s číslicí, které nejsou kód dílu: množství s jednotkou, ordinály, kódy modelů, formát papíru. */
const NOT_A_CODE =
  /^(?:(?:cena|za)?\d{1,3}(?:\.\d{1,2})?(?:a|m|cm|mm|t|d|l|ml|kg|hr|klic|kus|typ|kont|valec|rychl)|\d{1,3}g|\d+x[a-z]*|\d+\.[a-z]+|a\d|[dl]\d+(?:mm)?|m\d{3}|mz\d+|s(?:11|22|23)|sv\d|bab?-?\d{3}|\d+-[a-z]+)$/;

const NUM = String.raw`\d+(?:[.,]\d+)?`;
const QUOTE = String.raw`["”″]`;
const NB = String.raw`(?<![a-z\d])`;

const normNum = (s: string) => s.replace(/,/g, '.').replace(/\s+/g, '');

/** Značka za čárkami ",,X": země původu / výrobce -> tag, jinak jen zahodí ",,". */
function popCommaMarkers(text: string, tags: Set<string>): string {
  return text.replace(/,,([^\s,"„“”]*)/g, (_, raw: string) => {
    const code = foldText(raw).replace(/[^a-z0-9]/g, '');
    if (ORIGIN_CODES[code]) {
      tags.add(ORIGIN_CODES[code]);
      return ' ';
    }
    if (MANUFACTURERS.has(code)) {
      tags.add(`mfr:${code}`);
      return ' ';
    }
    return ` ${raw}`;
  });
}

/**
 * Značka shopu "*X": *M = Motomax (výrobce), ostatní jsou odkaz na značku
 * ("*JIKOV karb.", "náhrada *SIM", "pro originál *PAL") -> `refs`, ne qualityTags.
 */
function popStarMarkers(text: string, tags: Set<string>, refs: Set<string>): string {
  return text.replace(/\*([^\s*,;()/]*)/g, (_, raw: string) => {
    const code = foldText(raw).replace(/[^a-z0-9]/g, '');
    if (code === 'm') tags.add('mfr:motomax');
    else if (code.startsWith('origi')) tags.add('original');
    else if (code) refs.add(code);
    return ' ';
  });
}

// ---------------------------------------------------------------------------

export function parseOfferName(name: string, options: ParseOfferOptions = {}): ParsedOffer {
  const tags = new Set<string>();
  const refs = new Set<string>();

  // 1) značka + model pryč (existující parser modelů)
  let original = name;
  let modelStart = Number.POSITIVE_INFINITY;
  const parsed = parseModels(name, { shopId: options.shopId });
  const hitTexts = [
    ...parsed.models.map((m) => m.matchedText),
    ...parsed.generic.map((g) => g.matchedText),
  ].sort((a, b) => b.length - a.length);
  for (const text of hitTexts) {
    // parser modelů občas pohltí navazující rozměry ("JAWA 50 - 05, 20 38,75 / 14,1")
    const modelPart = text.replace(/[\s/,]*\d+[.,]\d+(?:[\s/]+\d+[.,]\d+)*\s*$/, '');
    const blanked = blankFirst(original, modelPart);
    original = blanked.text;
    if (blanked.at >= 0) modelStart = Math.min(modelStart, blanked.at);
  }

  // 2) značky shopu: "*X", ",,X", "X na konci, -e-
  original = popStarMarkers(popCommaMarkers(original, tags), tags, refs);
  const grade = /\s"([A-Za-z0-9]{1,3})\s*$/.exec(original);
  if (grade) {
    tags.add(`grade:${grade[1].toLowerCase()}`);
    original = original.slice(0, grade.index);
  }
  if (/(^|\s)-e-(?=\s|$)/.test(original)) {
    tags.add('e-mark');
    original = original.replace(/(^|\s)-e-(?=\s|$)/g, ' ');
  }

  let text = foldText(original).replace(/[„“']/g, ' ');

  // 3) fráze
  let r = take(text, /bez povrchove upravy/g);
  text = r.text;
  const rawFinishPhrase = r.matches.length > 0;

  let side = null as Side | null;
  r = take(text, new RegExp(`${NB}[lp]\\s*[+/]\\s*[lp](?![a-z\\d])`, 'g'));
  text = r.text;
  if (r.matches.length > 0) side = 'both';

  // 4) číselné údaje: napětí, výkon, zuby, balení, jednotky, rozměry
  const dimensions: string[] = [];
  const unit = (re: RegExp, suffix: string) => {
    r = take(text, re);
    text = r.text;
    for (const m of r.matches) dimensions.push(`${normNum(m[1])}${suffix}`);
  };

  r = take(text, new RegExp(`${NB}(${NUM})\\s*v(?![a-z\\d])`, 'g'));
  text = r.text;
  const voltage = r.matches.length > 0 ? `${normNum(r.matches[0][1])}v` : null;

  unit(new RegExp(`${NB}(${NUM})\\s*w(?![a-z\\d])`, 'g'), 'w');
  unit(new RegExp(`${NB}(${NUM})\\s*km/h(?![a-z\\d])`, 'g'), 'kmh');
  unit(new RegExp(`${NB}(${NUM})\\s*hz(?![a-z\\d])`, 'g'), 'hz');
  unit(new RegExp(`${NB}(${NUM})\\s*ccm(?![a-z\\d])`, 'g'), 'ccm');
  unit(new RegExp(`${NB}(${NUM})\\s*kc(?![a-z\\d])`, 'g'), 'kc');
  unit(new RegExp(`${NB}(\\d+)\\s*pl(?![a-z\\d])\\.?`, 'g'), 'pl');
  unit(new RegExp(`${NB}(\\d+)\\s*cl(?![a-z\\d])\\.?`, 'g'), 'cl');
  unit(new RegExp(`${NB}(${NUM})\\s*ah(?![a-z\\d])`, 'g'), 'ah');
  unit(new RegExp(`${NB}(${NUM})\\s*kg(?![a-z\\d])`, 'g'), 'kg');
  unit(new RegExp(`${NB}(${NUM})\\s*ml(?![a-z\\d])`, 'g'), 'ml');
  unit(new RegExp(`${NB}(\\d{1,2}(?:[.,]\\d+)?)\\s*l(?![a-z\\d])`, 'g'), 'l');
  unit(new RegExp(`${NB}(${NUM})\\s*mm2(?![a-z\\d])`, 'g'), 'mm2');

  // patice žárovek a pojistek: Ba15d, Bay15d, P45t
  r = take(
    text,
    new RegExp(`${NB}(?:bay?|bax)\\d{1,2}[a-z]?(?![a-z\\d])|${NB}p\\d{2}t(?![a-z\\d])`, 'g'),
  );
  text = r.text;
  for (const m of r.matches) dimensions.push(m[0]);

  r = take(text, new RegExp(`${NB}(\\d+)\\s*(?:z(?![a-z\\d])|zubu)\\.?`, 'g'));
  text = r.text;
  const teeth = r.matches.length > 0 ? Number(r.matches[0][1]) : null;

  let pack: string | null = null;
  r = take(text, new RegExp(`(?<!\\d)(\\d+)\\s*ks(?![a-z\\d])`, 'g'));
  text = r.text;
  if (r.matches.length > 0) pack = `${r.matches[0][1]}ks`;

  // řetězy: 1/2 x 5/16, 1/2 x 5,2
  r = take(text, new RegExp(`${NB}\\d+/\\d+\\s*[x×]\\s*(?:\\d+/\\d+|${NUM})`, 'g'));
  text = r.text;
  for (const m of r.matches) dimensions.push(normNum(m[0]).replace(/×/g, 'x'));

  // závit: M6x90, M5 x 0,75, M3-190, M8
  r = take(text, new RegExp(`${NB}m\\d+(?:[.,]\\d+)?(?:\\s*[x×]\\s*${NUM}){1,2}(?:\\s*mm)?`, 'g'));
  text = r.text;
  for (const m of r.matches) dimensions.push(normNum(m[0]));
  r = take(text, new RegExp(`${NB}m\\d+(?:[.,]\\d+)?-\\d+(?![a-z\\d])`, 'g'));
  text = r.text;
  for (const m of r.matches) dimensions.push(normNum(m[0]));
  r = take(text, new RegExp(`${NB}m\\d{1,2}(?:[.,]\\d+)?(?:\\s*mm)?(?![a-z\\d])`, 'g'));
  text = r.text;
  for (const m of r.matches) dimensions.push(normNum(m[0]));

  // d=12mm, D-88mm, l=76mm, d-65
  r = take(text, new RegExp(`${NB}[dl]\\s*[=-]\\s*(${NUM})(?:\\s*mm)?(?![a-z\\d])`, 'g'));
  text = r.text;
  for (const m of r.matches) dimensions.push(normNum(m[0]).replace(/[=-]/g, ''));

  // 2,15 x 16", 41,50x2mm, 15 × 4mm, 19" x 2,25
  r = take(
    text,
    new RegExp(
      `${NUM}\\s*${QUOTE}?\\s*[x×]\\s*${NUM}\\s*${QUOTE}?(?:\\s*[x×]\\s*${NUM})?(?:\\s*mm)?`,
      'g',
    ),
  );
  text = r.text;
  for (const m of r.matches)
    dimensions.push(normNum(m[0]).replace(/[”″]/g, '"').replace(/×/g, 'x'));

  // pneumatiky: 3,00 - 12
  r = take(text, new RegExp(`${NB}\\d[.,]\\d{2}\\s*-\\s*\\d{2}(?![a-z\\d])`, 'g'));
  text = r.text;
  for (const m of r.matches) dimensions.push(normNum(m[0]));

  // palce, mm, Ø
  r = take(text, new RegExp(`${NB}(${NUM})\\s*${QUOTE}`, 'g'));
  text = r.text;
  for (const m of r.matches) dimensions.push(`${normNum(m[1])}"`);
  r = take(text, new RegExp(`(?:ø\\s*)?${NB}(${NUM})\\s*mm(?![a-z\\d])`, 'g'));
  text = r.text;
  for (const m of r.matches) dimensions.push(`${normNum(m[1])}mm`);

  // ložiska: 6202, 6306, 6202 2RS (jiná čtyřmístná čísla, např. karburátor 2926, jsou kódy)
  r = take(
    text,
    new RegExp(
      `${NB}(?:6\\d{3}(?:\\s*(?:2rs|rs|zz|2z))?|\\d{4}\\s*(?:2rs|rs|zz|2z))(?![a-z\\d])`,
      'g',
    ),
  );
  text = r.text;
  for (const m of r.matches) dimensions.push(m[0].replace(/\s+/g, '-'));

  // dvojice rozměrů pístu: 38,75 / 14,1
  r = take(text, new RegExp(`${NB}\\d+[.,]\\d+\\s*/\\s*\\d+[.,]\\d+(?![a-z\\d])`, 'g'));
  text = r.text;
  for (const m of r.matches) dimensions.push(normNum(m[0]));

  // průměry/objemy pístů: 58,25 / 59,50 (dvě desetinná místa)
  r = take(text, new RegExp(`${NB}\\d+[.,]\\d{2}(?![a-z\\d])`, 'g'));
  text = r.text;
  for (const m of r.matches) dimensions.push(normNum(m[0]));

  // 5) slova: varianty, kvalita; zbytek = partType
  const consumed = new Set<number>();
  const positions = new Set<Exclude<Position, 'front+rear'>>();
  let finish: string | null = rawFinishPhrase ? 'raw' : null;
  let color: string | null = null;
  let size: Size | null = null;

  // kódy s číslicí (2926, 2924h, sha1616g, f-876): písmena+číslice, nebo aspoň čtyři číslice;
  // bez množství s jednotkou (16A, 85g, 1m), označení modelů a velikostí papíru
  const codes = new Set<string>();
  for (const m of text.matchAll(/[a-z0-9]+(?:[-.][a-z0-9]+)*/g)) {
    const token = m[0];
    const mixed = /\d/.test(token) && /[a-z]/.test(token);
    const longNumber = /^\d{4,}$/.test(token);
    if (!(mixed || longNumber) || NOT_A_CODE.test(token)) continue;
    codes.add(token);
  }

  // tokeny s číslicí nejsou slova partType
  const words = [...text.matchAll(/[a-z0-9]+/g)]
    .filter((m) => !/\d/.test(m[0]))
    .map((m) => ({ word: m[0], at: m.index }));

  /** Je znak na pozici uvnitř závorky nebo za oddělovačem " - "? */
  const isTrailing = (at: number): boolean => {
    const before = text.slice(0, at);
    const depth = (before.match(/\(/g)?.length ?? 0) - (before.match(/\)/g)?.length ?? 0);
    return depth > 0 || /\s[-–—]\s/.test(before) || at > modelStart;
  };

  words.forEach(({ word, at }, i) => {
    if (SIDE_LEFT.test(word)) {
      side = side && side !== 'left' ? 'both' : 'left';
    } else if (SIDE_RIGHT.test(word)) {
      side = side && side !== 'right' ? 'both' : 'right';
    } else if (word === 'sada' || word === 'sady' || word === 'set') {
      // "Sada šroubů" je díl; "... JAWA 50 - sada" / "(sada)" je balení
      if (!isTrailing(at)) return;
      pack ??= 'sada';
    } else if (colorOf(word)) {
      color ??= colorOf(word);
    } else if (SIZE_STEMS.some(([re]) => re.test(word))) {
      size ??= SIZE_STEMS.find(([re]) => re.test(word))![1];
    } else {
      const pos = POSITION_PREFIX.find(([re]) => re.test(word));
      if (pos) {
        positions.add(pos[1]);
      } else {
        const fin = FINISH_WORDS.find(([re]) => re.test(word));
        if (fin) {
          finish ??= fin[1];
        } else {
          const tag = TAG_WORDS.find(([re]) => re.test(word));
          if (tag) tags.add(tag[1]);
          else if (MANUFACTURERS.has(word)) tags.add(`mfr:${word}`);
          else return;
        }
      }
    }
    consumed.add(i);
  });

  let position: Position | null = null;
  if (positions.has('front') && positions.has('rear')) position = 'front+rear';
  else if (positions.size > 0) position = [...positions][0];

  // partType: text bez závorek, bez variant/stop/vehicle slov a čísel, stemované
  const noParens = text
    .replace(/\([^)]*\)/g, (m) => ' '.repeat(m.length))
    .replace(/\([^)]*$/g, (m) => ' '.repeat(m.length));
  const typeWords = new Set<string>();
  words.forEach(({ word, at }, i) => {
    if (consumed.has(i) || word.length < 2) return;
    if (noParens[at] === ' ') return;
    if (STOPWORDS.has(word) || VEHICLE_WORDS.has(word)) return;
    typeWords.add(stemWord(word));
  });
  const partType = [...typeWords].sort().join(' ');

  return {
    partType,
    variant: {
      dimension: dimensions.length > 0 ? [...new Set(dimensions)].join(' ') : null,
      voltage,
      side,
      position,
      finish,
      color,
      teeth,
      pack,
      size,
      ref: refs.size > 0 ? [...refs].sort().join(' ') : null,
      code: codes.size > 0 ? [...codes].sort().join(' ') : null,
    },
    qualityTags: [...tags].sort(),
  };
}
