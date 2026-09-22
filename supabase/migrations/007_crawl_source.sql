-- Fáze 3: crawl jako druhý typ zdroje dat vedle XML feedů.
alter table shops
  add column if not exists source_type text not null default 'feed', -- feed | crawl
  add column if not exists crawl_enabled boolean not null default false,
  add column if not exists base_url text;

alter table shops drop constraint if exists shops_source_type_check;
alter table shops
  add constraint shops_source_type_check check (source_type in ('feed', 'crawl'));

-- feed_permission zůstává beze změny jako gate pro import feedů.

alter table shop_products
  add column if not exists is_public boolean not null default false;
