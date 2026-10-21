-- Probe 2026-10-21 (shop_probes), kolo 2:
--  motoveterandily – Shoptet, ~4 990 produktových URL, JSON-LD ověřeno -> internal_sync
--  4jawa       – doména 4jawa.cz se nepřeložila (DNS) – ověřit správnou adresu
--  motoren     – robots.txt crawl zakazuje -> respektujeme, vynecháno
--  extremebike – produktové stránky bez strukturovaných dat
--  motospicka, mototechnik – sitemapa bez produktů
update shops set internal_sync = true where id = 'motoveterandily';
