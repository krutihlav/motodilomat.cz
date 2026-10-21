-- Interní noční synchronizace cen (rozhodnutí 2026-10-21 v docs/decisions.md).
-- internal_sync = shop se každou noc stáhne v režimu --internal (bez ohledu na
-- feed_permission/crawl_enabled). Data zůstávají neveřejná (is_public=false),
-- slouží interně (PureBikes Dílna přes dilna_part_prices). Na veřejném webu
-- dál platí jen feed_permission/crawl_enabled = souhlas e-shopu.
alter table shops add column if not exists internal_sync boolean not null default false;

comment on column shops.internal_sync is
  'Noční interní import (--internal), data neveřejná. Neznamená souhlas e-shopu se zveřejněním.';

-- Shopy, které jdou z GitHub Actions stáhnout (javarna = ETIMEDOUT, fichtlkramek/mvdily/partdeck zatím bez zdroje).
update shops set internal_sync = true where id in ('motomax', 'motokramek', 'jawa-korda', 'motojelinek');
