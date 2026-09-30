# Architektonická rozhodnutí

## 2026-09-22 – Crawl jako druhý typ zdroje dat (Fáze 3)

**Rozhodnutí:** Vedle XML feedů (`shops.source_type = 'feed'`) přidán `crawl` jako
alternativní zdroj nabídek. Gate `feed_permission` zůstává beze změny pro feedy;
pro crawl přibyl samostatný gate `crawl_enabled` (default `false`) a `base_url`.
`import-feed.ts` větví podle `source_type` a pro `crawl` volá
`src/lib/crawl/crawlShop.ts` místo `parseHeurekaFeed`.

**Proč:** Ne všechny e-shopy mají veřejný/svolený XML feed. Crawl (sitemapa +
JSON-LD `Product` na stránce produktu) umožňuje získat nabídky i bez feedu,
za cenu nižší frekvence a nutnosti respektovat robots.txt.

**Rate limiting a identifikace:** 1 request / 3 s / doména (`src/lib/crawl/httpClient.ts`),
User-Agent `MotodilomatBot/0.1 (+mailto:adas.kment@gmail.com)`, timeout 10 s,
max. 2 opakování při chybě/5xx. Než se cokoliv stáhne, ověří se `robots.txt`
(`src/lib/crawl/robots.ts`) - shop, který crawl zakazuje, se přeskočí.

**Seed shopů (migrace `008_seed_crawl_shops.sql`):** `base_url` u osmi shopů
(Fichtl krámek, Motokrámek, MOTOMAX, Partdeck, JAWA-KORDA, Jávárna, MVdily,
Motojelínek) doplněn na základě veřejného vyhledávání (název firmy + Heureka
recenze/Firmy.cz apod.) - přímé ověření přes fetch nebylo z tohoto prostředí
možné (odchozí síť je omezena na proxy pro vyhledávání). `crawl_enabled = false`
a `active = false` u všech: `scripts/probe-shops.ts` (workflow `probe-shops.yml`,
jen `workflow_dispatch`) musí nejdřív potvrdit robots.txt, sitemapu, platformu
a JSON-LD dřív, než se crawl pro konkrétní shop skutečně zapne. Nic z toho
zatím není veřejné (`shop_products.is_public` default `false`, žádná nová
anon select policy).

**Nepokryté zatím záměrně:** `is_public` na `shop_products` se nikde
automaticky nenastavuje - to bude ruční/admin krok pozdější fáze. `crawlShop()`
prochází celou sitemapu bez omezení počtu stránek; v produkci to reálně
poběží jen pro shopy s `crawl_enabled = true`, což zatím není žádný.

## 2026-09-22 – `feed_permission`/`crawl_enabled` = souhlas e-shopu, ne technické povolení zápisu

**Rozhodnutí:** `feed_permission` (a `crawl_enabled`) odteď znamenají výhradně
"e-shop souhlasil se zalistováním/feedem", ne "smíme si zdroj technicky
stáhnout a zapsat". `scripts/import-feed.ts` dostal `--internal` (viz
`RunImportOptions.enforceGate`), který skutečný import spustí i bez tohoto
gate - pro jednorázové interní ověření zdroje na produkčních datech předtím,
než e-shop osloví a získá se souhlas. Na rozdíl od `--dry-run` `--internal`
zapisuje do `shop_products`.

**Proč je to bezpečné:** zapsaná data zůstávají neveřejná stejně jako
u crawlu - `shop_products.is_public` default `false`, žádná anon select
policy (viz výše). `--internal` teda nic nepublikuje, jen umožní si na
reálných datech ověřit kvalitu feedu/crawlu dřív, než se s e-shopem řeší
spolupráce.

**MOTOMAX (migrace `010_motomax_google_feed.sql`):** první shop, na kterém se
`--internal` použil (`feed_permission` zůstává `false`).

