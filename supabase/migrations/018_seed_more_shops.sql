-- Další e-shopy s díly na Jawa / ČZ / Babetta / Pionýr / Stadion (nalezeno
-- veřejným vyhledáváním 2026-10-21). internal_sync zůstává false, dokud
-- probe-shops.yml neověří robots.txt, sitemapu / feed a platformu.
insert into shops (id, name, domain, base_url, source_type, crawl_enabled, active, feed_permission)
values
  ('veteranmoto', 'VETERÁNMOTO.cz', 'veteranmoto.cz', 'https://www.veteranmoto.cz', 'crawl', false, false, false),
  ('birdgarage', 'Birdgarage', 'birdgarage.cz', 'https://www.birdgarage.cz', 'crawl', false, false, false),
  ('jawasvet', 'Jawa svět', 'jawasvet.cz', 'https://www.jawasvet.cz', 'crawl', false, false, false),
  ('retrotechna', 'Retrotechna', 'retrotechna.cz', 'https://www.retrotechna.cz', 'crawl', false, false, false),
  ('motopisty', 'Moto-písty', 'moto-pisty.cz', 'https://www.moto-pisty.cz', 'crawl', false, false, false),
  ('jawashop', 'Jawashop.com', 'jawashop.com', 'https://www.jawashop.com', 'crawl', false, false, false)
on conflict (id) do nothing;
