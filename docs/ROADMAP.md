# MotoDílomat.cz – Roadmapa projektu

> Pracovní dokument pro spolupráci s Claude / Claude Code.
> Doporučené umístění v repu: `docs/ROADMAP.md`. Stručný kontext zkopíruj i do `CLAUDE.md` v kořeni repa (viz sekce 9).

---

## 1. Vize v jedné větě

Specializovaný srovnávač cen náhradních dílů pro dvoutakty z ČSSR (Jawa, ČZ, Babetta, Stadion, později Simson), který páruje nabídky e-shopů podle **originálních katalogových čísel (OEM)**, ukazuje díly na **interaktivních rozkresech** a **optimalizuje celý renovační košík** včetně poštovného.

Značková rodina do budoucna: **Motodílomat.cz** → **Autodílomat.cz** (stejné jádro, jiná data).

---

## 2. Principy (platí pro každou fázi)

1. **Žádná vymyšlená data na veřejném webu.** Ceny, sklady, hodnocení a tvrzení o e-shopech jen z reálných zdrojů (feed, ruční ověření). Demo data patří jen na neveřejný preview.
2. **Data jsou produkt.** Kvalita párování dílů je hlavní konkurenční výhoda – UI je až druhé.
3. **Postupně a nasaditelně.** Každá fáze končí něčím, co běží v produkci a dá se ukázat.
4. **SEO od prvního dne.** Každý díl a model = vlastní indexovatelná URL, serverově renderovaná.
5. **Dobré vztahy s e-shopy.** Feed se svolením > scrapování. E-shopy jsou budoucí platící partneři.
6. **Jedna fáze = jedna větev / PR.** Claude Code dostává úkoly po malých, ověřitelných krocích.

---

## 3. Fáze projektu – přehled

| Fáze | Cíl | Výstup v produkci |
|---|---|---|
| 0 | Úklid a ochrana | Coming soon + sběr e-mailů, prototyp na neveřejném preview |
| 1 | Nový základ | Next.js + Supabase kostra, DB schéma, CI |
| 2 | Datová pipeline | Import XML feedů, ukládání nabídek, historie cen |
| 3 | Párování dílů | OEM normalizace, automatické párování, admin fronta |
| 4 | Veřejný katalog (MVP) | Stránky dílů a modelů, vyhledávání, prokliky |
| 5 | Optimalizátor košíku | Přesný výpočet single-shop vs. split |
| 6 | Rozkresy | Interaktivní rozkresy pro 2–3 motory |
| 7 | Monetizace a růst | Měření prokliků, CPC/affiliate smlouvy, komunita |

---

## 4. Fáze 0 – Úklid a ochrana (HOTOVO přes Claude Code prompt)

- [ ] Prototyp přesunut do větve `prototype` (Vercel preview, chráněné přihlášením, `noindex`)
- [ ] `main` = coming soon stránka se sběrem e-mailů
- [ ] Tabulka `waitlist` v Supabase + serverless endpoint `/api/subscribe`
- [ ] Stránka se zásadami zpracování osobních údajů
- [ ] Patička s identifikací provozovatele (jméno, IČO)
- [ ] `robots.txt`, `sitemap.xml`, správné meta tagy
- [ ] Vercel: ověřit Deployment Protection pro preview deploymenty
- [ ] Google Search Console: ověřit doménu, odeslat sitemap, případně požádat o přeindexování `/`

---

## 5. Fáze 1 – Nový technický základ

### Stack

| Vrstva | Volba | Proč |
|---|---|---|
| Frontend + SSR | **Next.js (App Router)** na Vercelu | SSG/ISR stránky pro SEO, API routes, komponenty z prototypu jdou přenést |
| Styl | Tailwind CSS | Už používá prototyp |
| Databáze | **Supabase (Postgres)** | Už připojené, RLS, SQL, cron přes pg_cron nebo externí |
| Import jobs | GitHub Actions (cron) nebo Vercel Cron | Vercel Cron má na Hobby plánu omezenou frekvenci |
| Analytika | Bezcookiesová (Vercel Web Analytics / Plausible) | Není potřeba cookie lišta |

> ⚠️ **Vercel Hobby plán je jen pro nekomerční použití.** Jakmile začne web vydělávat (CPC, affiliate), je potřeba přejít na Pro. Počítat s tím v rozpočtu.

