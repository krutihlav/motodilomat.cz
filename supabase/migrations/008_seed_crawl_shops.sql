-- Seed shopů zvažovaných pro crawl (Fáze 3). base_url ověřen ručně přes
-- veřejné vyhledávání (viz docs/decisions.md), crawl_enabled zůstává false,
-- dokud scripts/probe-shops.ts neověří robots.txt/sitemapu/platformu.
-- active = false: nic z crawlovaných shopů zatím není veřejné.
insert into shops (id, name, domain, base_url, source_type, crawl_enabled, active, feed_permission)
values
  ('fichtlkramek', 'Fichtl krámek', 'fichtlkramek.cz', 'https://www.fichtlkramek.cz', 'crawl', false, false, false),
  ('motokramek', 'Motokrámek', 'motokramek.cz', 'https://www.motokramek.cz', 'crawl', false, false, false),
  ('motomax', 'MOTOMAX', 'motomax.cz', 'https://www.motomax.cz', 'crawl', false, false, false),
  ('partdeck', 'Partdeck', 'partdeck.cz', 'https://www.partdeck.cz', 'crawl', false, false, false),
  ('jawa-korda', 'JAWA-KORDA', 'jawa-korda.cz', 'https://www.jawa-korda.cz', 'crawl', false, false, false),
  ('javarna', 'Jávárna', 'jawarna.cz', 'https://www.jawarna.cz', 'crawl', false, false, false),
  ('mvdily', 'MVdily', 'mvdily.cz', 'https://www.mvdily.cz', 'crawl', false, false, false),
  ('motojelinek', 'Motojelínek', 'motojelinek.cz', 'https://www.motojelinek.cz', 'crawl', false, false, false)
on conflict (id) do update set
  base_url = excluded.base_url,
  domain = excluded.domain,
  name = excluded.name;
