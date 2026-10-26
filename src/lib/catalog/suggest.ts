import 'server-only';
import {catalogDb} from './db';
import {foldText} from '@/lib/parts/parseOfferName';

export type Suggestion =
  | {kind: 'model'; label: string; href: string; meta: string}
  | {kind: 'part'; label: string; href: string; meta: string; price: number; image: string | null};

type PartEntry = {slug: string; name: string; norm: string; minPrice: number; shops: number; image: string | null};
type ModelEntry = {slug: string; name: string; norm: string; family: string};

const TTL_MS = 10 * 60 * 1000;
let cache: {at: number; parts: PartEntry[]; models: ModelEntry[]} | null = null;

const norm = (s: string) => foldText(s).replace(/[^a-z0-9,.]+/g, ' ').trim();

/** Díly se srovnáním (2+ e-shopy) a modely. Drží se v paměti 10 minut – našeptávač musí být rychlý. */
async function load() {
  if (cache && Date.now() - cache.at < TTL_MS) return cache;
  const {sb, internal} = catalogDb();
  const offers: {part_id: string; shop_id: string; price: number; image_url: string | null}[] = [];
  for (let from = 0; ; from += 1000) {
    const {data, error} = await sb
      .rpc('catalog_visible', {p_internal: internal})
      .select('id, part_id, shop_id, price, image_url')
      .not('part_id', 'is', null)
      .order('id')
      .range(from, from + 999);
    if (error) throw new Error(`Našeptávač: nabídky selhaly: ${error.message}`);
    const rows = (data ?? []) as unknown as typeof offers;
    offers.push(...rows);
    if (rows.length < 1000) break;
  }
  const agg = new Map<string, {min: number; shops: Set<string>; image: string | null}>();
  for (const o of offers) {
    const a = agg.get(o.part_id) ?? {min: Infinity, shops: new Set<string>(), image: null};
    if (o.price < a.min) {
      a.min = o.price;
      a.image = o.image_url ?? a.image;
    }
    a.shops.add(o.shop_id);
    agg.set(o.part_id, a);
  }
  const ids = [...agg].filter(([, a]) => a.shops.size >= 2).map(([id]) => id);
  const parts: PartEntry[] = [];
  for (let i = 0; i < ids.length; i += 200) {
    const {data, error} = await sb.from('parts').select('id, slug, name').in('id', ids.slice(i, i + 200));
    if (error) throw new Error(`Našeptávač: díly selhaly: ${error.message}`);
    for (const p of data ?? []) {
      const a = agg.get(p.id as string)!;
      parts.push({slug: p.slug as string, name: p.name as string, norm: norm(p.name as string), minPrice: a.min, shops: a.shops.size, image: a.image});
    }
  }
  const {data: modelRows, error: me} = await sb.from('models').select('slug, name, family, aliases');
  if (me) throw new Error(`Našeptávač: modely selhaly: ${me.message}`);
  const models: ModelEntry[] = (modelRows ?? []).map((m) => ({
    slug: m.slug as string,
    name: m.name as string,
    family: m.family as string,
    norm: norm(`${m.name} ${m.family} ${((m.aliases as string[] | null) ?? []).join(' ')}`),
  }));
  cache = {at: Date.now(), parts, models};
  return cache;
}

/**
 * Shoda: každé slovo dotazu je začátkem některého slova textu. Čísla se navíc porovnávají i po
 * částech oddělených čárkou („05,20,21“ najde „20“), ale „38“ nenajde „638“.
 */
function matches(text: string, tokens: string[]): boolean {
  const words = text.split(' ');
  const parts = words.flatMap((w) => (w.includes(',') ? [w, ...w.split(',')] : [w]));
  return tokens.every((t) => parts.some((w) => w.startsWith(t)));
}

export async function suggest(q: string): Promise<Suggestion[]> {
  const tokens = norm(q.slice(0, 80)).split(' ').filter((t) => t.length >= 2 || /\d/.test(t));
  if (tokens.length === 0) return [];
  const {parts, models} = await load();
  const modelHits = models
    .filter((m) => matches(m.norm, tokens))
    .slice(0, 3)
    .map<Suggestion>((m) => ({kind: 'model', label: m.name, href: `/model/${m.slug}`, meta: m.family}));
  const partHits = parts
    .filter((p) => matches(p.norm, tokens))
    .sort((a, b) => b.shops - a.shops || a.minPrice - b.minPrice)
    .slice(0, 7)
    .map<Suggestion>((p) => ({
      kind: 'part',
      label: p.name,
      href: `/dil/${p.slug}`,
      meta: `${p.shops} ${p.shops < 5 ? 'e-shopy' : 'e-shopů'}`,
      price: p.minPrice,
      image: p.image,
    }));
  return [...modelHits, ...partHits];
}