### Úkoly
- [ ] Nový Next.js projekt v `main` (coming soon zůstane jako route `/` dokud nespustíme)
- [ ] Veřejné stránky za feature flagem / env proměnnou `NEXT_PUBLIC_LAUNCHED`
- [ ] Supabase klient (server-only pro service role, anon klient jen pro čtení veřejných dat)
- [ ] Migrace DB schématu v repu (`supabase/migrations/*.sql`)
- [ ] Lint, typecheck a build v GitHub Actions na každý PR
- [ ] Přenos UI komponent z větve `prototype` (PartCard, SearchAndFilter, CartOptimizer UI, Header, Footer) – **bez demo dat**

---

## 6. Datový model (Supabase / Postgres)

```sql
-- E-shopy
create table shops (
  id text primary key,                 -- 'fichtlkramek'
  name text not null,
  domain text not null,
  feed_url text,
  feed_format text default 'heureka',  -- heureka | zbozi | google | custom
  shipping_price int,                  -- Kč, ručně ověřeno
  free_shipping_from int,              -- Kč, null = nemá
  affiliate_params text,               -- např. 'utm_source=motodilomat&utm_medium=cpc'
  feed_permission boolean default false,
  active boolean default true,
  created_at timestamptz default now()
);

-- Modely motocyklů
create table models (
  id text primary key,                 -- 'jawa-350-634'
  brand text not null,                 -- 'Jawa' | 'ČZ' | 'Babetta' | 'Stadion'
  name text not null,
  type_code text,                      -- '634'
  years text,
  popular_name text,
  slug text unique not null
);

-- Kanonické díly (to, co páruje nabídky dohromady)
create table parts (
  id uuid primary key default gen_random_uuid(),
  oem_number text,                     -- normalizované katalogové číslo, může být null
  name text not null,
  slug text unique not null,
  category text not null,
  description text,
  quality_advice text,                 -- ověřená rada ke kvalitě
  created_at timestamptz default now()
);
create index on parts (oem_number);

create table part_models (
  part_id uuid references parts(id) on delete cascade,
  model_id text references models(id) on delete cascade,
  primary key (part_id, model_id)
);

-- Surové produkty z feedů = nabídky
create table shop_products (
  id uuid primary key default gen_random_uuid(),
  shop_id text references shops(id),
  shop_item_id text not null,          -- ITEM_ID z feedu
  name text not null,
  price int not null,                  -- Kč s DPH
  url text not null,
  image_url text,
  ean text,
  in_stock boolean,
  delivery_days int,
  category_text text,
  raw jsonb,
  part_id uuid references parts(id),   -- null = nespárováno
  match_status text default 'pending', -- pending | auto | manual | rejected | ignored
  match_confidence real,
  last_seen_at timestamptz default now(),
  unique (shop_id, shop_item_id)
);

-- Historie cen (pro grafy „cena v čase“ a detekci slev)
create table price_history (
  shop_product_id uuid references shop_products(id) on delete cascade,
  price int not null,
  in_stock boolean,
  captured_at timestamptz default now()
);

-- Prokliky (bez IP adres – minimalizace osobních údajů)
create table clicks (
  id bigserial primary key,
  shop_product_id uuid references shop_products(id),
  shop_id text references shops(id),
  source_page text,
  created_at timestamptz default now()
);

-- Waitlist (z Fáze 0)
create table waitlist (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  source text,
  consent_text text not null,
  created_at timestamptz default now()
);
```

**RLS:** zapnuto na všech tabulkách. Veřejné čtení jen `models`, `parts`, `part_models`, aktivní `shops` a spárované `shop_products`. Zápisy výhradně přes server (service role).

---

## 7. Fáze 2 – Datová pipeline (import feedů)

### Získání dat
1. **Oslovit e-shopy** (šablona e-mailu – nechat napsat Claude): nabídka zdarma zalistování, prosba o URL XML feedu (většina ho má pro Heureku/Zboží), zmínka o budoucí spolupráci na CPC/affiliate.
2. Evidovat svolení (`shops.feed_permission`).
3. Scrapování jen jako výjimka, pouze se souhlasem a s ohledem na obchodní podmínky webu.

