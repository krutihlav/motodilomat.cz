import 'server-only';
import {catalogDb} from './db';
import type {CategoryKey} from './categories';

export type Offer = {
  id: string;
  shop_id: string;
  shop_name: string;
  name: string;
  price: number;
  in_stock: boolean;
  url: string;
  image_url: string | null;
  part_id: string | null;
};

export type Model = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  family: string;
  displacement: number | null;
  type_numbers: string[] | null;
  years: string | null;
};

export type PartSummary = {
  part_id: string;
  slug: string;
  name: string;
  offers: number;
  shops: number;
  min_price: number;
  max_price: number;
  image_url: string | null;
  image_shop: string | null;
};

function fail(what: string, error: {message: string} | null): never {
  throw new Error(`Katalog: ${what} selhalo: ${error?.message ?? 'neznámá chyba'}`);
}

export async function getStats() {
  const {sb, internal} = catalogDb();
  const {data, error} = await sb.rpc('catalog_stats', {p_internal: internal}).single();
  if (error) fail('statistiky', error);
  return data as {offers: number; shops: number; in_stock: number; last_seen: string | null};
}

export async function getShopCounts() {
  const {sb, internal} = catalogDb();
  const {data, error} = await sb.rpc('catalog_shop_counts', {p_internal: internal});
  if (error) fail('počty shopů', error);
  return (data ?? []) as {shop_id: string; shop_name: string; domain: string; source_type: string; offers: number}[];
}

export async function getModels(): Promise<Model[]> {
  const {sb} = catalogDb();
  const {data, error} = await sb
    .from('models')
    .select('id, slug, name, brand, family, displacement, type_numbers, years')
    .order('family')
    .order('name');
  if (error) fail('modely', error);
  return (data ?? []) as Model[];
}

export async function getModel(slug: string): Promise<Model | null> {
  const {sb} = catalogDb();
  const {data, error} = await sb
    .from('models')
    .select('id, slug, name, brand, family, displacement, type_numbers, years')
    .eq('slug', slug)
    .maybeSingle();
  if (error) fail('model', error);
  return (data as Model | null) ?? null;
}

export async function getModelSummary(slug: string) {
  const {sb, internal} = catalogDb();
  const {data, error} = await sb.rpc('catalog_model_summary', {p_slug: slug, p_internal: internal});
  if (error) fail('souhrn modelu', error);
  const rows = (data ?? []) as {kind: string; key: string; label: string; n: number; in_stock: number}[];
  const total = rows.find((r) => r.kind === 'total') ?? {n: 0, in_stock: 0};
  return {
    total: total.n,
    inStock: total.in_stock,
    categories: new Map(rows.filter((r) => r.kind === 'category').map((r) => [r.key as CategoryKey, r.n])),
    shops: rows
      .filter((r) => r.kind === 'shop')
      .map((r) => ({id: r.key, name: r.label, n: r.n}))
      .sort((a, b) => b.n - a.n),
  };
}

export async function getModelParts(slug: string, category: CategoryKey | null, limit = 6) {
  const {sb, internal} = catalogDb();
  const {data, error} = await sb.rpc('catalog_model_parts', {
    p_slug: slug,
    p_internal: internal,
    p_category: category,
    p_limit: limit,
  });
  if (error) fail('díly modelu', error);
  return (data ?? []) as PartSummary[];
}

export async function getModelOffers(params: {
  slug: string;
  category: CategoryKey | null;
  shops: string[] | null;
  inStock: boolean;
  sort: 'price_asc' | 'price_desc' | 'name';
  limit: number;
  offset: number;
}) {
  const {sb, internal} = catalogDb();
  const {data, error} = await sb.rpc('catalog_model_offers_v2', {
    p_slug: params.slug,
    p_internal: internal,
    p_category: params.category,
    p_shops: params.shops,
    p_in_stock: params.inStock,
    p_sort: params.sort,
    p_limit: params.limit,
    p_offset: params.offset,
  });
  if (error) fail('nabídky modelu', error);
  const rows = (data ?? []) as (Offer & {part_slug: string | null; total: number})[];
  return {offers: rows, total: rows[0]?.total ?? 0};
}

export type ModelPartRow = PartSummary & {in_stock: number; total: number};

