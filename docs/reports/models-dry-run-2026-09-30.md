<!-- Vygenerováno: scripts/dry-run-models.ts (read-only), 2026-09-30, nad pending řádky shop_products v projektu motodilomat. Do part_models se NIC nezapsalo. -->

> **Jak vznikl:** 4 808 pending řádků (javarna 87, jawa-korda 236, motojelinek 151, motokramek 89, motomax 4 245).
> Parser běžel nad 3 898 řádky, které obsahují aspoň jedno klíčové slovo (značka/přezdívka); 910 řádků motomaxu
> (všechny s kategorií „Díly Babetta, Simson, Jawa, ČZ“ v `category_text`, v názvu nic) se počítá jako „bez shody“.
> U motomaxu je v názvu model většinou na konci, proto je kvůli přenosu dat ukázkám ořezán začátek názvu
> (u motojelinku je název celý). Skript jde spustit znovu nad živou DB:
> `SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… npx tsx scripts/dry-run-models.ts`.
> Ukázky jsou z řádků s nějakou shodou; řádky bez shody mají vlastní sekci.

# Dry-run: párování dílů podle modelu (nic se nezapisuje)

Celkem pending řádků: **4808**

## Pokrytí po shopech a match_level

| shop | řádků | type | nickname | displacement | brand | none | pokryto modelem (type+nickname) |
|---|---:|---:|---:|---:|---:|---:|---:|
| javarna | 87 | 32 (36.8 %) | 35 (40.2 %) | 3 (3.4 %) | 17 (19.5 %) | 0 (0.0 %) | 77.0 % |
| jawa-korda | 236 | 63 (26.7 %) | 74 (31.4 %) | 13 (5.5 %) | 86 (36.4 %) | 0 (0.0 %) | 58.1 % |
| motojelinek | 151 | 50 (33.1 %) | 57 (37.7 %) | 5 (3.3 %) | 39 (25.8 %) | 0 (0.0 %) | 70.9 % |
| motokramek | 89 | 32 (36.0 %) | 28 (31.5 %) | 1 (1.1 %) | 28 (31.5 %) | 0 (0.0 %) | 67.4 % |
| motomax | 4245 | 1738 (40.9 %) | 727 (17.1 %) | 54 (1.3 %) | 776 (18.3 %) | 950 (22.4 %) | 58.1 % |
| **celkem** | 4808 | 1915 (39.8 %) | 921 (19.2 %) | 76 (1.6 %) | 946 (19.7 %) | 950 (19.8 %) | 59.0 % |

## 30 náhodných ukázek (název → modely → úroveň)

