-- Fáze 3: kanonické modely (generace + objem, ne jen objem). Tabulka models
-- je v okamžiku migrace prázdná (ověřeno 2026-09-30), proto jde měnit sloupce
-- bez převodu dat. part_models se NEMĚNÍ - je pro kanonické díly; vazby nabídek
-- na modely jsou v shop_product_models (migrace 014).
do $$
begin
  if exists (select 1 from models) then
    raise exception 'models není prázdná - migraci 012 je potřeba upravit o převod dat';
  end if;
end $$;

-- models: nahrazujeme type_code (1 typ) a popular_name (1 přezdívka) poli.
alter table models
  drop column if exists type_code,
  drop column if exists popular_name,
  add column if not exists family text not null,              -- řada: 'Jawa 50', 'Jawa 175–500', 'Babetta' ...
  add column if not exists displacement int,                  -- objem v cm3, null = neznámý
  add column if not exists type_numbers text[] not null default '{}',
  add column if not exists aliases text[] not null default '{}',
  add column if not exists needs_verification boolean not null default false,
  add column if not exists note text;

comment on column models.id is 'Shodné se slug (např. ''jawa-350-634'').';
comment on column models.family is 'Řada, uvnitř které se rozvíjejí rozsahy typů (550-555, 638-640).';
comment on column models.type_numbers is 'Jen ověřená typová čísla; neověřená jsou v note.';
comment on column models.aliases is 'Přezdívky a zkratky (pařez, pérák, kýv.); parser je porovnává bez diakritiky a velikosti písmen.';