**Dosažitelnost v probe-shops v2:** `src/lib/crawl/httpClient.ts` teď má
`fetchWithDiagnostics`, který na rozdíl od `fetchText` nezahazuje důvod
selhání - `probe-shops.ts` z něj staví explicitní sloupec dosažitelnosti
(`ok` / `http_error` 4xx-5xx / `timeout` / `dns`), oddělené od `robots.txt`
stavu (`found`/`not_found`/`unknown`). Shop `javarna` (base_url
`jawarna.cz`) má v probe-shops.ts speciální fallback: při `timeout`/`dns` se
navíc zkusí doména bez 'w' (`javarna.cz`) a obě varianty jdou do výstupu -
ukáže se tak, jde-li o překlep v seedu nebo o výpadek/blokaci.

## 2026-09-30 – javarna: crawl vypnut (ETIMEDOUT z GH Actions), crawl cron oddělen od feedů

**javarna:** `shops.crawl_enabled = false` (v DB už bylo, ověřeno 2026-09-30).
Důvod: ETIMEDOUT z GH Actions, pravděpodobná blokace – řešit oslovením.
Run #5 (2026-09-24) selhal na homepage, robots.txt i sitemap.xml
(`https://www.jawarna.cz`), přitom 22.-23. 9. se z Actions stáhlo 87 produktů
ze stejné domény - nejde tedy o překlep v `base_url`. Žádné proxy ani změna
User-Agent, blokaci neobcházíme. Pozor: `--internal` (interní workflow)
`crawl_enabled` ignoruje, takže `internal-import-verified-shops.yml` javarnu
dál zkusí, pokud je v seznamu shopů.

**Cron:** feed zdroje zůstávají v `import-feeds.yml` (3x denně), crawl zdroje
mají `import-crawl.yml` (1x denně, 03:00 UTC) a berou jen shopy s
`crawl_enabled = true` (= souhlas e-shopu, viz rozhodnutí z 2026-09-22) -
dokud žádný takový shop není, běh nic nedělá.

## 2026-09-30 – Pravidla kvality položek, název z Upgates, pojistka proti prázdnému crawlu

**Název u motojelinku (Upgates):** `extractMicrodataProduct` bral první
`itemprop="name"` v Product scope, což je vnořený
`<span itemprop="brand" itemscope><meta itemprop="name" content="CZ">`
(ověřeno na skutečném HTML 3 stránek, `name` byl "CZ", "CZ / HUN", "JAWA Moto
spol s r. o."). Název se teď čte jen z vlastní úrovně Product scope (bez
vnořených brand/manufacturer/offers), fallback `<h1>`, pak `og:title`
(bez přípony " :: SHOP"). Cena/dostupnost se dál čtou z vnořeného `offers`.
Už uložené řádky motojelinku mají starý (špatný) název, dokud je crawl
znovu nepřepíše.

**Pravidla (`src/lib/feed/itemQuality.ts`, po relevanci, před upsertem):**
vyřazeno (neukládá se) = cena po zaokrouhlení <= 0 / NaN, cena > 30 000 Kč,
top kategorie "Modely motocyklů, automobilů", název `^motocykl\b` nebo
`^motor (bez|kompletní)\b`. Flag v `shop_products.review_flags`
(migrace `011`) = `price_review` (15 000-30 000 Kč) a `modern_jawa` (název s
CL 42 / forty two / RVM / adventure / 300 CL). Ceny 1-9 Kč jsou legitimní
(šrouby, matice), žádný spodní práh neexistuje.

**Pojistka:** `runImport` při 0 položkách ze zdroje nevolá
`markStaleOutOfStock` (jen varování). `javarna` už není ve výchozím seznamu
`internal-import-verified-shops.yml`. Plánovaný `--internal` crawl se
nenasazuje, internal import zůstává jen ruční (`workflow_dispatch`).

## 2026-09-30 – Refresh known URLs, ignored řádky, MPN motojelinku = kódy MVdily

**Režim `--refresh-known-urls`** (`scripts/import-feed.ts`, workflow input
`refresh_known_urls`): jednorázově projde URL existujících řádků shopu ze
`shop_products` (ne sitemapu), se stejným rate limitem 1 req/3 s, robots.txt
a stropem requestů `max(--max-requests, počet URL + 10)`. Opravené položky
přepíšou stávající řádek (`itemId`/`url` se berou z uloženého řádku, takže
nevznikne duplicita). Po běhu se pending řádky bez `part_id`, které vrátily
404/410 nebo u kterých se stránka úspěšně stáhla a název zůstal tvořený jen
značkou (CZ, JAWA, "JAWA Moto spol s r. o." ...), označí
`match_status='ignored'`. Řádky, u kterých stažení selhalo (timeout, 5xx, DNS,
robots) nebo na které nedošlo (strop requestů), zůstávají pending pro další
refresh; lidská rozhodnutí (manual/auto/rejected) se nemění. `markStaleOutOfStock` se v tomto režimu
nevolá. Název tvořený jen značkou je navíc obecné pravidlo kvality
(`brand_name` v `itemQuality.ts`).