- Osa kola (PŘEDNÍ), ČERNÁ - ČZ 125/150 C → ČZ → brand
- s nýty  ,,JAWA 50/23 MUSTANG  *M → mustang-23 → type
- tachometru  STADION, JAWETTA, JAWA 50 555 - chrom → jawetta, pionyr-555, stadion-s11, stadion-s22, stadion-s23 → type
- páky M7 JAWA, ČZ → Jawa, ČZ → brand
- Koš spojky JAWA 50 - 05, 20, 21, 23  *M → mustang-23, pionyr-05, pionyr-20, pionyr-21 → type
- Pístní sada P+L s kroužky 58,25,na čep 16 - Jawa 350 → Jawa 350 ccm → displacement
- rovný Levý JAWA, ČZ (černý)  *M → Jawa, ČZ → brand
- teleskop  BABETTA -sada *M → Babetta → brand
- kola řetězu JAWA 50 - 550, 555, 05, 20 ,21 ,23 → mustang-23, pionyr-05, pionyr-20, pionyr-21, pionyr-550, pionyr-555 → type
- k nástřiku JAWA 20 2ks  *M → pionyr-20 → type
- masky Jawa 50 pionýr 550, 555, 05, 20, 21, 23 podélná díra → mustang-23, pionyr-05, pionyr-20, pionyr-21, pionyr-550, pionyr-555 → type
- Elektroinstalace - JAWA 90, Cross, Roadster, Trail → jawa-90 → nickname
- světel STADION S22 - chrom → stadion-s22 → nickname
- spojky 120x3 JAWA 638 → jawa-350-638 → type
- k navaření JAWA 50 - 550, 555 surový  *M → pionyr-550, pionyr-555 → type
- válce zadní JAWA 350 - 639, 640 → jawa-350-639, jawa-350-640 → type
- zamykatelná JAWA 350 - 634, 638, 639, 640 - chrom → jawa-350-634, jawa-350-638, jawa-350-639, jawa-350-640 → type
- kola 56mm JAWA Kývačka/Panelka → kyvacka-175, kyvacka-250, kyvacka-350, panelka-250, panelka-350 → nickname
- vidlice  BABETTA 207, 210, 225 - sada 2ks červené  *M → babetta-207, babetta-210, babetta-225 → type
- Prsíčka úplná JAWA 50 - 555 Deluxe → pionyr-555 → type
- karburátor JAWA 50 - 550, 555 (sada) → pionyr-550, pionyr-555 → type
- cívka 30W JAWA 50 - 20, 21, 23 → mustang-23, pionyr-20, pionyr-21 → type
- světlometu STADION, JAWETTA -pryž → jawetta, stadion-s11, stadion-s22, stadion-s23 → nickname
- baterie JAWA Kývačka, Panelka, ČZ → kyvacka-175, kyvacka-250, kyvacka-350, panelka-250, panelka-350 → nickname
- Držák přístrojů - Jawa 350 638-639 → jawa-350-638, jawa-350-639 → type
- svítilny BABETTA 210, 22 → babetta-210 → type
- Potah sedla JAWA 350 - 632, 638, 639 -černý (originál molitan) → jawa-350-638, jawa-350-639 → type
- Born To Ride Babetta 210 → babetta-210 → type
- JAWA 350, typ 361, mléčná čokoláda 100 g → Jawa 350 ccm → displacement
- koše JAWA - ČZ, ČZ 356, 450, 455, 477 → kyvacka-175 → type

## Řádky bez shody: 950

20 ukázek:

- [motomax] 6V 75W ,,CZ
- [motomax] Nálepka STELLA  fialová  2ks  *M
- [motomax] vidlice  STELLA
- [motomax] Pouzdro kyvné vidlice ocelové SIMSON Skútr
- [motomax] 207/210/225  *M
- [motomax] Nálepka STELLA červená  2ks  *M
- [motomax] paliva  STELLA
- [motomax] Košík na BABETTU - černý
- [motomax] pravý Stella
- [motomax] objímkou  ,,CZ
- [motomax] (cena 1m)  ,,CZ
- [motomax] horní Stella
- [motomax] SIMSON  ,,CZ
- [motomax] (základní Babetta)
- [motomax] Šlapadla na BABETTU hnědé (pryž-ocel-ložiska) -pár
- [motomax] pedálu brzdy STELLA  *M
- [motomax] Pouzdro kyvné vidlice ocelové SIMSON
- [motomax] rozety STELLA  *M
- [motomax] kola Stella
- [motomax] Šroub kyvné vidlice SIMSON

## Nerozřešené tokeny (četnost v řádcích)

