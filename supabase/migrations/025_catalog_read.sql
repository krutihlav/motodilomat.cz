-- 025: čtecí vrstva katalogu pro web (jen čtení, SECURITY INVOKER = platí RLS).
-- Anon vidí jen is_public nabídky shopů s public_listing (migrace 024).
-- Interní náhled (service role) předává p_internal = true a vidí shopy s internal_sync.

-- Dočasné kategorie podle klíčových slov v názvu (docs/decisions.md 2026-10-25).
create or replace function catalog_category(p_name text)
returns text
language sql immutable parallel safe
set search_path = public
as $$
  select case
    when n ~ 'karbur|tryska|soupatk|plovak|jehl' then 'karburator'
    when n ~ '\mpist|pistni krouz|krouzek pist|valec|hlav[ay] valce' then 'valec-pist'
    when n ~ 'klikov|lozisk|gufer|tesnen' then 'klikovka'
    when n ~ 'spojk' then 'spojka'
    when n ~ 'razen|prevod|ozuben|retez' then 'prevody'
    when n ~ 'vyfuk|tlumic vyf|koleno' then 'vyfuk'
    when n ~ 'zapalov|civk|stator|svick|kabel|svet|zarov|blinkr|spinac|prepinac|regul|akumul|bateri|houkac|klakson' then 'elektro'
    when n ~ 'brzd|celist|bowden|lank' then 'brzdy'
    when n ~ 'kolo|rafek|vyplet|duse|pneu|plast|naboj' then 'kola'
    when n ~ 'vidlic|tlumic|perov|pruzin' then 'vidlice'
    when n ~ 'nadrz|sedl|blatnik|kryt|stupac|stojan|riditk|packa|packy|rukojet|gumy' then 'ram-kryty'
    else 'nezarazene'
  end
  from (select dilna_norm(p_name) as n) x
$$;

create or replace view catalog_offers
with (security_invoker = true)
as
select
  sp.id,
  sp.shop_id,
  s.name as shop_name,
  sp.name,
  sp.price,
  coalesce(sp.in_stock, false) as in_stock,
  sp.url,
  sp.image_url,
  sp.part_id,
  sp.last_seen_at,
  catalog_category(sp.name) as category,
  s.public_listing,
  s.internal_sync
from shop_products sp
join shops s on s.id = sp.shop_id
where coalesce(sp.match_status, '') <> 'ignored'
  and sp.price > 0;

-- Viditelnost: anon = RLS (public_listing + is_public), interní = internal_sync.
create or replace function catalog_visible(p_internal boolean)
returns setof catalog_offers
language sql stable
set search_path = public
as $$
  select * from catalog_offers o
  where (p_internal and o.internal_sync) or (not p_internal and o.public_listing)
$$;

create or replace function catalog_stats(p_internal boolean default false)
returns table (offers int, shops int, in_stock int, last_seen timestamptz)
language sql stable
set search_path = public
as $$
  select count(*)::int, count(distinct shop_id)::int, count(*) filter (where in_stock)::int, max(last_seen_at)
  from catalog_visible(p_internal)
$$;

create or replace function catalog_shop_counts(p_internal boolean default false)
returns table (shop_id text, shop_name text, domain text, source_type text, offers int)
language sql stable
set search_path = public
as $$
  select o.shop_id, o.shop_name, s.domain, coalesce(s.source_type, 'feed'), count(*)::int
  from catalog_visible(p_internal) o join shops s on s.id = o.shop_id
  group by o.shop_id, o.shop_name, s.domain, s.source_type
  order by count(*) desc
$$;

-- Souhrn modelu: řádky kind='category'|'shop'|'total'.
create or replace function catalog_model_summary(p_slug text, p_internal boolean default false)
returns table (kind text, key text, label text, n int, in_stock int)
language sql stable
set search_path = public
as $$
  with o as (
    select distinct on (v.id) v.*
    from catalog_visible(p_internal) v
    join shop_product_models spm on spm.shop_product_id = v.id
    join models m on m.id = spm.model_id
    where m.slug = p_slug
  )
  select 'category', category, category, count(*)::int, count(*) filter (where in_stock)::int from o group by category
  union all
  select 'shop', shop_id, shop_name, count(*)::int, count(*) filter (where in_stock)::int from o group by shop_id, shop_name
  union all
  select 'total', 'total', 'total', count(*)::int, count(*) filter (where in_stock)::int from o
$$;

-- Díly (shluky) s nabídkami z aspoň 2 shopů pro model a kategorii.
create or replace function catalog_model_parts(
  p_slug text, p_internal boolean default false, p_category text default null, p_limit int default 6)
