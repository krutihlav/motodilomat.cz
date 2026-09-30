import { CANONICAL_MODELS, type CanonicalModel } from './seed';

/** Úrovně shody od nejsilnější: type > nickname > displacement > brand. */
export type MatchLevel = 'type' | 'nickname' | 'displacement' | 'brand';

const LEVEL_RANK: Record<MatchLevel, number> = { type: 4, nickname: 3, displacement: 2, brand: 1 };

/** Vazba na konkrétní kanonický model (level type | nickname). */
export type ModelHit = {
  slug: string;
  level: 'type' | 'nickname';
  matchedText: string;
};

/** Shoda bez vazby na konkrétní generaci (objem / jen značka). */
export type GenericHit = {
  level: 'displacement' | 'brand';
  brand: string;
  displacement?: number;
  matchedText: string;
};

export type UnresolvedToken = {
  kind: 'number' | 'nickname';
  /** Značka/značky, u kterých token stál ("ČZ", "Jawa/ČZ"), nebo '' bez kontextu. */
  brand: string;
  token: string;
};

export type ParseResult = {
  /** Nejvyšší dosažená úroveň, null = bez shody. */
  level: MatchLevel | null;
  models: ModelHit[];
  generic: GenericHit[];
  unresolved: UnresolvedToken[];
  /** Část názvu, ze které se modely četly. */
  scope: string;
};

export type ParseOptions = {
  shopId?: string;
  /** Pro testy; výchozí je CANONICAL_MODELS. */
  models?: readonly CanonicalModel[];
};

// ---------------------------------------------------------------------------
// Normalizace

/** lowercase + bez diakritiky, délka řetězce zůstává (kvůli matched_text). */
function fold(text: string): string {
  let out = '';
  for (const ch of text) {
    const base = ch.normalize('NFD')[0] ?? ch;
    out += base.length === ch.length ? base : ch;
  }
  return out.toLowerCase();
}