### Import job
- [ ] Streamovaný parser XML (např. `sax` / `fast-xml-parser` po částech) – feedy mohou mít desítky MB
- [ ] Mapování polí Heureka formátu: `ITEM_ID`, `PRODUCTNAME`, `PRICE_VAT`, `URL`, `IMGURL`, `EAN`, `DELIVERY_DATE`, `CATEGORYTEXT`
- [ ] Filtr relevantních produktů (kategorie / klíčová slova – ne celý sortiment e-shopu)
- [ ] Upsert do `shop_products`, při změně ceny zápis do `price_history`
- [ ] Produkty, které ve feedu chybí > 3 dny → `in_stock = false` / skrýt
- [ ] Logování běhu (počet položek, chyby) + upozornění e-mailem při selhání
- [ ] Spouštění 1–4× denně (GitHub Actions cron)

---

## 8. Fáze 3 – Párování dílů (jádro produktu)

### Normalizace OEM čísel
Katalogová čísla se v e-shopech píší různě: `05-11-010`, `05.11.010`, `0511010`, `05 11 010`, `353-12-001`.

- [ ] Funkce `normalizeOem(str)` → jednotný tvar `NN-NN-NNN` (+ testy na reálných vzorcích)
- [ ] Extrakce OEM z názvu, kódu i popisu produktu (regex + validace délky/formátu)

### Pipeline párování
1. **Přesná shoda OEM** → `match_status = auto`, confidence 1.0
2. **Shoda EAN** s již spárovaným produktem → auto
3. **Fuzzy shoda** (název + model + kategorie, slovník synonym: *doutník = výfuk*, *píst s kroužky*, *Ferodo*) → do admin fronty s návrhem
4. **Admin fronta** (`/admin/matching`, chráněno přihlášením): potvrdit / přiřadit jiný díl / vytvořit nový díl / ignorovat

### Admin
- [ ] Přihlášení přes Supabase Auth (jen tvůj účet)
- [ ] Seznam nespárovaných produktů s návrhy, klávesové zkratky pro rychlé schvalování
- [ ] Editace kanonických dílů (název, OEM, kompatibilní modely, rada ke kvalitě)

> Realisticky: prvních pár set dílů bude hodně ruční práce. Je to investice, kterou konkurence nemá.

---

## 9. Fáze 4 – Veřejný katalog (MVP spuštění)

### URL struktura (SEO)
| Stránka | URL | Render |
|---|---|---|
| Homepage | `/` | SSG |
| Model | `/model/jawa-350-634` | ISR |
| Kategorie v modelu | `/model/jawa-350-634/motor` | ISR |
| Díl | `/dil/05-11-010-karburator-jikov-2917` | ISR |
| Vyhledávání | `/hledat?q=` | SSR, `noindex` |
| E-shopy | `/obchody`, `/obchody/fichtlkramek` | ISR |

### Úkoly
- [ ] Stránka dílu: tabulka nabídek (cena, sklad, doprava, odkaz), kompatibilní modely, rada ke kvalitě, graf ceny
- [ ] Stránka modelu: přehled kategorií a nejhledanějších dílů
- [ ] Vyhledávání: název, OEM (s normalizací!), model – Postgres full-text + trigram (`pg_trgm`), unaccent pro diakritiku
- [ ] Proklik přes `/go/[shopProductId]` → zápis do `clicks` → 302 redirect s UTM
- [ ] Structured data: `Product` + `AggregateOffer` jen z reálných dat
- [ ] `sitemap.xml` generovaná z DB, `robots.txt`
- [ ] Text „Aktualizováno: …“ u cen (důvěra + transparentnost)

**Kritérium spuštění:** min. 3 e-shopy s feedem, min. 300 spárovaných dílů pro 2–3 nejpopulárnější modely.

---

## 10. Fáze 5 – Optimalizátor košíku

### Algoritmus (přesný, e-shopů je málo)
```
pro každou neprázdnou podmnožinu S e-shopů (max 2^8 = 256):
    pro každý díl v košíku vyber nejlevnější skladovou nabídku v S
    pokud některý díl v S není → přeskoč
    pro každý e-shop v S:
        poštovné = 0 pokud mezisoučet >= free_shipping_from, jinak shipping_price
    celkem = součet cen + součet poštovného
vrať podmnožinu s nejnižším celkem (+ nejlepší single-shop variantu pro srovnání)
```
- [ ] Doladění: v rámci vybrané podmnožiny zkusit přesunout položky tak, aby e-shop dosáhl dopravy zdarma
- [ ] Unit testy na hraniční případy (doprava zdarma, chybějící díl, 1 e-shop)
- [ ] Košík v `localStorage`, sdílení košíku odkazem (`/kosik?items=…`)
- [ ] Zobrazení: „Nejlevnější celkem“ vs. „Vše z jednoho obchodu“ + rozdíl v Kč
- [ ] Poznámka: poštovné je orientační (liší se podle váhy a způsobu dopravy)

