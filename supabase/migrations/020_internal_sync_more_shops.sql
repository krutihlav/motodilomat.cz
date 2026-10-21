-- Výsledek probe-shops.yml 2026-10-21 (tabulka shop_probes):
--  birdgarage  – Shoptet s veřejným /google.xml -> feed (Google formát)
--  veteranmoto – Shoptet, ~3 450 produktových URL, JSON-LD ověřeno -> crawl
--  jawasvet    – eshop-rychle, ~2 490 URL, ověřeno -> crawl
--  motopisty   – eshop-rychle, ~1 100 URL, ověřeno -> crawl
-- Vynecháno: jawashop (ceny v EUR, importér počítá s CZK), retrotechna (stránky
-- bez strukturovaných dat), fichtlkramek / mvdily / partdeck (sitemapa bez produktů).
update shops set source_type = 'feed', feed_url = 'https://www.birdgarage.cz/google.xml', feed_format = 'google'
  where id = 'birdgarage';
update shops set internal_sync = true where id in ('birdgarage', 'veteranmoto', 'jawasvet', 'motopisty');
