create table if not exists parts (
  id uuid primary key default gen_random_uuid(),
  oem_number text,                     -- normalizované katalogové číslo, může být null
  name text not null,
  slug text unique not null,
  category text not null,
  description text,
  quality_advice text,                 -- ověřená rada ke kvalitě
  created_at timestamptz default now()
);
create index if not exists parts_oem_number_idx on parts (oem_number);

create table if not exists part_models (
  part_id uuid references parts(id) on delete cascade,
  model_id text references models(id) on delete cascade,
  primary key (part_id, model_id)
);

alter table parts enable row level security;
alter table part_models enable row level security;

create policy "Public can read parts" on parts
  for select
  to anon
  using (true);

create policy "Public can read part_models" on part_models
  for select
  to anon
  using (true);
