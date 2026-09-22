-- Fáze 3b: Google Merchant RSS/Atom jako druhý formát feedu vedle Heureka.
-- feed_format sloupec už existoval od 002_shops (default 'heureka'), jen mu
-- teď přidáváme NOT NULL a explicitní enum.
update shops set feed_format = 'heureka' where feed_format is null;

alter table shops
  alter column feed_format set default 'heureka',
  alter column feed_format set not null;

alter table shops drop constraint if exists shops_feed_format_check;
alter table shops
  add constraint shops_feed_format_check check (feed_format in ('heureka', 'google'));
