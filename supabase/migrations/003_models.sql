create table if not exists models (
  id text primary key,                 -- 'jawa-350-634'
  brand text not null,                 -- 'Jawa' | 'ČZ' | 'Babetta' | 'Stadion'
  name text not null,
  type_code text,                      -- '634'
  years text,
  popular_name text,
  slug text unique not null
);

alter table models enable row level security;

create policy "Public can read models" on models
  for select
  to anon
  using (true);
