create table if not exists shop_products (
  id uuid primary key default gen_random_uuid(),
  shop_id text references shops(id),
  shop_item_id text not null,          -- ITEM_ID z feedu
  name text not null,
  price int not null,                  -- Kč s DPH
  url text not null,
  image_url text,
  ean text,
  in_stock boolean,
  delivery_days int,
  category_text text,
  raw jsonb,
  part_id uuid references parts(id),   -- null = nespárováno
  match_status text default 'pending', -- pending | auto | manual | rejected | ignored
  match_confidence real,
  last_seen_at timestamptz default now(),
  unique (shop_id, shop_item_id)
);

create index if not exists shop_products_part_id_idx on shop_products (part_id);
create index if not exists shop_products_match_status_idx on shop_products (match_status);

alter table shop_products enable row level security;

-- Zatím žádná anon select policy: nabídky nejsou spárované ani určené pro
-- veřejný web (přijde ve Fázi 4). Zápisy jen přes service role klienta.
