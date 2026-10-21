-- 4JAWA má e-shop na 4jawa.com (ne 4jawa.cz). Probe 2026-10-21: ~3 960 produktů,
-- ale polsky a ceny v EUR -> internal_sync zatím false (importér počítá s CZK,
-- české vyhledávání dílny polské názvy nenajde).
update shops set domain = '4jawa.com', base_url = 'https://www.4jawa.com' where id = '4jawa';
