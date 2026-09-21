create table if not exists waitlist (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  source text,
  consent_text text not null,
  created_at timestamptz default now()
);

alter table waitlist enable row level security;
-- žádné policies: zapisuje jen server přes service role
