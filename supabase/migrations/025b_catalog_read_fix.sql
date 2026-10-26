-- 025b: o-kroužky nepatří do "Válec a píst"; catalog_model_parts vrací i slug dílu.
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

drop function if exists catalog_model_parts(text, boolean, text, int);
create function catalog_model_parts(
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
grant execute on function catalog_model_parts(text, boolean, text, int) to anon, authenticated;