**Ignored:** 13 existujících řádků vyřazených pravidly (11 motomax "Modely
motocyklů, automobilů", 1 jawa-korda 99 900 Kč, 1 motojelinek 52 995 Kč) a 2
řádky s cenou 0 jsou `ignored`.

**MPN u motojelinku obsahuje kódy MVdily** (např. `mvdily0344`) - potenciální
párovací klíč, až bude MVdily zdroj dat (Tier B' / MPN ↔ kód MVdily).

## 2026-09-30 – Fáze 3: kanonické modely a parser (dry-run)

**Proč ručně:** vazby odvozené z toho, co se v názvech potkává, vedou k chybám
(sdílené díly ≠ stejný model, analýza zmínek run #7). Modely se seedují ručně
(`src/lib/models/seed.ts`, zdroj pravdy → migrace `013_seed_models.sql` se
generuje `npx tsx scripts/generate-models-seed.ts`, test hlídá shodu) a parser
(`src/lib/models/parseModels.ts`) na ně jen mapuje.

**Schéma (migrace `012`):** `models` = `id`(=slug), `slug`, `brand`, `name`,
`family` (řada, uvnitř které se rozvíjejí rozsahy), `displacement`,
`type_numbers`, `aliases`, `needs_verification`, `note` (+ `years`);
`type_code`/`popular_name` zrušeny. `part_models` + `match_level`
(`type|nickname|displacement|brand`), `source` (`name|description`),
`matched_text`. Obě tabulky byly při návrhu prázdné, migrace to hlídá.
Migrace 012/013 zatím **nejsou aplikované** na DB (ověřeno v transakci s
rollbackem).

**Seed (finální, 57 modelů):** ověřená typová čísla (Wikipedie, veteranportal,
jawa-50.cz, cezetmania), `needs_verification=false` u všech. Typ může sdílet víc
modelů (551 = obě Jawetty, 552 = tři Stadiony), ČZ 125/150 A/B/T/C mají typ
označený písmenem (`typeNumbers=['B']`), Jawa 90 je Trail (30, 36) a Roadster
(31, 37), Panelka má tři modely (559, 592, 360) a „354/06“ vede na
`kyvacka-350` i `panelka-350-360`. Bez seedu zůstávají Simson, předválečné ČZ,
ČZ 500, motokros 968/980 a „350 OHC“ (moderní Jawa, přidáno do flagu
`modern_jawa` v `itemQuality.ts`; už uložené řádky se nepřeflagují).
Čezeta + objem bez typu 501/502 = jen brand ČZ, ne skútr.

**Parser:** čísla typů/objemů se berou jen hned za značkou/přezdívkou (včetně
slepených `jawa350`, `babetta134`); rozsahy (`550-555`, `20-23`, `634 - 640`)
se rozvíjejí jen přes typy existující v seedu ve stejné řadě; dvouciferné typy
mimo Jawa 50 (Pérák 11/12) jen s „typ“; desetinná čísla (`58,25`) nejsou typy;
holé „551/552/90/11“ bez značky se ignorují; objem těsně před přezdívkou
je závazný („350 OHC“ není ohc-500); priorita `type > nickname > displacement > brand`, `displacement`/`brand` **nemají
vazbu na konkrétní model** (parser vrací jen `generic` zásahy). Motojelinek čte
modely za posledním `" - "`.

**Dry-run:** `docs/reports/models-dry-run-2026-09-30.md` (nic se nezapsalo do
`part_models`). Zjištění: `part_models` je klíčované na `parts`, pending
`shop_products` nemají `part_id`, a `displacement`/`brand` zásahy nemají
`model_id` – před zápisem je potřeba rozhodnout, co a kam se uloží.