/** Díly modelu se srovnáním cen (2+ e-shopy), stránkovaně. */
export async function getModelPartsPage(params: {
  slug: string;
  category: CategoryKey | null;
  shops: string[] | null;
  inStock: boolean;
  sort: 'price_asc' | 'price_desc' | 'name';
  limit: number;
  offset: number;
}) {
  const {sb, internal} = catalogDb();
  const {data, error} = await sb.rpc('catalog_model_parts_page', {
    p_slug: params.slug,
    p_internal: internal,
    p_category: params.category,
    p_shops: params.shops,
    p_in_stock: params.inStock,
    // výchozí řazení dílů: nejvíc e-shopů první
    p_sort: params.sort === 'price_asc' ? 'shops' : params.sort,
    p_limit: params.limit,
    p_offset: params.offset,
  });
  // dokud není migrace 028 v DB, funkce neexistuje (PGRST202) – stránka pak ukáže jen nabídky
  if (error && (error as {code?: string}).code === 'PGRST202') return {parts: [], total: 0};
  if (error) fail('díly modelu', error);
  const rows = (data ?? []) as ModelPartRow[];
  return {parts: rows, total: rows[0]?.total ?? 0};
}

export async function getPartOffers(partId: string): Promise<Offer[]> {
  const {sb, internal} = catalogDb();
  const {data, error} = await sb.rpc('catalog_visible', {p_internal: internal}).eq('part_id', partId).order('price');
  if (error) fail('nabídky dílu', error);
  return (data ?? []) as Offer[];
}

/** Nabídky dílu; nejbližší ceny první. */
export async function getPartBySlug(slug: string) {
  const {sb, internal} = catalogDb();
  const {data: part, error} = await sb
    .from('parts')
    .select('id, slug, name, part_type, variant, category')
    .eq('slug', slug)
    .maybeSingle();
  if (error) fail('díl', error);
  if (!part) return null;

  const [{data: offers, error: e2}, {data: fits, error: e3}] = await Promise.all([
    sb.rpc('catalog_visible', {p_internal: internal}).eq('part_id', part.id).order('price'),
    sb.from('part_models').select('models(id, slug, name, family, type_numbers)').eq('part_id', part.id),
  ]);
  if (e2) fail('nabídky dílu', e2);
  if (e3) fail('modely dílu', e3);

  const models = ((fits ?? []) as unknown as {models: Model | null}[])
    .map((f) => f.models)
    .filter((m): m is Model => Boolean(m));

  return {
    part: part as {id: string; slug: string; name: string; part_type: string | null; variant: Record<string, unknown> | null},
    offers: (offers ?? []) as Offer[],
    models,
  };
}

/** Podobné díly: stejný typ dílu na stejném modelu. */
export async function getRelatedParts(partId: string, partType: string | null, modelIds: string[]) {
  if (!partType || modelIds.length === 0) return [];
  const {sb} = catalogDb();
  const {data, error} = await sb
    .from('part_models')
    .select('parts!inner(id, slug, name, part_type)')
    .in('model_id', modelIds)
    .eq('parts.part_type', partType)
    .neq('part_id', partId)
    .limit(12);
  if (error) fail('podobné díly', error);
  const seen = new Set<string>();
  const out: {id: string; slug: string; name: string}[] = [];
  for (const row of (data ?? []) as unknown as {parts: {id: string; slug: string; name: string}}[]) {
    if (!seen.has(row.parts.id)) {
      seen.add(row.parts.id);
      out.push(row.parts);
    }
  }
  return out.slice(0, 3);
}

export async function searchOffers(q: string) {
  const {sb, internal} = catalogDb();
  const {data, error} = await sb.rpc('catalog_search', {p_query: q, p_internal: internal, p_limit: 200});
  if (error) fail('hledání', error);
  return (data ?? []) as Offer[];
}

export async function getPartsByIds(ids: string[]) {
  if (ids.length === 0) return [];
  const {sb} = catalogDb();
  const {data, error} = await sb.from('parts').select('id, slug, name').in('id', ids);
  if (error) fail('díly', error);
  return (data ?? []) as {id: string; slug: string; name: string}[];
}

/** Přiřazení modelů k nabídkám (pro filtr „Pro stroj“ ve výsledcích hledání). */
export async function getOfferFamilies(offerIds: string[]) {
  if (offerIds.length === 0) return new Map<string, Set<string>>();
  const {sb} = catalogDb();
  const out = new Map<string, Set<string>>();
  for (let i = 0; i < offerIds.length; i += 150) {
    const chunk = offerIds.slice(i, i + 150);
    const {data, error} = await sb
      .from('shop_product_models')
      .select('shop_product_id, models(family)')
      .in('shop_product_id', chunk);
    if (error) fail('modely nabídek', error);
    for (const row of (data ?? []) as unknown as {shop_product_id: string; models: {family: string} | null}[]) {
      if (!row.models) continue;
      const set = out.get(row.models.family) ?? new Set<string>();
      set.add(row.shop_product_id);
      out.set(row.models.family, set);
    }
  }
  return out;
}

export async function insertContactMessage(msg: {kind: string; shop_url: string | null; email: string; message: string | null}) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY chybí');
  const {createClient} = await import('@supabase/supabase-js');
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {auth: {persistSession: false}});
  const {error} = await sb.from('contact_messages').insert(msg);
  if (error) fail('uložení zprávy', error);
}