| značka/kontext | typ | token | řádků |
|---|---|---|---:|
| ČZ | number | 125 | 145 |
| Babetta | nickname | stella | 78 |
| ČZ | number | 175 | 69 |
| ČZ | number | 477 | 68 |
| ČZ | number | 487 | 57 |
| ČZ | number | 150 | 49 |
| ČZ | number | 472 | 47 |
| ČZ | number | 471 | 44 |
| ČZ | number | 476 | 41 |
| Jawa/ČZ | number | 125 | 38 |
| ČZ | number | 488 | 36 |
| Jawa/ČZ | number | 355 | 29 |
| ČZ | number | 450 | 29 |
| Jawa/ČZ | number | 450 | 29 |
| ČZ | number | 250 | 28 |
| Jawa/ČZ | number | 455 | 27 |
| ČZ | number | 455 | 21 |
| Babetta | nickname | star | 21 |
| Babetta | number | 206 | 18 |
| ČZ | number | 453 | 16 |
| Jawa/ČZ | number | 352 | 15 |
| ČZ | number | 502 | 15 |
| Jawa | number | 632 | 15 |
| Jawa/ČZ | number | 150 | 14 |
| ČZ | number | 470 | 14 |
| Jawa/ČZ | number | 351 | 13 |
| Jawa/ČZ | number | 453 | 12 |
| — | nickname | stella | 12 |
| ČZ | number | 350 | 11 |
| Jawa/ČZ | number | 477 | 11 |
| Jawa | nickname | californian | 11 |
| ČZ | number | 501 | 10 |
| Jawa/ČZ | number | 470 | 9 |
| Jawa/ČZ | number | 487 | 9 |
| Jawa | number | 590 | 9 |
| Jawa | nickname | bizon | 8 |
| Babetta | number | 215 | 5 |
| Jawa | number | 360 | 5 |
| ČZ | number | 473 | 5 |
| ČZ | number | 475 | 5 |
| Jawa | number | 551 | 5 |
| Jawa | number | 361 | 4 |
| — | nickname | californian | 4 |
| Jawa | nickname | ogar | 4 |
| Jawa | number | 210 | 3 |
| Jawa | number | 225 | 3 |
| ČZ | number | 356 | 3 |
| Jawa | number | 362 | 3 |
| Jawa/ČZ | number | 475 | 3 |
| Jawa | number | 633 | 3 |
| Jawa | nickname | libenak | 3 |
| Jawa/Babetta | nickname | stella | 3 |
| Jawa/Babetta | number | 206 | 2 |
| Jawa/ČZ | number | 473 | 2 |
| Babetta | number | 000 | 1 |
| Babetta | number | 002 | 1 |
| Babetta | number | 021 | 1 |
| Babetta | number | 022 | 1 |
| Babetta | number | 023 | 1 |
| Babetta | number | 100 | 1 |
| Babetta | number | 121 | 1 |
| Babetta | number | 122 | 1 |
| Babetta | number | 123 | 1 |
| Jawa | number | 125 | 1 |
| ČZ | number | 180 | 1 |
| Jawa/Babetta | number | 215 | 1 |
| Babetta | number | 220 | 1 |
| Jawa | number | 300 | 1 |
| Jawa | number | 355 | 1 |
| ČZ | number | 355 | 1 |
| Jawa/ČZ | number | 361 | 1 |
| Jawa/ČZ | number | 362 | 1 |
| Jawa/ČZ | number | 365 | 1 |
| ČZ | number | 485 | 1 |
| ČZ | number | 500 | 1 |
| Jawa/ČZ | number | 501 | 1 |
| Čezeta | number | 501 | 1 |
| ČZ | number | 505 | 1 |
| Stadion/Jawa | number | 551 | 1 |
| Velorex | number | 562 | 1 |
| … | | dalších 9 tokenů | |

## Podezřelé případy

### Jeden díl na víc než 6 modelů: 30 názvů

