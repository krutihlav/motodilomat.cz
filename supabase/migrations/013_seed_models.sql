-- Seed kanonických modelů (Fáze 3). GENEROVÁNO ze src/lib/models/seed.ts:
-- npx tsx scripts/generate-models-seed.ts - needitovat ručně.
-- ČZ modely (typy 355, 450, 453, 455, 470-472, 476, 477, 487, 488) se záměrně
-- neseedují, Simson je mimo rozsah.
insert into models
  (id, slug, brand, name, family, displacement, type_numbers, aliases, needs_verification, note)
values
  ('pionyr-550', 'pionyr-550', 'Jawa', 'Jawa 50 typ 550 „Pařez“', 'Jawa 50', 50, array['550']::text[], array['pařez', 'typ 550']::text[], false, null),
  ('pionyr-555', 'pionyr-555', 'Jawa', 'Jawa 50 typ 555', 'Jawa 50', 50, array['555']::text[], array['typ 555']::text[], false, null),
  ('pionyr-05', 'pionyr-05', 'Jawa', 'Jawa 50 Pionýr typ 05', 'Jawa 50', 50, array['05']::text[], array['pionýr']::text[], false, null),
  ('pionyr-20', 'pionyr-20', 'Jawa', 'Jawa 50 Pionýr typ 20', 'Jawa 50', 50, array['20']::text[], array['pionýr']::text[], false, null),
  ('pionyr-21', 'pionyr-21', 'Jawa', 'Jawa 50 Pionýr typ 21 (Sport)', 'Jawa 50', 50, array['21']::text[], array['pionýr']::text[], false, '„Sport“ záměrně není alias - kolidoval by s Jawettou Sport a dalšími.'),
  ('mustang-23', 'mustang-23', 'Jawa', 'Jawa 50 typ 23 Mustang', 'Jawa 50', 50, array['23']::text[], array['mustang']::text[], false, null),
  ('jawetta', 'jawetta', 'Jawa', 'Jawetta', 'Jawetta', null, '{}'::text[], array['jawetta']::text[], true, 'Samostatný model, NENÍ typ 550/555 (sdílí s 555 motor). Typy 552/553 ověřit. Objem doplnit.'),
  ('jawetta-sport', 'jawetta-sport', 'Jawa', 'Jawetta Sport', 'Jawetta', null, '{}'::text[], array['jawetta sport']::text[], true, 'Samostatný model, NENÍ typ 550/555 (sdílí s 555 motor). Typy 552/553 ověřit. Objem doplnit.'),
  ('stadion-s11', 'stadion-s11', 'Stadion', 'Stadion S11', 'Stadion', null, '{}'::text[], array['stadion', 's11']::text[], true, 'Vztah k motorům Jawa 50 ověřit. Objem doplnit.'),
  ('stadion-s22', 'stadion-s22', 'Stadion', 'Stadion S22', 'Stadion', null, '{}'::text[], array['stadion', 's22']::text[], true, 'Vztah k motorům Jawa 50 ověřit. Objem doplnit.'),
  ('stadion-s23', 'stadion-s23', 'Stadion', 'Stadion S23', 'Stadion', null, '{}'::text[], array['stadion', 's23']::text[], true, 'Vztah k motorům Jawa 50 ověřit. Objem doplnit.'),
  ('jawa-90', 'jawa-90', 'Jawa', 'Jawa 90 (Cross aj.)', 'Jawa 90', 90, '{}'::text[], array['jawa 90']::text[], true, 'Alias „jawa 90“ je jednogenerační zkratka, aby šel model zachytit (displacement level by na něj jinak nevedl). „Californian“ NENÍ alias - ověřit, k čemu patří.'),
  ('perak-250', 'perak-250', 'Jawa', 'Jawa 250 Pérák (typ 11)', 'Jawa 175–500', 250, array['11']::text[], array['pérák']::text[], false, 'Pérák NEMÁ typy 353/354.'),
  ('perak-350', 'perak-350', 'Jawa', 'Jawa 350 Pérák (typ 12)', 'Jawa 175–500', 350, array['12']::text[], array['pérák']::text[], false, 'Pérák NEMÁ typy 353/354.'),
  ('ohc-350', 'ohc-350', 'Jawa', 'Jawa 350 OHC', 'Jawa 175–500', 350, '{}'::text[], array['ohc']::text[], true, 'Typové číslo ověřit.'),
  ('ohc-500', 'ohc-500', 'Jawa', 'Jawa 500 OHC', 'Jawa 175–500', 500, '{}'::text[], array['ohc']::text[], true, 'Typové číslo ověřit.'),
  ('kyvacka-250', 'kyvacka-250', 'Jawa', 'Jawa 250 Kývačka (typ 353)', 'Jawa 175–500', 250, array['353']::text[], array['kývačka', 'kýv.', 'kejvačka']::text[], false, null),
  ('kyvacka-350', 'kyvacka-350', 'Jawa', 'Jawa 350 Kývačka (typ 354)', 'Jawa 175–500', 350, array['354']::text[], array['kývačka', 'kýv.', 'kejvačka']::text[], false, null),
  ('kyvacka-175', 'kyvacka-175', 'Jawa', 'Jawa 175 Kývačka (typ 356)', 'Jawa 175–500', 175, array['356']::text[], array['kývačka', 'kýv.', 'kejvačka']::text[], false, 'Aliasy převzaty z Kývaček 250/350 (v zadání uvedeny jen u nich).'),
  ('jawa-250-559', 'jawa-250-559', 'Jawa', 'Jawa 250 typ 559', 'Jawa 175–500', 250, array['559']::text[], '{}'::text[], true, 'Přechod Kývačka/Panelka, zařazení ověřit.'),
  ('panelka-250', 'panelka-250', 'Jawa', 'Jawa 250 Panelka', 'Jawa 175–500', 250, '{}'::text[], array['panelka']::text[], true, 'Typová čísla ověřit (NE 634, NE 638–640).'),
  ('panelka-350', 'panelka-350', 'Jawa', 'Jawa 350 Panelka', 'Jawa 175–500', 350, '{}'::text[], array['panelka']::text[], true, 'Typová čísla ověřit (NE 634, NE 638–640).'),
  ('jawa-350-634', 'jawa-350-634', 'Jawa', 'Jawa 350 typ 634', 'Jawa 175–500', 350, array['634']::text[], '{}'::text[], false, null),
  ('jawa-350-638', 'jawa-350-638', 'Jawa', 'Jawa 350 typ 638', 'Jawa 175–500', 350, array['638']::text[], '{}'::text[], false, null),
  ('jawa-350-639', 'jawa-350-639', 'Jawa', 'Jawa 350 typ 639', 'Jawa 175–500', 350, array['639']::text[], '{}'::text[], false, null),
  ('jawa-350-640', 'jawa-350-640', 'Jawa', 'Jawa 350 typ 640', 'Jawa 175–500', 350, array['640']::text[], '{}'::text[], false, null),
  ('velorex-350', 'velorex-350', 'Velorex', 'Velorex 350', 'Velorex', 350, '{}'::text[], array['velorex']::text[], false, 'Brand „Velorex“ (v zadání zařazeno pod Jawa 175–500).'),
  ('babetta-207', 'babetta-207', 'Babetta', 'Babetta 207', 'Babetta', null, array['207']::text[], '{}'::text[], false, 'Objem doplnit.'),
  ('babetta-210', 'babetta-210', 'Babetta', 'Babetta 210', 'Babetta', null, array['210']::text[], '{}'::text[], false, 'Objem doplnit.'),
  ('babetta-225', 'babetta-225', 'Babetta', 'Babetta 225', 'Babetta', null, array['225']::text[], '{}'::text[], false, 'Objem doplnit.'),
  ('babetta-228', 'babetta-228', 'Babetta', 'Babetta 228', 'Babetta', null, array['228']::text[], '{}'::text[], false, 'Objem doplnit.'),
  ('babetta-134', 'babetta-134', 'Babetta', 'Babetta 134', 'Babetta', null, array['134']::text[], '{}'::text[], true, 'Aliasy star/stella ověřit (zatím nejsou mezi aliasy). Objem doplnit.'),
  ('cezeta', 'cezeta', 'Čezeta', 'Čezeta', 'Čezeta', null, '{}'::text[], array['čezeta']::text[], true, 'Typy ověřit.')
on conflict (id) do update set
  slug = excluded.slug,
  brand = excluded.brand,
  name = excluded.name,
  family = excluded.family,
  displacement = excluded.displacement,
  type_numbers = excluded.type_numbers,
  aliases = excluded.aliases,
  needs_verification = excluded.needs_verification,
  note = excluded.note;
