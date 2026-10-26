-- 027: ruční schvalování nejistých dvojic nabídek (pásmo B).
-- pair_queue plní workflow pair-queue.yml (service role), pair_reviews zapisuje interní
-- stránka /interni/parovani. Obojí jen service role – žádné veřejné policy.

create table if not exists pair_queue (
  offer_a uuid not null references shop_products (id) on delete cascade,
  offer_b uuid not null references shop_products (id) on delete cascade,
  rank int not null,
  reasons text[] not null default '{}',
  shared text[] not null default '{}',
  jaccard real,
  price_ratio real,
  created_at timestamptz not null default now(),
  primary key (offer_a, offer_b),
  check (offer_a < offer_b)
);
create index if not exists pair_queue_rank_idx on pair_queue (rank);
alter table pair_queue enable row level security;

create table if not exists pair_reviews (
  offer_a uuid not null references shop_products (id) on delete cascade,
  offer_b uuid not null references shop_products (id) on delete cascade,
  decision text not null check (decision in ('same', 'different', 'skip')),
  decided_at timestamptz not null default now(),
  primary key (offer_a, offer_b),
  check (offer_a < offer_b)
);
alter table pair_reviews enable row level security;

-- Otevřená fronta: dvojice bez rozhodnutí, nejdůležitější první.
create or replace view pair_queue_open
with (security_invoker = true)
as
select q.*
from pair_queue q
where not exists (
  select 1 from pair_reviews r where r.offer_a = q.offer_a and r.offer_b = q.offer_b
);
revoke all on pair_queue, pair_reviews, pair_queue_open from anon, authenticated;