returns table (part_id uuid, slug text, name text, offers int, shops int, min_price int, max_price int, image_url text, image_shop text)
language sql stable
set search_path = public
as $$
  with o as (
    select distinct on (v.id) v.*
    from catalog_visible(p_internal) v
    join shop_product_models spm on spm.shop_product_id = v.id
    join models m on m.id = spm.model_id
    where m.slug = p_slug and v.part_id is not null
      and (p_category is null or v.category = p_category)
  ), all_offers as (
    select v.* from catalog_visible(p_internal) v where v.part_id in (select part_id from o)
  ), agg as (
    select a.part_id, count(*)::int offers, count(distinct a.shop_id)::int shops,
           min(a.price)::int min_price, max(a.price)::int max_price
    from all_offers a group by a.part_id having count(distinct a.shop_id) >= 2
  )
  select agg.part_id, p.slug, p.name, agg.offers, agg.shops, agg.min_price, agg.max_price,
    (select a.image_url from all_offers a where a.part_id = agg.part_id and a.image_url is not null order by a.price limit 1),
    (select a.shop_name from all_offers a where a.part_id = agg.part_id and a.image_url is not null order by a.price limit 1)
  from agg join parts p on p.id = agg.part_id
  order by agg.shops desc, agg.offers desc
  limit p_limit
$$;

-- Nabídky modelu (stránkování). Nabídky dílů s porovnáním (2+ shopy) lze vynechat.
create or replace function catalog_model_offers(
  p_slug text, p_internal boolean default false, p_category text default null,
  p_shops text[] default null, p_in_stock boolean default false, p_sort text default 'price_asc',
  p_limit int default 30, p_offset int default 0, p_exclude_compared boolean default true)
returns table (id uuid, shop_id text, shop_name text, name text, price int, in_stock boolean,
               url text, image_url text, part_id uuid, total int)
language sql stable
set search_path = public
as $$
  with compared as (
    select v.part_id from catalog_visible(p_internal) v
    where v.part_id is not null group by v.part_id having count(distinct v.shop_id) >= 2
  ), o as (
    select distinct on (v.id) v.*
    from catalog_visible(p_internal) v
    join shop_product_models spm on spm.shop_product_id = v.id
    join models m on m.id = spm.model_id
    where m.slug = p_slug
      and (p_category is null or v.category = p_category)
      and (p_shops is null or v.shop_id = any (p_shops))
      and (not p_in_stock or v.in_stock)
      and (not p_exclude_compared or v.part_id is null or v.part_id not in (select part_id from compared))
  )
  select o.id, o.shop_id, o.shop_name, o.name, o.price::int, o.in_stock, o.url, o.image_url, o.part_id,
         (count(*) over ())::int
  from o
  order by
    case when p_sort = 'price_desc' then o.price end desc nulls last,
    case when p_sort = 'name' then o.name end asc,
    o.price asc
  limit least(p_limit, 100) offset p_offset
$$;

-- Hledání: všechna slova dotazu (bez diakritiky, slova ≥5 znaků na 4písmenný kmen) musí být v názvu.
create or replace function catalog_search(p_query text, p_internal boolean default false, p_limit int default 200)
returns table (id uuid, shop_id text, shop_name text, name text, price int, in_stock boolean,
               url text, image_url text, part_id uuid)
language plpgsql stable
set search_path = public
as $$
declare
  stems text[];
begin
  select coalesce(array_agg(distinct case
      when w ~ '[0-9]' then '(^|[^0-9])' || regexp_replace(regexp_replace(w, '[.,]', '[.,]', 'g'), '^\[\.,\]|\[\.,\]$', '', 'g')
      when length(w) >= 5 then '\m' || left(w, 4)
      else '\m' || w || '\M' end), '{}')
    into stems
  from regexp_split_to_table(dilna_norm(left(p_query, 200)), '[^a-z0-9,.]+') w
  where length(regexp_replace(w, '[.,]', '', 'g')) >= 2;
  if cardinality(stems) = 0 then return; end if;

  return query
  select v.id, v.shop_id, v.shop_name, v.name, v.price::int, v.in_stock, v.url, v.image_url, v.part_id
  from catalog_visible(p_internal) v
  where (select bool_and(dilna_norm(v.name) ~ st) from unnest(stems) st)
  order by v.price
  limit least(p_limit, 300);
end;
$$;

grant execute on function catalog_category(text), catalog_visible(boolean), catalog_stats(boolean),
  catalog_shop_counts(boolean), catalog_model_summary(text, boolean),
  catalog_model_parts(text, boolean, text, int),
  catalog_model_offers(text, boolean, text, text[], boolean, text, int, int, boolean),
  catalog_search(text, boolean, int) to anon, authenticated;
grant select on catalog_offers to anon, authenticated;