- Hřídel převodovky, hlavní (CZ) - JAWA Kývačka, Panelka, Pérák,Sport, Velorex → kyvacka-175, kyvacka-250, kyvacka-350, panelka-250, panelka-350, perak-250, perak-350, velorex-350 → nickname (8 modelů)
- Zámek řízení Pionýr/Kývačka/Babetta 207 - dovoz → babetta-207, kyvacka-175, kyvacka-250, kyvacka-350, pionyr-05, pionyr-20, pionyr-21 → type (7 modelů)
- *JIKOV karb. BABETTA, JAWA 50 - 555, 05, 20, 21, 23, STADION  *M → mustang-23, pionyr-05, pionyr-20, pionyr-21, pionyr-555, stadion-s11, stadion-s22, stadion-s23 → type (8 modelů)
- x 2 x 1,6mm  STADION, JAWA 50 - 05, 20, 21, 23, BABETTA  ,,CZ → mustang-23, pionyr-05, pionyr-20, pionyr-21, stadion-s11, stadion-s22, stadion-s23 → type (7 modelů)
- 38,75x2mm  STADION, JAWA 50 - 05, 20, 21, 23 "B → mustang-23, pionyr-05, pionyr-20, pionyr-21, stadion-s11, stadion-s22, stadion-s23 → type (7 modelů)
- 39,75x2mm  STADION, JAWA 50 - 05, 20, 21, 23, BABETTA  "B → mustang-23, pionyr-05, pionyr-20, pionyr-21, stadion-s11, stadion-s22, stadion-s23 → type (7 modelů)
- 40,00x2mm  STADION, JAWA 50 - 05, 20, 21, 23, BABETTA  "B → mustang-23, pionyr-05, pionyr-20, pionyr-21, stadion-s11, stadion-s22, stadion-s23 → type (7 modelů)
- 40,50x2mm  STADION, JAWA 50 - 05, 20, 21, 23, BABETTA  ,,CZ → mustang-23, pionyr-05, pionyr-20, pionyr-21, stadion-s11, stadion-s22, stadion-s23 → type (7 modelů)
- 40,50x2mm  STADION, JAWA 50 - 05, 20, 21, 23, BABETTA  "B → mustang-23, pionyr-05, pionyr-20, pionyr-21, stadion-s11, stadion-s22, stadion-s23 → type (7 modelů)
- 40,75x2mm  STADION, JAWA 50 - 05, 20, 21, 23, BABETTA  ,,CZ → mustang-23, pionyr-05, pionyr-20, pionyr-21, stadion-s11, stadion-s22, stadion-s23 → type (7 modelů)
- 40.25x2mm  STADION, JAWA 50 - 05, 20, 21, 23, BABETTA  ,,CZ → mustang-23, pionyr-05, pionyr-20, pionyr-21, stadion-s11, stadion-s22, stadion-s23 → type (7 modelů)
- 41,00x2mm  STADION, JAWA 50 - 05, 20, 21, 23, BABETTA  ,,CZ → mustang-23, pionyr-05, pionyr-20, pionyr-21, stadion-s11, stadion-s22, stadion-s23 → type (7 modelů)
- 41,00x2mm  STADION, JAWA 50 - 05, 20, 21, 23, BABETTA  "B → mustang-23, pionyr-05, pionyr-20, pionyr-21, stadion-s11, stadion-s22, stadion-s23 → type (7 modelů)
- 41,25x2mm  STADION, JAWA 50 - 05, 20, 21, 23, BABETTA  "B → mustang-23, pionyr-05, pionyr-20, pionyr-21, stadion-s11, stadion-s22, stadion-s23 → type (7 modelů)
- koše spojky JAWA Pérák, Kývačka, Panelka, 634, 640, ČZ 471, 472 *Origiál → jawa-350-634, jawa-350-640, kyvacka-175, kyvacka-250, kyvacka-350, panelka-250, panelka-350, perak-250, perak-350 → type (9 modelů)
- lamela II. JAWA Pérák/Kývačka (koš spojky Panelka) → kyvacka-175, kyvacka-250, kyvacka-350, panelka-250, panelka-350, perak-250, perak-350 → nickname (7 modelů)
- M8x230mm JAWA 50 - 555, 05, 20, 21, 23, BABETTA 228, 206, 207 *M → babetta-207, babetta-228, mustang-23, pionyr-05, pionyr-20, pionyr-21, pionyr-555 → type (7 modelů)
- motoru STADION, JAWETTA, JAWA 50 - 550, 555, 05, 20, 21, 23 → jawetta, mustang-23, pionyr-05, pionyr-20, pionyr-21, pionyr-550, pionyr-555, stadion-s11, stadion-s22, stadion-s23 → type (10 modelů)
- ocelová JAWA Pérák, Kývačka, Panelka → kyvacka-175, kyvacka-250, kyvacka-350, panelka-250, panelka-350, perak-250, perak-350 → nickname (7 modelů)
- páky JAWA Pérák, JAWA 50 - 550, 555, 05, 20, 21, 23 → mustang-23, perak-250, perak-350, pionyr-05, pionyr-20, pionyr-21, pionyr-550, pionyr-555 → type (8 modelů)
- řízení BABETTA 207, 210, 225 - JAWA 50 - 550, 555, 05, 20, 21, 23 (klec)  *M → babetta-207, babetta-210, babetta-225, mustang-23, pionyr-05, pionyr-20, pionyr-21, pionyr-550, pionyr-555 → type (9 modelů)
- rozety JAWA Kývačka, Panelka, 634, 640 -zinek → jawa-350-634, jawa-350-640, kyvacka-175, kyvacka-250, kyvacka-350, panelka-250, panelka-350 → type (7 modelů)
- s kuličkami JAWA Pérák, Kývačka, Panelka, JAWA-ČZ, ČZ → kyvacka-175, kyvacka-250, kyvacka-350, panelka-250, panelka-350, perak-250, perak-350 → nickname (7 modelů)
- spínače JAWA Pérák, Kývačka, Panelka -nerez → kyvacka-175, kyvacka-250, kyvacka-350, panelka-250, panelka-350, perak-250, perak-350 → nickname (7 modelů)
- spojky  JAWA Pérák, Kývačka, Panelka → kyvacka-175, kyvacka-250, kyvacka-350, panelka-250, panelka-350, perak-250, perak-350 → nickname (7 modelů)
- spouštěče JAWA Pérák, Kývačka, Panelka, 634, ČZ 356, 450, 455, 502 → jawa-350-634, kyvacka-175, kyvacka-250, kyvacka-350, panelka-250, panelka-350, perak-250, perak-350 → type (8 modelů)
- STADION, JAWA 50 - 05, 20, 21, 23 ,,CZ → mustang-23, pionyr-05, pionyr-20, pionyr-21, stadion-s11, stadion-s22, stadion-s23 → type (7 modelů)
- STADION, JAWA 50 - 05, 20, 21, 23, BABETTA  ,,CZ → mustang-23, pionyr-05, pionyr-20, pionyr-21, stadion-s11, stadion-s22, stadion-s23 → type (7 modelů)
- x 2 x 1,5mm STADION, JAWA 50 - 05, 20, 21, 23 ,,CZ → mustang-23, pionyr-05, pionyr-20, pionyr-21, stadion-s11, stadion-s22, stadion-s23 → type (7 modelů)
- Zámek řízení JAWA 05, 20, 21, 23, BABETTA 207, JAWA Kývačka, ČZ 175 - 450, 470  *M → babetta-207, kyvacka-175, kyvacka-250, kyvacka-350, mustang-23, pionyr-05, pionyr-20, pionyr-21 → type (8 modelů)

