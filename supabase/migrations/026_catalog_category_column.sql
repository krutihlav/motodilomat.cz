-- 026: kategorie jako uložený generovaný sloupec. Počítat regexy za běhu přes
-- 20 tisíc řádků trvalo ~5 s na dotaz (statement timeout na webu).
alter table shop_products
  add column if not exists category text generated always as (catalog_category(name)) stored;

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
  sp.category,
  s.public_listing,
  s.internal_sync
from shop_products sp
join shops s on s.id = sp.shop_id
where coalesce(sp.match_status, '') <> 'ignored'
  and sp.price > 0;
