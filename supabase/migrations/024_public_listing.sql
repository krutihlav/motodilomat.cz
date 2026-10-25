-- 024: veřejné zobrazení e-shopů bez nutnosti předchozího souhlasu (rozhodnutí 2026-10-25).
-- Nic se tím nezveřejní: public_listing i is_public zůstávají false, dokud je Adam nezapne.

alter table shops add column if not exists public_listing boolean not null default false;
comment on column shops.public_listing is
  'Shop se zobrazuje na veřejném webu (rozhodnutí Adama, bez nutnosti souhlasu; opt-out respektován). Nezávislé na internal_sync.';

create policy "Public read listed shops" on shops for select using (public_listing);

create policy "Public read listed offers" on shop_products for select
  using (
    is_public
    and exists (select 1 from shops s where s.id = shop_products.shop_id and s.public_listing)
  );

create policy "Public read listed offer models" on shop_product_models for select
  using (
    exists (select 1 from shop_products p where p.id = shop_product_models.shop_product_id and p.is_public)
  );

-- Zprávy z formuláře /pro-eshopy. Jen service role (žádná veřejná policy).
create table if not exists contact_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('fix', 'feed', 'remove', 'other')),
  shop_url text,
  email text not null,
  message text,
  handled_at timestamptz
);
alter table contact_messages enable row level security;
