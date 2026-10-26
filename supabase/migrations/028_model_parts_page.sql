-- 028: stránka modelu – všechny díly se srovnáním cen (stránkovaně) a u nabídek odkaz na díl.
-- Bez DROP: nabídky se slugem dílu jsou nová funkce catalog_model_offers_v2
-- (původní catalog_model_offers zůstává beze změny).

create or replace function catalog_model_parts_page(
  p_slug text, p_internal boolean default false, p_category text default null,
  p_shops text[] default null, p_in_stock boolean default false, p_sort text default 'shops',
  p_limit int default 30, p_offset int default 0)
returns table (part_id uuid, slug text, name text, offers int, shops int, in_stock int,
               min_price int, max_price int, image_url text, image_shop text, total int)
language sql stable
set search_path = public
as $$
  with model_parts as (
    select distinct v.part_id
    from catalog_visible(p_internal) v
    join shop_product_models spm on spm.shop_product_id = v.id
    join models m on m.id = spm.model_id
    where m.slug = p_slug and v.part_id is not null
      and (p_category is null or v.category = p_category)
  ), offers as (
    select v.* from catalog_visible(p_internal) v
    where v.part_id in (select part_id from model_parts)
      and (p_shops is null or v.shop_id = any (p_shops))
      and (not p_in_stock or v.in_stock)
  ), agg as (
    select o.part_id, count(*)::int offers, count(distinct o.shop_id)::int shops,
           count(*) filter (where o.in_stock)::int in_stock,
           min(o.price)::int min_price, max(o.price)::int max_price
    from offers o group by o.part_id having count(distinct o.shop_id) >= 2
  )
  select agg.part_id, p.slug, p.name, agg.offers, agg.shops, agg.in_stock, agg.min_price, agg.max_price,
    (select o.image_url from offers o where o.part_id = agg.part_id and o.image_url is not null order by o.price limit 1),
    (select o.shop_name from offers o where o.part_id = agg.part_id and o.image_url is not null order by o.price limit 1),
    (count(*) over ())::int
  from agg join parts p on p.id = agg.part_id
  order by
    case when p_sort = 'price_asc' then agg.min_price end asc,
    case when p_sort = 'price_desc' then agg.min_price end desc,
    case when p_sort = 'name' then p.name end asc,
    agg.shops desc, agg.offers desc, p.name
  limit least(p_limit, 100) offset p_offset
$$;

create or replace function catalog_model_offers_v2(
  p_slug text, p_internal boolean default false, p_category text default null,
  p_shops text[] default null, p_in_stock boolean default false, p_sort text default 'price_asc',
  p_limit int default 30, p_offset int default 0)
returns table (id uuid, shop_id text, shop_name text, name text, price int, in_stock boolean,
               url text, image_url text, part_id uuid, part_slug text, total int)
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
  )
  select o.id, o.shop_id, o.shop_name, o.name, o.price::int, o.in_stock, o.url, o.image_url, o.part_id,
         (select p.slug from parts p where p.id = o.part_id and o.part_id in (select part_id from compared)),
         (count(*) over ())::int
  from o
  order by
    case when p_sort = 'price_desc' then o.price end desc nulls last,
    case when p_sort = 'name' then o.name end asc,
    o.price asc
  limit least(p_limit, 100) offset p_offset
$$;

grant execute on function
  catalog_model_parts_page(text, boolean, text, text[], boolean, text, int, int),
  catalog_model_offers_v2(text, boolean, text, text[], boolean, text, int, int)
to anon, authenticated;
