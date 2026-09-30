-- Fáze 3: kanonické modely (generace + objem, ne jen objem) a úroveň shody
-- u vazeb díl <-> model. Tabulky models i part_models jsou v okamžiku migrace
-- prázdné (ověřeno 2026-09-30), proto jde měnit sloupce bez převodu dat.
do $$
begin
  if exists (select 1 from models) or exists (select 1 from part_models) then
    raise exception 'models/part_models nejsou prázdné - migraci 012 je potřeba upravit o převod dat';
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

-- part_models: úroveň shody a odkud vazba pochází.
alter table part_models
  add column if not exists match_level text not null
    constraint part_models_match_level_check
    check (match_level in ('type', 'nickname', 'displacement', 'brand')),
  add column if not exists source text not null default 'name'
    constraint part_models_source_check
    check (source in ('name', 'description')),
  add column if not exists matched_text text;

create index if not exists part_models_model_id_idx on part_models (model_id);