function foldAlias(alias: string): string {
  return fold(alias).replace(/\./g, '').replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// Slovníky

const BRAND_WORDS: Record<string, string> = {
  jawa: 'Jawa',
  cz: 'ČZ',
  babetta: 'Babetta',
  babeta: 'Babetta',
};

/** Slova, která se smějí přilepit k číslu (jawa350, cz175) - viz i relevanceFilter. */
const GLUE_PREFIXES = [
  'jawa',
  'cz',
  'babetta',
  'babeta',
  'pionyr',
  'stella',
  'perak',
  'kyvacka',
  'panelka',
  'mustang',
  'jawetta',
  'cezeta',
  'velorex',
  'stadion',
];
const GLUED_RE = new RegExp(`^(${GLUE_PREFIXES.join('|')})(\\d{2,3})$`);

/** Mezislova mezi značkou/přezdívkou a čísly ("Jawa 350 typ 634"). */
const FILLERS = new Set(['typ', 'typy', 'c', 'cislo', 'cisla', 'model', 'a']);

/**
 * Přezdívky, které nemapujeme na model (ověřit), ale chceme je vidět v reportu
 * nerozřešených tokenů. `brand` = token se počítá jen v kontextu té značky.
 */
const UNRESOLVED_NICKNAMES: { word: string; brand?: string }[] = [
  { word: 'californian' },
  { word: 'calif' },
  { word: 'libenak' },
  { word: 'ogar' },
  { word: 'bizon' },
  { word: 'stella' },
  { word: 'star', brand: 'Babetta' },
];

const ALLOWED_BETWEEN_NUMBERS = /^[\s,/\-.]*$/;

// ---------------------------------------------------------------------------
// Index modelů

type Index = {
  aliasToModels: Map<string, CanonicalModel[]>;
  /** největší počet slov aliasu */
  maxAliasWords: number;
  typeByBrand: Map<string, Map<string, CanonicalModel>>;
  displacementsByBrand: Map<string, Set<number>>;
};

const indexCache = new WeakMap<readonly CanonicalModel[], Index>();

function buildIndex(models: readonly CanonicalModel[]): Index {
  const cached = indexCache.get(models);
  if (cached) return cached;
  const aliasToModels = new Map<string, CanonicalModel[]>();
  const typeByBrand = new Map<string, Map<string, CanonicalModel>>();
  const displacementsByBrand = new Map<string, Set<number>>();
  let maxAliasWords = 1;
  for (const model of models) {
    for (const alias of model.aliases) {
      const key = foldAlias(alias);
      if (!key || /^typ \d+$/.test(key)) continue; // "typ 550" řeší číselná větev
      maxAliasWords = Math.max(maxAliasWords, key.split(' ').length);
      aliasToModels.set(key, [...(aliasToModels.get(key) ?? []), model]);
    }
    const types = typeByBrand.get(model.brand) ?? new Map<string, CanonicalModel>();
    for (const type of model.typeNumbers) types.set(type, model);
    typeByBrand.set(model.brand, types);
    if (model.displacement != null) {
      const set = displacementsByBrand.get(model.brand) ?? new Set<number>();
      set.add(model.displacement);
      displacementsByBrand.set(model.brand, set);
    }
  }
  const index = { aliasToModels, maxAliasWords, typeByBrand, displacementsByBrand };
  indexCache.set(models, index);
  return index;
}

// ---------------------------------------------------------------------------
// Tokenizace

type Token = {
  kind: 'BRAND' | 'NICK' | 'NUM' | 'WORD';
  text: string; // foldovaný text tokenu
  start: number;
  end: number;
  /** text mezi předchozím a tímto tokenem */
  sep: string;
  inParen: boolean;
  /** id závorkové skupiny (0 = mimo závorky) */
  paren: number;
  brand?: string;
  key?: string; // alias klíč u NICK
};

function tokenize(folded: string, index: Index): Token[] {
  const raw: Omit<Token, 'kind'>[] = [];
  const re = /[a-z0-9]+/g;
  let prevEnd = 0;
  let depth = 0;
  let parenId = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(folded)) !== null) {
    const sep = folded.slice(prevEnd, match.index);
    for (const ch of sep) {
      if (ch === '(') {
        if (depth === 0) parenId += 1;
        depth += 1;
      } else if (ch === ')') depth = Math.max(0, depth - 1);
    }
    const word = match[0];
    const glued = GLUED_RE.exec(word);
    if (glued) {
      const split = glued[1].length;
      raw.push({
        text: glued[1],
        start: match.index,
        end: match.index + split,
        sep,
        inParen: depth > 0,
        paren: depth > 0 ? parenId : 0,
      });
      raw.push({
        text: glued[2],
        start: match.index + split,
        end: match.index + word.length,
        sep: '',
        inParen: depth > 0,
        paren: depth > 0 ? parenId : 0,
      });
    } else {
      raw.push({
        text: word,
        start: match.index,
        end: match.index + word.length,
        sep,
        inParen: depth > 0,
        paren: depth > 0 ? parenId : 0,
      });
    }
    prevEnd = match.index + word.length;
  }

  const tokens: Token[] = [];
  for (let i = 0; i < raw.length; i += 1) {
    const cur = raw[i];
    // Vícesložkové aliasy ("jawetta sport", "jawa 90") mají přednost.
    let consumed = 0;
    for (let n = Math.min(index.maxAliasWords, raw.length - i); n >= 2 && !consumed; n -= 1) {
      const parts = raw.slice(i, i + n);
      if (!parts.slice(1).every((p) => /^\s+$/.test(p.sep))) continue;
      const key = parts.map((p) => p.text).join(' ');
      if (index.aliasToModels.has(key)) {
        tokens.push({
          kind: 'NICK',
          text: key,
          start: cur.start,
          end: parts[n - 1].end,
          sep: cur.sep,
          inParen: cur.inParen,
          paren: cur.paren,
          key,
        });
        consumed = n;
      }
    }
    if (consumed) {
      i += consumed - 1;
      continue;
    }
    if (/^\d+$/.test(cur.text)) {
      tokens.push({ ...cur, kind: 'NUM' });
    } else if (BRAND_WORDS[cur.text]) {
      tokens.push({ ...cur, kind: 'BRAND', brand: BRAND_WORDS[cur.text] });
    } else if (index.aliasToModels.has(cur.text)) {
      tokens.push({ ...cur, kind: 'NICK', key: cur.text });
    } else {
      tokens.push({ ...cur, kind: 'WORD' });
    }
  }
  return markNoiseParens(mergeStadionNumbers(tokens, index));
}