---

## 11. Fáze 6 – Interaktivní rozkresy

- [ ] Vybrat 2–3 motory s největší poptávkou (Pionýr 20/21/23, Jawa 634, Panelka)
- [ ] **Právo:** dobové katalogy mohou být chráněné autorským právem – ideálně nakreslit vlastní rozkresy (SVG) podle předlohy, nebo získat souhlas
- [ ] Formát: SVG + JSON s hotspoty (`{ position, oem_number, x, y }`) navázané na `parts.oem_number`
- [ ] Klik na pozici → panel s nabídkami + „přidat do košíku“
- [ ] Vždy jeden rozkres = jedna sestava jednoho modelu (ne mix dílů z různých motorů)

---

## 12. Fáze 7 – Monetizace a růst

### Příjmy (postupně)
1. **Affiliate** u e-shopů, které mají partnerský program
2. **CPC dohody** – po prokázání prokliků (data z tabulky `clicks`)
3. **Zvýhodněný profil e-shopu** (logo, zvýraznění – vždy označené jako reklama)
4. Později: Autodílomat.cz na stejném jádru

### Růst
- [ ] Komunita: Facebook skupiny veteránistů, fóra, srazy (waitlist z Fáze 0 = první uživatelé)
- [ ] Obsah: průvodce „Co koupit na renovaci motoru 634“ (nákupní seznamy → přímo do optimalizátoru)
- [ ] Hlídání ceny dílu e-mailem (znovu využije waitlist infrastrukturu)
- [ ] Křížové odkazy z vlastních webů o Jawě

---

## 13. Právní checklist

- [ ] Identifikace provozovatele na webu (jméno, IČO, sídlo / kontakt)
- [ ] Zásady zpracování osobních údajů (waitlist, později hlídání cen)
- [ ] Analytika bez cookies → není potřeba cookie lišta; při zavedení marketingových cookies lišta nutná
- [ ] „JAWA“, „ČZ“ používat popisně (kompatibilita dílů), ne jako vlastní značku; žádná oficiální loga
- [ ] Údaje o e-shopech jen ověřené; žádná vymyšlená hodnocení
- [ ] Obrázky produktů jen z feedů se svolením
- [ ] Placené zvýraznění vždy viditelně označit
- [ ] Zvážit slovní ochrannou známku „Motodílomat“ (ÚPV) po spuštění

*Není to právní poradenství – u sporných bodů ověřit s právníkem.*

---

## 14. Jak spolupracovat s Claude / Claude Code

1. **`CLAUDE.md` v kořeni repa** – krátký kontext (co je projekt, stack, principy ze sekce 2, konvence). Claude Code ho čte automaticky.
2. **Tento dokument** v `docs/ROADMAP.md` – odškrtávat hotové úkoly.
3. **Jedna fáze = jedna větev + PR.** Na začátku session: „Pokračujeme Fází X, přečti docs/ROADMAP.md.“
4. **Malé kroky:** zadávat úkoly po jednotlivých checkboxech, po každém build + test.
5. **Tajné klíče nikdy do repa** – jen Vercel env proměnné a lokální `.env.local` (v `.gitignore`).
6. **Architektonická rozhodnutí** zapisovat do `docs/decisions.md` (datum, rozhodnutí, proč).

### Šablona `CLAUDE.md`
```md
# MotoDílomat.cz
Srovnávač cen náhradních dílů pro dvoutakty z ČSSR (Jawa, ČZ, Babetta, Stadion).
Páruje nabídky e-shopů podle OEM katalogových čísel, rozkresy, optimalizátor košíku.

## Stack
Next.js (App Router) + Tailwind, Supabase (Postgres), Vercel.

## Pravidla
- Na veřejném webu nikdy vymyšlená data (ceny, sklady, hodnocení e-shopů).
- Service role klíč Supabase jen na serveru.
- Každá stránka dílu/modelu musí být serverově renderovaná a indexovatelná.
- Texty webu česky.
- Plán a stav: docs/ROADMAP.md
```
