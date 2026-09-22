-- MOTOMAX: probe-shops.ts v1 (2026-09-22) našel funkční Google feed na
-- <base_url>/google.xml. Přepnout ze source_type='crawl' na 'feed' a nastavit
-- feed_url/feed_format. feed_permission zůstává false - dokud e-shop import
-- výslovně nepovolí, jede se jen scripts/import-feed.ts --dry-run (nic se
-- nezapisuje, jen počty a ukázka).
update shops
set
  source_type = 'feed',
  feed_format = 'google',
  feed_url = base_url || '/google.xml'
where id = 'motomax';
