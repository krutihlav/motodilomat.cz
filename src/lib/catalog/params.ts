import {isCategoryKey, type CategoryKey} from './categories';

export type SearchParams = Record<string, string | string[] | undefined>;

export type ModelFilters = {
  category: CategoryKey | null;
  shops: string[] | null;
  inStock: boolean;
  sort: 'price_asc' | 'price_desc' | 'name';
  page: number;
};

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export function parseModelFilters(sp: SearchParams): ModelFilters {
  const kat = first(sp.kat);
  const shopsRaw = sp.shop === undefined ? [] : Array.isArray(sp.shop) ? sp.shop : [sp.shop];
  const shops = shopsRaw.filter((s) => /^[a-z0-9-]{1,40}$/.test(s));
  const sort = first(sp.razeni);
  const page = Number.parseInt(first(sp.strana) ?? '1', 10);
  return {
    category: isCategoryKey(kat) ? kat : null,
    shops: shops.length > 0 ? shops : null,
    inStock: first(sp.sklad) === '1',
    sort: sort === 'price_desc' || sort === 'name' ? sort : 'price_asc',
    page: Number.isFinite(page) && page > 0 && page < 500 ? page : 1,
  };
}

/** URL stránky modelu s upravenými filtry. */
export function modelHref(slug: string, f: ModelFilters, patch: Partial<ModelFilters>): string {
  const n = {...f, ...patch};
  const q = new URLSearchParams();
  if (n.category) q.set('kat', n.category);
  for (const s of n.shops ?? []) q.append('shop', s);
  if (n.inStock) q.set('sklad', '1');
  if (n.sort !== 'price_asc') q.set('razeni', n.sort);
  if (n.page > 1) q.set('strana', String(n.page));
  const qs = q.toString();
  return `/model/${slug}${qs ? `?${qs}` : ''}`;
}

export function firstParam(sp: SearchParams, key: string): string {
  return (first(sp[key]) ?? '').trim();
}
