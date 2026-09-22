create table if not exists price_history (
  id uuid primary key default gen_random_uuid(),
  shop_product_id uuid references shop_products(id) on delete cascade,
  price int not null,
  in_stock boolean,
  captured_at timestamptz default now()
);

create index if not exists price_history_shop_product_id_idx on price_history (shop_product_id);

alter table price_history enable row level security;

-- Žádná anon select policy: historie cen je vnitřní data pro pozdější grafy,
-- zveřejní se až u spárovaných dílů ve Fázi 4.