/**
 * Závorka jen se značkou - "(CZ)", "(JAWA)", "(TWN/CZ)" - je údaj o původu, ne o
 * modelu; značky a čísla v ní se ignorují. Závorka s čísly nebo přezdívkou
 * ("(základní Jawa 50 - 550, 555)") se čte normálně.
 */
function markNoiseParens(tokens: Token[]): Token[] {
  const groups = new Map<number, Token[]>();
  for (const tok of tokens) {
    if (tok.paren) groups.set(tok.paren, [...(groups.get(tok.paren) ?? []), tok]);
  }
  const noise = new Set<number>();
  for (const [id, group] of groups) {
    const only = group.every((t) => t.kind === 'BRAND' || t.kind === 'WORD');
    if (only && group.length <= 3 && group.some((t) => t.kind === 'BRAND')) noise.add(id);
  }
  return tokens.map((t) => ({ ...t, inParen: t.paren !== 0 && noise.has(t.paren) }));
}

const STADION_NUMBERS = new Set(['11', '22', '23']);

/**
 * "Stadion S 11/22", "Stadion 11/22" -> S11 a S22. Holé 11/22/23 jen hned za
 * přezdívkou Stadionu nebo za "S", jinak by to byly holá čísla.
 */
function mergeStadionNumbers(tokens: Token[], index: Index): Token[] {
  const isStadionKey = (key?: string) =>
    key !== undefined && (index.aliasToModels.get(key) ?? []).every((m) => m.family === 'Stadion');
  const out: Token[] = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const tok = tokens[i];
    const prev = out[out.length - 1];
    if (tok.kind === 'WORD' && tok.text === 's') {
      const next = tokens[i + 1];
      if (next && next.kind === 'NUM' && STADION_NUMBERS.has(next.text) && /^\s+$/.test(next.sep)) {
        const key = `s${next.text}`;
        if (index.aliasToModels.has(key)) {
          out.push({
            kind: 'NICK',
            text: key,
            start: tok.start,
            end: next.end,
            sep: tok.sep,
            inParen: tok.inParen,
            paren: tok.paren,
            key,
          });
          i += 1;
          continue;
        }
      }
    }
    if (
      tok.kind === 'NUM' &&
      STADION_NUMBERS.has(tok.text) &&
      prev &&
      prev.kind === 'NICK' &&
      isStadionKey(prev.key) &&
      /^\s*\/?\s*$/.test(tok.sep)
    ) {
      const key = `s${tok.text}`;
      if (index.aliasToModels.has(key)) {
        out.push({
          kind: 'NICK',
          text: key,
          start: tok.start,
          end: tok.end,
          sep: tok.sep,
          inParen: tok.inParen,
          paren: tok.paren,
          key,
        });
        continue;
      }
    }
    out.push(tok);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Výběr části názvu

/** Motojelinek: modely jsou za posledním " - ". Jinde (i bez " - ") celý název. */
export function extractModelScope(name: string, shopId?: string): string {
  if (shopId === 'motojelinek') {
    const at = name.lastIndexOf(' - ');
    if (at >= 0) return name.slice(at + 3).trim();
  }
  return name;
}

/**
 * Zahodí "*Výrobce" značky shopu a kvótované kódy původu ",,CZ"/",,IT"/",,TW"
 * (ne model). ",,ČZ 125/175" (značka + čísla) se ponechá.
 */
function cleanForParsing(text: string): string {
  return text
    .replace(/\*\S*/g, (m) => ' '.repeat(m.length))
    .replace(/,,(?!(?:CZ|ČZ)\s+\S)[A-Za-zČčŽž]{1,3}(?![A-Za-zČčŽž0-9])/g, (m) =>
      ' '.repeat(m.length),
    )
    .replace(/[„“”"']/g, ' ');
}

// ---------------------------------------------------------------------------
// Parser

type Ctx = {
  brands: Set<string>;
  scopeD: Set<number>;
  startOffset: number;
  lastKind: 'BRAND' | 'NICK' | 'NUM';
};

type NickMention = {
  key: string;
  start: number;
  end: number;
  text: string;
  scopeD: Set<number>;
  adjD: Set<number>;
  suppressed: boolean;
  /** index v seznamu tokenů následujícího NICK tokenu přes samé mezery */
  nextNickKey: string | null;
};

export function parseModels(name: string, options: ParseOptions = {}): ParseResult {
  const models = options.models ?? CANONICAL_MODELS;
  const index = buildIndex(models);
  const scopeText = extractModelScope(name, options.shopId);
  const original = cleanForParsing(scopeText);
  const folded = fold(original);
  const tokens = tokenize(folded, index);
  const textOf = (from: number, to: number) => scopeText.slice(from, to).trim();

  const typeHits = new Map<string, ModelHit>();
  const nickMentions: NickMention[] = [];
  const generic: GenericHit[] = [];
  const brandHits = new Map<string, GenericHit>();
  const unresolved: UnresolvedToken[] = [];

  const brandsLabel = (ctx: Ctx | null) => (ctx ? [...ctx.brands].join('/') : '');
  const typeModel = (text: string, brands: Set<string>): CanonicalModel | undefined => {
    for (const brand of brands) {
      const hit = index.typeByBrand.get(brand)?.get(text);
      if (hit) return hit;
    }
    return undefined;
  };
  const isDisplacement = (text: string, brands: Set<string>): number | null => {
    if (text.startsWith('0')) return null;
    const value = Number(text);
    for (const brand of brands) {
      if (index.displacementsByBrand.get(brand)?.has(value)) return value;
    }
    return null;
  };
  const isValid = (text: string, brands: Set<string>) =>
    typeModel(text, brands) !== undefined || isDisplacement(text, brands) !== null;

  let ctx: Ctx | null = null;
  const licensed = new Set<number>();
  let lastNick: NickMention | null = null;

  for (let i = 0; i < tokens.length; i += 1) {
    const tok = tokens[i];
    if (tok.inParen && (tok.kind === 'BRAND' || tok.kind === 'NUM')) continue;

    const chainable = ctx !== null && ALLOWED_BETWEEN_NUMBERS.test(tok.sep);

    if (tok.kind === 'BRAND') {
      const brand = tok.brand!;
      if (!brandHits.has(brand)) {
        brandHits.set(brand, { level: 'brand', brand, matchedText: textOf(tok.start, tok.end) });
      }
      if (ctx && chainable && ctx.lastKind === 'BRAND') {
        ctx.brands.add(brand);
      } else {
        ctx = {
          brands: new Set([brand]),
          scopeD: new Set(),
          startOffset: tok.start,
          lastKind: 'BRAND',
        };
      }
      lastNick = null;
      continue;
    }

    if (tok.kind === 'NICK') {
      const nickModels = index.aliasToModels.get(tok.key!)!;
      const brands = new Set(nickModels.map((m) => m.brand));
      if (ctx && chainable) {
        for (const brand of brands) ctx.brands.add(brand);
      } else {
        ctx = { brands, scopeD: new Set(), startOffset: tok.start, lastKind: 'NICK' };
      }
      ctx.lastKind = 'NICK';
      const mention: NickMention = {
        key: tok.key!,
        start: tok.start,
        end: tok.end,
        text: textOf(tok.start, tok.end),
        scopeD: new Set(ctx.scopeD),
        adjD: new Set(),
        suppressed: false,
        nextNickKey: null,
      };
      // Nelicencované číslo hned před přezdívkou: "500 OHC".
      const prev = tokens[i - 1];
      if (
        prev &&
        prev.kind === 'NUM' &&
        !licensed.has(i - 1) &&
        !prev.inParen &&
        /^\s+$/.test(tok.sep) &&
        !tok.inParen
      ) {
        const value = Number(prev.text);
        if (!prev.text.startsWith('0') && nickModels.some((m) => m.displacement === value)) {
          mention.adjD.add(value);
        }
      }
      // Specifičtější alias hned za obecným ("Stadion S22") obecný potlačí.
      if (lastNick && /^\s+$/.test(tok.sep) && lastNick.end <= tok.start) {
        lastNick.nextNickKey = tok.key!;
      }
      nickMentions.push(mention);
      lastNick = mention;
      continue;
    }

    if (tok.kind === 'WORD') {
      const unresolvedNick = UNRESOLVED_NICKNAMES.find(
        (n) => n.word === tok.text && (!n.brand || ctx?.brands.has(n.brand)),
      );
      if (unresolvedNick) {
        // Neseedovaná přezdívka: zapsat do reportu, ale řetěz čísel nepřerušuje.
        unresolved.push({ kind: 'nickname', brand: brandsLabel(ctx), token: tok.text });
        continue;
      }
      if (ctx && FILLERS.has(tok.text) && chainable) continue;
      ctx = null;
      lastNick = null;
      continue;
    }

    // --- NUM: skupina čísel, jen s kontextem značky/přezdívky ---
    if (!ctx || !chainable) {
      continue;
    }
    const brands = ctx.brands;
    type Item = { idx: number; text: string; typ: boolean };
    const items: Item[] = [];
    let sawTyp = false;
    let j = i;
    let endTok = i;
    while (j < tokens.length) {
      const t = tokens[j];
      if (t.kind === 'WORD' && FILLERS.has(t.text) && ALLOWED_BETWEEN_NUMBERS.test(t.sep)) {
        if (t.text === 'typ' || t.text === 'typy') sawTyp = true;
        j += 1;
        continue;
      }
      if (t.kind !== 'NUM' || t.inParen) break;
      if (j > i && !ALLOWED_BETWEEN_NUMBERS.test(t.sep)) break;
      const next = tokens[j + 1];
      const decimal =
        next &&
        next.kind === 'NUM' &&
        next.sep === ',' &&
        next.text.length <= 2 &&
        !isValid(t.text, brands);
      if (decimal) {
        j += 2; // 58,25 / 39,00 - rozměr, ne číslo typu
        endTok = j - 1;
        continue;
      }
      items.push({ idx: j, text: t.text, typ: sawTyp });
      licensed.add(j);
      endTok = j;
      j += 1;
    }
    if (items.length === 0) {
      continue;
    }

    const span = textOf(ctx.startOffset, tokens[endTok].end);
    const firstSepWhitespace = /^\s+$/.test(tokens[items[0].idx].sep);
    const resolvedAsType: boolean[] = [];

    for (let k = 0; k < items.length; k += 1) {
      const item = items[k];
      const tokenObj = tokens[item.idx];
      const prevItem = items[k - 1];
      // Rozsah "638-640": bez mezer kolem pomlčky, oba konce typy stejné řady.
      const isRangeEnd =
        prevItem !== undefined && /^\s*-\s*$/.test(tokenObj.sep) && item.idx === prevItem.idx + 1;
      if (isRangeEnd) {
        const from = typeModel(prevItem.text, brands);
        const to = typeModel(item.text, brands);
        const lo = Number(prevItem.text);
        const hi = Number(item.text);
        if (from && to && from.family === to.family && lo < hi) {
          for (const model of models) {
            if (model.family !== from.family || model.brand !== from.brand) continue;
            for (const type of model.typeNumbers) {
              const value = Number(type);
              if (value > lo && value < hi) {
                typeHits.set(model.slug, { slug: model.slug, level: 'type', matchedText: span });
              }
            }
          }
        }
      }
      const model = typeModel(item.text, brands);
      // Dvouciferné typy mimo řadu Jawa 50 (Pérák 11/12) jen s "typ" - jinak by
      // "Pérák 11, 18" byly rozměry.
      const weak =
        model !== undefined && item.text.length <= 2 && model.family !== 'Jawa 50' && !item.typ;
      if (weak) {
        resolvedAsType.push(false);
        continue;
      }
      if (model) {
        typeHits.set(model.slug, { slug: model.slug, level: 'type', matchedText: span });
        resolvedAsType.push(true);
        continue;
      }
      resolvedAsType.push(false);
      const displacement = isDisplacement(item.text, brands);
      if (displacement !== null) {
        ctx.scopeD.add(displacement);
        for (const brand of brands) {
          if (index.displacementsByBrand.get(brand)?.has(displacement)) {
            generic.push({ level: 'displacement', brand, displacement, matchedText: span });
          }
        }
        if (lastNick && ctx.lastKind === 'NICK' && firstSepWhitespace)
          lastNick.adjD.add(displacement);
        continue;
      }
      if (item.text.length >= 3) {
        unresolved.push({ kind: 'number', brand: brandsLabel(ctx), token: item.text });
      }
    }

    // "Pionýr 05, 20, 21" - čísla hned za přezdívkou ji upřesňují, přezdívka sama se neexpanduje.
    if (lastNick && ctx.lastKind === 'NICK' && firstSepWhitespace && resolvedAsType.some(Boolean)) {
      lastNick.suppressed = true;
    }
    ctx.lastKind = 'NUM';
    i = endTok;
  }

  // --- Výsledné vazby přes přezdívky ---
  const nickHits = new Map<string, ModelHit>();
  for (const mention of nickMentions) {
    if (mention.suppressed) continue;
    const all = index.aliasToModels.get(mention.key)!;
    if (mention.nextNickKey) {
      const next = index.aliasToModels.get(mention.nextNickKey)!;
      if (all.length >= next.length && next.every((m) => all.includes(m))) continue;
    }
    const wanted = mention.adjD.size > 0 ? mention.adjD : mention.scopeD;
    let selected = all;
    if (wanted.size > 0) {
      const filtered = all.filter((m) => m.displacement === null || wanted.has(m.displacement));
      if (filtered.length > 0) selected = filtered;
    }
    for (const model of selected) {
      if (!nickHits.has(model.slug)) {
        nickHits.set(model.slug, {
          slug: model.slug,
          level: 'nickname',
          matchedText: mention.text,
        });
      }
    }
  }

  const modelHits = new Map<string, ModelHit>(nickHits);
  for (const [slug, hit] of typeHits) modelHits.set(slug, hit); // type přebíjí nickname

  const result: ModelHit[] = [...modelHits.values()].sort((a, b) => a.slug.localeCompare(b.slug));
  const genericHits: GenericHit[] = [];
  const seenGeneric = new Set<string>();
  for (const hit of [...generic, ...brandHits.values()]) {
    const key = `${hit.level}|${hit.brand}|${hit.displacement ?? ''}`;
    if (seenGeneric.has(key)) continue;
    seenGeneric.add(key);
    genericHits.push(hit);
  }

  let level: MatchLevel | null = null;
  const consider = (candidate: MatchLevel) => {
    if (level === null || LEVEL_RANK[candidate] > LEVEL_RANK[level]) level = candidate;
  };
  for (const hit of result) consider(hit.level);
  for (const hit of genericHits) consider(hit.level);

  return { level, models: result, generic: genericHits, unresolved, scope: scopeText };
}
