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