### Konflikty mezi řadami: 227 názvů

- brzdový klíč Stadion a Jawetta → jawetta, stadion-s11, stadion-s22, stadion-s23 → nickname [Jawetta + Stadion]
- brzdy čelist Stadion D10mm PROFI - Stadion , Jawetta → jawetta, stadion-s11, stadion-s22, stadion-s23 → nickname [Jawetta + Stadion]
- pro ciferník Jawa 50 Pionýr, Babetta, Stadion → pionyr-05, pionyr-20, pionyr-21, stadion-s11, stadion-s22, stadion-s23 → nickname [Jawa 50 + Stadion]
- zadní tlumič Stadion S22, Jawetta - ČR → jawetta, stadion-s22 → nickname [Jawetta + Stadion]
- - 2,50" , Stadion, Jawetta apod. - Mitroc → jawetta, stadion-s11, stadion-s22, stadion-s23 → nickname [Jawetta + Stadion]
- Brzdový štít Stadion S11, S22, Jawetta - vyčištěno vodním paprskem → jawetta, stadion-s11, stadion-s22 → nickname [Jawetta + Stadion]
- cívka Stadion S11, S22, Jawetta → jawetta, stadion-s11, stadion-s22 → nickname [Jawetta + Stadion]
- Karburátor Jawa-ČZ 175, 250, 350 Kyvačka, Panelka a Velorex - D26 se sytičem → kyvacka-175, kyvacka-250, kyvacka-350, panelka-250, panelka-350, velorex-350 → nickname [Jawa 175–500 + Velorex]
- osky kola Stadion, Jawetta - M10 → jawetta, stadion-s11, stadion-s22, stadion-s23 → nickname [Jawetta + Stadion]
- s okroužkem Stadion, Jawetta → jawetta, stadion-s11, stadion-s22, stadion-s23 → nickname [Jawetta + Stadion]
- Zámek řízení Babetta 210, Korado, Jawa 350/634-640, ČZ 476, 477, 471, 472 → babetta-210, jawa-350-634, jawa-350-638, jawa-350-639, jawa-350-640 → type [Babetta + Jawa 175–500]
- žárovky - Jawa Panelka, Mustang a ČZ → mustang-23, panelka-250, panelka-350 → nickname [Jawa 175–500 + Jawa 50]
- dekompresoru Stadion S 11/22, Jawetta ZN → jawetta, stadion-s11, stadion-s22 → nickname [Jawetta + Stadion]
- Čep rozety Stadion Jawetta → jawetta, stadion-s11, stadion-s22, stadion-s23 → nickname [Jawetta + Stadion]
- Píst Jawa 50/550, 555, Stadion 11/22, Jawetta 38,25 mm → jawetta, pionyr-550, pionyr-555, stadion-s11, stadion-s22 → type [Jawa 50 + Jawetta + Stadion]
- Píst Jawa 50/550, 555, Stadion 11/22, Jawetta 38,50 mm → jawetta, pionyr-550, pionyr-555, stadion-s11, stadion-s22 → type [Jawa 50 + Jawetta + Stadion]
- Píst Jawa 50/550, 555, Stadion 11/22, Jawetta 39,75 mm → jawetta, pionyr-550, pionyr-555, stadion-s11, stadion-s22 → type [Jawa 50 + Jawetta + Stadion]
- převodovky Stadion Jawetta otevřené , CZ → jawetta, stadion-s11, stadion-s22, stadion-s23 → nickname [Jawetta + Stadion]
- Sklo světla Stadion, Jawetta → jawetta, stadion-s11, stadion-s22, stadion-s23 → nickname [Jawetta + Stadion]
- Stadion Jawetta → jawetta, stadion-s11, stadion-s22, stadion-s23 → nickname [Jawetta + Stadion]
- světla Stadion S11/S22 Jawetta 6V/15w Ba15d se stíněním → jawetta, stadion-s11, stadion-s22 → nickname [Jawetta + Stadion]
- tachometru Jawa 90, 23 Mustang → jawa-90, mustang-23 → type [Jawa 50 + Jawa 90]
- vidlice Stadion Jawetta → jawetta, stadion-s11, stadion-s22, stadion-s23 → nickname [Jawetta + Stadion]
- víka Stadion Jawetta → jawetta, stadion-s11, stadion-s22, stadion-s23 → nickname [Jawetta + Stadion]
- žárovky Stadion Jawetta Mototechna → jawetta, stadion-s11, stadion-s22, stadion-s23 → nickname [Jawetta + Stadion]
- Bowden přední brzdy - Stadion S22, Jawetta → jawetta, stadion-s22 → nickname [Jawetta + Stadion]
- Držák bzučáku, zesílený - Stadion, Jawetta → jawetta, stadion-s11, stadion-s22, stadion-s23 → nickname [Jawetta + Stadion]
- Filc víčka nádrže, ČERNÝ - JAWA 50 23, Stadion S22,S23 → mustang-23, stadion-s22, stadion-s23 → type [Jawa 50 + Stadion]
- Hřídel převodovky, hlavní (CZ) - JAWA Kývačka, Panelka, Pérák,Sport, Velorex → kyvacka-175, kyvacka-250, kyvacka-350, panelka-250, panelka-350, perak-250, perak-350, velorex-350 → nickname [Jawa 175–500 + Velorex]
- Kliková hřídel, CKR - Stadion, Jawetta → jawetta, stadion-s11, stadion-s22, stadion-s23 → nickname [Jawetta + Stadion]
