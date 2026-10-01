-- Vazby nabídek e-shopů (shop_products) na kanonické modely. part_models zůstává
-- pro kanonické díly a nepíše se do něj z parseru názvů.
--
-- match_level u vazby = úroveň konkrétního zásahu (ModelHit.level), ne úroveň řádku.
-- Zásahy bez konkrétního modelu (displacement / brand) nemají řádek v této
-- tabulce, jsou v shop_products.fit_generic.
create table if not exists shop_product_models (
  shop_product_id uuid not null references shop_products(id) on delete cascade,
  model_id text not null references models(id),
  match_level text not null check (match_level in ('type', 'nickname')),
  source text not null default 'name' check (source in ('name', 'description')),
  matched_text text,
  created_at timestamptz not null default now(),
  primary key (shop_product_id, model_id, source)
);

create index if not exists shop_product_models_model_id_idx on shop_product_models (model_id);

-- Zapnuté RLS bez anon policy: čtení/zápis jen přes service role.
alter table shop_product_models enable row level security;

-- Souhrn z posledního parsování názvu.
alter table shop_products
  add column if not exists model_match_level text
    constraint shop_products_model_match_level_check
    check (model_match_level in ('type', 'nickname', 'displacement', 'brand', 'none')),
  add column if not exists fit_generic jsonb not null default '[]'::jsonb,
  add column if not exists models_parsed_at timestamptz;

comment on column shop_products.model_match_level is
  'Nejvyšší dosažená úroveň shody; null = ještě neparsováno, none = parsováno bez shody.';
comment on column shop_products.fit_generic is
  'Zásahy bez konkrétního modelu: pole {brand, displacement?} (úroveň displacement / brand).';
