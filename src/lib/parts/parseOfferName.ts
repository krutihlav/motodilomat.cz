import { parseModels } from '../models/parseModels';

export type Side = 'left' | 'right' | 'both';
export type Position =
  'front' | 'rear' | 'front+rear' | 'side' | 'upper' | 'lower' | 'inner' | 'outer';

export type OfferVariant = {
  /** Rozměry normalizované: "2.15x16\"", "m6x90", "59.50", "38.50mm", "15w". Víc hodnot odděleno mezerou. */
  dimension: string | null;
  voltage: string | null;
  side: Side | null;
  position: Position | null;
  finish: string | null;
  color: string | null;
  teeth: number | null;
  /** "36ks", "sada" */
  pack: string | null;
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
]);

const SIDE_LEFT = new Set(['levy', 'leva', 'leve', 'levou', 'leveho', 'levych']);
const SIDE_RIGHT = new Set(['pravy', 'prava', 'prave', 'pravou', 'praveho', 'pravych']);

const POSITION_PREFIX: [RegExp, Exclude<Position, 'front+rear'>][] = [
  [/^predn/, 'front'],
  [/^zadn/, 'rear'],
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

const COLOR_WORDS: Record<string, string> = {
  cerny: 'black',
  cerna: 'black',
  cerne: 'black',
  cernou: 'black',
  sedy: 'grey',
  seda: 'grey',
  sede: 'grey',
  bily: 'white',
  bila: 'white',
  bile: 'white',
  cerveny: 'red',
  cervena: 'red',
  cervene: 'red',
  modry: 'blue',
  modra: 'blue',
  modre: 'blue',
  zeleny: 'green',
  zelena: 'green',
  zelene: 'green',
  zluty: 'yellow',
  zluta: 'yellow',
  zlute: 'yellow',
  hnedy: 'brown',
  hneda: 'brown',
  hnede: 'brown',
  oranzovy: 'orange',
  oranzova: 'orange',
  oranzove: 'orange',
  stribrny: 'silver',
  stribrna: 'silver',
  stribrne: 'silver',
};

const TAG_WORDS: [RegExp, string][] = [
  [/^(original|org)$/, 'original'],
  [/^nahrada$/, 'replacement'],
  [/^(repasovan|renovovan|regenerovan)/, 'refurbished'],
  [/^(novy|nova|nove)$/, 'new'],
  [/^(kompletni|upl)$/, 'complete'],
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

/** Nahradí první dosud nezablankovaný výskyt `needle` mezerami. */
function blankFirst(text: string, needle: string): string {
  const at = text.indexOf(needle);
  if (at < 0) return text;
  return text.slice(0, at) + ' '.repeat(needle.length) + text.slice(at + needle.length);
}

/** Vyřízne všechny shody regexu z textu (nahradí mezerou) a vrátí je. */
function take(text: string, re: RegExp): { text: string; matches: RegExpExecArray[] } {
  const matches = [...text.matchAll(re)];
  if (matches.length === 0) return { text, matches: [] };
  return { text: text.replace(re, (m) => ' '.repeat(m.length)), matches };
}

const NUM = String.raw`\d+(?:[.,]\d+)?`;
const QUOTE = String.raw`["”″]`;
const NB = String.raw`(?<![a-z\d])`;

const normNum = (s: string) => s.replace(/,/g, '.').replace(/\s+/g, '');

// ---------------------------------------------------------------------------

export function parseOfferName(name: string, options: ParseOfferOptions = {}): ParsedOffer {
  const tags = new Set<string>();

  // 1) značka + model pryč (existující parser modelů)
  let original = name;
  const parsed = parseModels(name, { shopId: options.shopId });
  const hitTexts = [
    ...parsed.models.map((m) => m.matchedText),
    ...parsed.generic.map((g) => g.matchedText),
  ].sort((a, b) => b.length - a.length);
  for (const text of hitTexts) {
    // parser modelů občas pohltí navazující rozměry ("JAWA 50 - 05, 20 38,75 / 14,1")
    const modelPart = text.replace(/[\s/,]*\d+[.,]\d+(?:[\s/]+\d+[.,]\d+)*\s*$/, '');
    original = blankFirst(original, modelPart);
  }

  // 2) značky shopu "*Výrobce", kódy původu ",,CZ"
  for (const m of original.matchAll(/\*(\S+)/g)) {
    const mfr = foldText(m[1]).replace(/[^a-z0-9]/g, '');
    if (MANUFACTURERS.has(mfr)) tags.add(`mfr:${mfr}`);
  }
  original = original.replace(/\*\S*/g, ' ').replace(/,,\S*/g, ' ');

  let text = foldText(original).replace(/[„“']/g, ' ');

  // 3) fráze
  let r = take(text, /bez povrchove upravy/g);
  text = r.text;
  const rawFinishPhrase = r.matches.length > 0;

  let side = null as Side | null;
  r = take(text, new RegExp(`${NB}[lp]\\s*\\+\\s*[lp](?![a-z\\d])`, 'g'));
  text = r.text;
  if (r.matches.length > 0) side = 'both';

  // 4) číselné údaje: napětí, výkon, zuby, balení, rozměry
  const dimensions: string[] = [];

  r = take(text, new RegExp(`${NB}(${NUM})\\s*v(?![a-z\\d])`, 'g'));
  text = r.text;
  const voltage = r.matches.length > 0 ? `${normNum(r.matches[0][1])}v` : null;

  r = take(text, new RegExp(`${NB}(${NUM})\\s*w(?![a-z\\d])`, 'g'));
  text = r.text;
  for (const m of r.matches) dimensions.push(`${normNum(m[1])}w`);

  r = take(text, new RegExp(`${NB}(\\d+)\\s*(?:z(?![a-z\\d])|zubu)\\.?`, 'g'));
  text = r.text;
  const teeth = r.matches.length > 0 ? Number(r.matches[0][1]) : null;

  let pack: string | null = null;
  r = take(text, new RegExp(`${NB}(\\d+)\\s*ks(?![a-z\\d])`, 'g'));
  text = r.text;
  if (r.matches.length > 0) pack = `${r.matches[0][1]}ks`;

  // závit: M6x90, M5 x 0,75, M3-190
  r = take(text, new RegExp(`${NB}m\\d+(?:[.,]\\d+)?(?:\\s*[x×]\\s*${NUM}){1,2}(?:\\s*mm)?`, 'g'));
  text = r.text;
  for (const m of r.matches) dimensions.push(normNum(m[0]));
  r = take(text, new RegExp(`${NB}m\\d+-\\d+(?![a-z\\d])`, 'g'));
  text = r.text;
  for (const m of r.matches) dimensions.push(normNum(m[0]));

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

  // palce, mm, Ø
  r = take(text, new RegExp(`${NB}(${NUM})\\s*${QUOTE}`, 'g'));
  text = r.text;
  for (const m of r.matches) dimensions.push(`${normNum(m[1])}"`);
  r = take(text, new RegExp(`(?:ø\\s*)?${NB}(${NUM})\\s*mm(?![a-z\\d])`, 'g'));
  text = r.text;
  for (const m of r.matches) dimensions.push(`${normNum(m[1])}mm`);

  // ložiska: 6202 2RS
  r = take(text, new RegExp(`${NB}\\d{4}(?:\\s*(?:2rs|rs|zz|2z))?(?![a-z\\d])`, 'g'));
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
  const full = [...text.matchAll(/[a-z]+/g)].map((m) => m[0]);
  const consumed = new Set<string>();
  const positions = new Set<Exclude<Position, 'front+rear'>>();
  let finish: string | null = rawFinishPhrase ? 'raw' : null;
  let color: string | null = null;

  for (const word of full) {
    if (SIDE_LEFT.has(word)) {
      side = side && side !== 'left' ? 'both' : 'left';
      consumed.add(word);
    } else if (SIDE_RIGHT.has(word)) {
      side = side && side !== 'right' ? 'both' : 'right';
      consumed.add(word);
    } else if (word === 'sada' || word === 'sady' || word === 'set') {
      pack ??= 'sada';
      consumed.add(word);
    } else if (COLOR_WORDS[word]) {
      color ??= COLOR_WORDS[word];
      consumed.add(word);
    } else {
      const pos = POSITION_PREFIX.find(([re]) => re.test(word));
      if (pos) {
        positions.add(pos[1]);
        consumed.add(word);
        continue;
      }
      const fin = FINISH_WORDS.find(([re]) => re.test(word));
      if (fin) {
        finish ??= fin[1];
        consumed.add(word);
        continue;
      }
      const tag = TAG_WORDS.find(([re]) => re.test(word));
      if (tag) {
        tags.add(tag[1]);
        consumed.add(word);
        continue;
      }
      if (MANUFACTURERS.has(word)) {
        tags.add(`mfr:${word}`);
        consumed.add(word);
      }
    }
  }

  let position: Position | null = null;
  if (positions.has('front') && positions.has('rear')) position = 'front+rear';
  else if (positions.size > 0) position = [...positions][0];

  // partType: text bez závorek, bez variant/stop/vehicle slov a čísel
  const noParens = text.replace(/\([^)]*\)/g, ' ').replace(/\([^)]*$/g, ' ');
  const typeWords = new Set<string>();
  for (const m of noParens.matchAll(/[a-z]+/g)) {
    const word = m[0];
    if (word.length < 2) continue;
    if (consumed.has(word) || STOPWORDS.has(word) || VEHICLE_WORDS.has(word)) continue;
    typeWords.add(word);
  }
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
    },
    qualityTags: [...tags].sort(),
  };
}
