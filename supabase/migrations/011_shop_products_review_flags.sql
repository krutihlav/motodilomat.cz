-- Flagy k ruční kontrole (nevyřazují položku): 'price_review' = cena 15 000-30 000 Kč,
-- 'modern_jawa' = název obsahuje CL 42 / forty two / RVM / adventure / 300 CL.
-- Plní scripts/import-feed.ts podle src/lib/feed/itemQuality.ts.
alter table shop_products
  add column if not exists review_flags text[] not null default '{}';
