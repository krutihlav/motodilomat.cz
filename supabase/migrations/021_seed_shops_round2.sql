-- Další kandidáti (2026-10-21): 4jawa a motoren.sk (tip Adama) + nalezené
-- vyhledáváním. internal_sync=false, dokud probe-shops.yml neověří zdroj.
-- motoren.sk je slovenský (ceny v EUR) – importér zatím počítá s CZK.
-- MVdíly má e-shop na motoveterandily.cz (ne mvdily.cz).
insert into shops (id, name, domain, base_url, source_type, crawl_enabled, active, feed_permission)
values
  ('4jawa', '4JAWA', '4jawa.cz', 'https://www.4jawa.cz', 'crawl', false, false, false),
  ('motoren', 'Motoren.sk', 'motoren.sk', 'https://www.motoren.sk', 'crawl', false, false, false),
  ('motoveterandily', 'MVDILY (motoveterandily.cz)', 'motoveterandily.cz', 'https://www.motoveterandily.cz', 'crawl', false, false, false),
  ('extremebike', 'Extremebike', 'extremebike.cz', 'https://www.extremebike.cz', 'crawl', false, false, false),
  ('motospicka', 'Motodíly Špička', 'motospicka.cz', 'https://www.motospicka.cz', 'crawl', false, false, false),
  ('mototechnik', 'Mototechnik', 'mototechnik.cz', 'https://www.mototechnik.cz', 'crawl', false, false, false)
on conflict (id) do nothing;
