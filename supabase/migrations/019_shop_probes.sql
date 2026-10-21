-- Historie výsledků probe-shops.ts (robots.txt, platforma, sitemapa, nalezené
-- feedy, vzorové produkty). Logy GitHub Actions nejsou vždy dostupné, takže se
-- výsledek ukládá i sem. Jen service role (RLS bez policy).
create table if not exists shop_probes (
  id bigint generated always as identity primary key,
  shop_id text not null references shops(id) on delete cascade,
  probed_at timestamptz not null default now(),
  result jsonb not null
);
create index if not exists shop_probes_shop_idx on shop_probes (shop_id, probed_at desc);
alter table shop_probes enable row level security;
