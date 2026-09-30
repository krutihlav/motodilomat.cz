<!-- Vygenerováno: scripts/dry-run-models.ts (read-only), 2026-09-30, nad pending řádky shop_products v projektu motodilomat. Do part_models se NIC nezapsalo. -->

> **Jak vznikl:** 4 808 pending řádků (javarna 87, jawa-korda 236, motojelinek 151, motokramek 89, motomax 4 245).
> Parser běžel nad 3 898 řádky, které obsahují aspoň jedno klíčové slovo (značka/přezdívka); 910 řádků motomaxu
> (všechny s kategorií „Díly Babetta, Simson, Jawa, ČZ“ v `category_text`, v názvu nic) se počítá jako „bez shody“.
> U motomaxu je v názvu model většinou na konci, proto je kvůli přenosu dat ukázkám ořezán začátek názvu
> (u motojelinku je název celý). Skript jde spustit znovu nad živou DB:
> `SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… npx tsx scripts/dry-run-models.ts`.
> Seed: finální 57 modelů (aktualizace úkolu 2 z 2026-09-30, ověřená typová čísla).
> Ukázky jsou z řádků s nějakou shodou; řádky bez shody mají vlastní sekci.

# Dry-run: párování dílů podle modelu (nic se nezapisuje)

Celkem pending řádků: **4808**

## Pokrytí po shopech a match_level

| shop | řádků | type | nickname | displacement | brand | none | pokryto modelem (type+nickname) |
|---|---:|---:|---:|---:|---:|---:|---:|
| javarna | 87 | 42 (48.3 %) | 33 (37.9 %) | 2 (2.3 %) | 10 (11.5 %) | 0 (0.0 %) | 86.2 % |
| jawa-korda | 236 | 99 (41.9 %) | 70 (29.7 %) | 19 (8.1 %) | 48 (20.3 %) | 0 (0.0 %) | 71.6 % |
| motojelinek | 151 | 63 (41.7 %) | 54 (35.8 %) | 15 (9.9 %) | 19 (12.6 %) | 0 (0.0 %) | 77.5 % |
| motokramek | 89 | 42 (47.2 %) | 28 (31.5 %) | 1 (1.1 %) | 18 (20.2 %) | 0 (0.0 %) | 78.7 % |
| motomax | 4245 | 1872 (44.1 %) | 728 (17.1 %) | 65 (1.5 %) | 641 (15.1 %) | 939 (22.1 %) | 61.2 % |
| **celkem** | 4808 | 2118 (44.1 %) | 913 (19.0 %) | 102 (2.1 %) | 736 (15.3 %) | 939 (19.5 %) | 63.0 % |

## 30 náhodných ukázek (název → modely → úroveň)

- nářadí  BAB/JAWA 8-10-12-17-19 → Jawa → brand
- 19"kola JAWA / ČZ 473, 470, 475 Sport, Californian → californian-362, cz-125-473, cz-175-470, cz-250-475, sport-250-590, sport-350-361 → type
- kola úpl. JAWA, ČZ (D=42mm) → Jawa, ČZ → brand
- výfuku JAWA 638-640 → jawa-350-638, jawa-350-639, jawa-350-640 → type
- úpl. JAWA 350 - 634, ČZ 477, 487 → cz-175-477, cz-175-487, jawa-350-634 → type
- hřídele levý Jawa ČZ 125 150 C 351 352 → cz-125-c, cz-150-352, cz-150-c → type
- bowdenu ČZ 125, 175, 250 De luxe (širší drážka)  *M → ČZ 125 ccm, ČZ 175 ccm, ČZ 250 ccm → displacement
- spojky ČZ 125, 150 C → cz-125-c, cz-150-c → type
- kola JAWA/ČZ (D=42mm) → Jawa, ČZ → brand
- těžká spojka BABETTA 210, 225 - RS → babetta-210, babetta-225 → type
- kolečko 17z. JAWA 350 - 634, 638, 639, 640, ČZ 471, 472, 476, 477, 487, 488 MZ250 → cz-125-476, cz-125-488, cz-175-477, cz-175-487, cz-250-471, cz-350-472, jawa-350-634, jawa-350-638, jawa-350-639, jawa-350-640 → type
- madla levý JAWA 350 - 640 → jawa-350-640 → type
- (velký) BABETTA 210, 225 - černý lak → babetta-210, babetta-225 → type
- s vypínačem BABETTA 210, 225, STELLA *SIM (náhrada s paticí P26s) *M → babetta-134, babetta-210, babetta-225 → type
- Nádrž paliva BABETTA 210, 225 - černá  *M → babetta-210, babetta-225 → type
- (sada) BABETTA, KORADO - Alu  *M → Babetta → brand
- páka úpl. JAWA Kývačka, Panelka, 634, ČZ → jawa-350-634, kyvacka-250, kyvacka-350, panelka-250-559, panelka-250-592, panelka-350-360 → type
- statoru JAWA 634, ČZ 477, 487 orig. → cz-175-477, cz-175-487, jawa-350-634 → type
- rukojeti STADION / JAWETTA → jawetta, stadion-s11, stadion-s22, stadion-s23 → nickname
- k nástřiku JAWA 21 2ks  *M → pionyr-21 → type
- krytu řetězu JAWA Kývačka, Panelka ,,TR kryt,, → kyvacka-250, kyvacka-350, panelka-250-559, panelka-250-592, panelka-350-360 → nickname
- Válec BABETTA 228, 207 (včetně 4x závrtný šroub) → babetta-207, babetta-228 → type
- / zadní JAWA 50 - 550  *M → pionyr-550 → type
- na obsluhu Jawa 50 - 555  *M → pionyr-555 → type
- hlavní d=65 JAWA 50 - 05, 20, 21, 23  *M → mustang-23, pionyr-05, pionyr-20, pionyr-21 → type
- tachometru JAWA 50 - 20 → pionyr-20 → type
- 24x28x20mm JAWA 350 Kývačka, Panelka → kyvacka-350, panelka-350-360 → nickname
- teleskopu JAWA 350 - 634, 638, 639, 640 → jawa-350-634, jawa-350-638, jawa-350-639, jawa-350-640 → type
- úpl. BABETTA 228, 207  *M → babetta-207, babetta-228 → type
- příručka BABETTA 228 *M → babetta-228 → type

## Řádky bez shody: 939

20 ukázek:

- [motomax] Košík na BABETTU - černý
- [motomax] Šlapadla na BABETTU hnědé (pryž-ocel-ložiska) -pár
- [motomax] objímkou  ,,CZ
- [motomax] Pouzdro kyvné vidlice ocelové SIMSON Skútr
- [motomax] 6V 75W ,,CZ
- [motomax] Šroub kyvné vidlice SIMSON
- [motomax] 207/210/225  *M
- [motomax] SIMSON  ,,CZ
- [motomax] (základní Babetta)
- [motomax] Šroub kyvné vidlice SIMSON Skútr
- [motomax] (cena 1m)  ,,CZ
- [motomax] Pouzdro kyvné vidlice ocelové SIMSON

## Nerozřešené tokeny (četnost v řádcích)

| značka/kontext | typ | token | řádků |
|---|---|---|---:|
| Babetta | number | 206 | 18 |
| Jawa | number | 632 | 15 |
| Jawa/ČZ | number | 351 | 13 |
| Jawa | nickname | bizon | 8 |
| Babetta | number | 215 | 5 |
| Jawa | nickname | ogar | 4 |
| Jawa | number | 633 | 3 |
| Jawa | nickname | libenak | 3 |
| Jawa/Babetta | number | 206 | 2 |
| Babetta | number | 000 | 1 |
| Babetta | number | 002 | 1 |
| Babetta | number | 021 | 1 |
| Babetta | number | 022 | 1 |
| Babetta | number | 023 | 1 |
| Babetta | number | 100 | 1 |
| Babetta | number | 121 | 1 |
| Babetta | number | 122 | 1 |
| Babetta | number | 123 | 1 |
| ČZ | number | 180 | 1 |
| Jawa/Babetta | number | 215 | 1 |
| Babetta | number | 220 | 1 |
| Jawa | number | 300 | 1 |
| Jawa/ČZ | number | 365 | 1 |
| ČZ | number | 485 | 1 |
| ČZ | number | 500 | 1 |
| ČZ | number | 505 | 1 |
| Velorex | number | 562 | 1 |
| Jawa | number | 585 | 1 |
| Jawa | number | 593 | 1 |
| ČZ | nickname | bizon | 1 |
| Jawa | nickname | calif | 1 |
| — | nickname | ogar | 1 |

## Podezřelé případy

### Jeden díl na víc než 6 modelů: 77 názvů

- Karburátor ČZ 250/471, 350/472, 125/477, 487, 501, 502 skůtr, Jawa 350/632, 634 - D26 → cezeta-501, cezeta-502, cz-175-477, cz-175-487, cz-250-471, cz-350-472, jawa-350-634 → type (7 modelů)
- Zámek řízení Babetta 210, Korado, Jawa 350/634-640, ČZ 476, 477, 471, 472 → babetta-210, cz-125-476, cz-175-477, cz-250-471, cz-350-472, jawa-350-634, jawa-350-638, jawa-350-639, jawa-350-640 → type (9 modelů)
- tlumiče Jawa 634-640, ČZ 476-488 → cz-125-476, cz-125-488, cz-175-477, cz-175-487, jawa-350-634, jawa-350-638, jawa-350-639, jawa-350-640 → type (8 modelů)
- Hřídel převodovky, hlavní (CZ) - JAWA Kývačka, Panelka, Pérák,Sport, Velorex → kyvacka-250, kyvacka-350, panelka-250-559, panelka-250-592, panelka-350-360, perak-250, perak-350, velorex-350 → nickname (8 modelů)
- Guma rozety Jawa Panelka/634-640 - CZ → jawa-350-634, jawa-350-638, jawa-350-639, jawa-350-640, panelka-250-559, panelka-250-592, panelka-350-360 → type (7 modelů)
- *JIKOV karb. BABETTA, JAWA 50 - 555, 05, 20, 21, 23, STADION  *M → mustang-23, pionyr-05, pionyr-20, pionyr-21, pionyr-555, stadion-s11, stadion-s22, stadion-s23 → type (8 modelů)
- kolečko 16z. JAWA 350 - 634, 638, 639, 640, ČZ 471, 472, 476, 477, 487, 488 MZ250 → cz-125-476, cz-125-488, cz-175-477, cz-175-487, cz-250-471, cz-350-472, jawa-350-634, jawa-350-638, jawa-350-639, jawa-350-640 → type (10 modelů)
- kolečko 17z. JAWA 350 - 634, 638, 639, 640, ČZ 471, 472, 476, 477, 487, 488 MZ250 → cz-125-476, cz-125-488, cz-175-477, cz-175-487, cz-250-471, cz-350-472, jawa-350-634, jawa-350-638, jawa-350-639, jawa-350-640 → type (10 modelů)
- kolečko 18z. JAWA 350 - 634, 638, 639, 640, ČZ 471, 472, 476, 477, 487, 488 MZ250 → cz-125-476, cz-125-488, cz-175-477, cz-175-487, cz-250-471, cz-350-472, jawa-350-634, jawa-350-638, jawa-350-639, jawa-350-640 → type (10 modelů)
- kolečko 19z. JAWA 350 - 634, 638, 639, 640, ČZ 471, 472, 476, 477, 487, 488 MZ250 → cz-125-476, cz-125-488, cz-175-477, cz-175-487, cz-250-471, cz-350-472, jawa-350-634, jawa-350-638, jawa-350-639, jawa-350-640 → type (10 modelů)
- náboj rozety JAWA Panelka, 634-640, ČZ 477, 472 → cz-175-477, cz-350-472, jawa-350-634, jawa-350-638, jawa-350-639, jawa-350-640, panelka-250-559, panelka-250-592, panelka-350-360 → type (9 modelů)
- řadící páka  JAWA 634, 638, 639, 640, ČZ 477, 487, 471, 472  ,,TW → cz-175-477, cz-175-487, cz-250-471, cz-350-472, jawa-350-634, jawa-350-638, jawa-350-639, jawa-350-640 → type (8 modelů)
- tyčky spojky JAWA - ČZ - 355, 356, 450, 453, 455, 477, 487 ,,sada,, → cz-125-453, cz-175-450, cz-175-477, cz-175-487, cz-250-455, jawa-cz-125-355, jawa-cz-175-356 → type (7 modelů)
- x 2 x 1,6mm  STADION, JAWA 50 - 05, 20, 21, 23, BABETTA  ,,CZ → mustang-23, pionyr-05, pionyr-20, pionyr-21, stadion-s11, stadion-s22, stadion-s23 → type (7 modelů)
- / řadící ČZ 453/450/455/476/477/488/487 → cz-125-453, cz-125-476, cz-125-488, cz-175-450, cz-175-477, cz-175-487, cz-250-455 → type (7 modelů)
- / zadní JAWA Panelka, 634 - 640, ČZ 477, 487, 472  *M → cz-175-477, cz-175-487, cz-350-472, jawa-350-634, jawa-350-638, jawa-350-639, jawa-350-640, panelka-250-559, panelka-250-592, panelka-350-360 → type (10 modelů)
- / zadní JAWA Panelka, 634, 638, ČZ 125, 175 - 477, 487 → cz-175-477, cz-175-487, jawa-350-634, jawa-350-638, panelka-250-559, panelka-250-592, panelka-350-360 → type (7 modelů)
- 12z. JAWA 250, 350 Pérák, Kývačka, Panelka → kyvacka-250, kyvacka-350, panelka-250-559, panelka-250-592, panelka-350-360, perak-250, perak-350 → nickname (7 modelů)
- 24 z.  JAWA 250 / 350 Pérák, Kývačka, Panelka → kyvacka-250, kyvacka-350, panelka-250-559, panelka-250-592, panelka-350-360, perak-250, perak-350 → nickname (7 modelů)
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
- brzdy JAWA Panelka, 634 - 640, ČZ 487 → cz-175-487, jawa-350-634, jawa-350-638, jawa-350-639, jawa-350-640, panelka-250-559, panelka-250-592, panelka-350-360 → type (8 modelů)

### Konflikty mezi řadami: 345 názvů

- brzdový klíč Stadion a Jawetta → jawetta, stadion-s11, stadion-s22, stadion-s23 → nickname [Jawetta + Stadion]
- brzdy čelist Stadion D10mm PROFI - Stadion , Jawetta → jawetta, stadion-s11, stadion-s22, stadion-s23 → nickname [Jawetta + Stadion]
- pro ciferník Jawa 50 Pionýr, Babetta, Stadion → pionyr-05, pionyr-20, pionyr-21, stadion-s11, stadion-s22, stadion-s23 → nickname [Jawa 50 + Stadion]
- zadní tlumič Stadion S22, Jawetta - ČR → jawetta, stadion-s22 → nickname [Jawetta + Stadion]
- - 2,50" , Stadion, Jawetta apod. - Mitroc → jawetta, stadion-s11, stadion-s22, stadion-s23 → nickname [Jawetta + Stadion]
- Brzdový štít Stadion S11, S22, Jawetta - vyčištěno vodním paprskem → jawetta, stadion-s11, stadion-s22 → nickname [Jawetta + Stadion]
- cívka Stadion S11, S22, Jawetta → jawetta, stadion-s11, stadion-s22 → nickname [Jawetta + Stadion]
- Karburátor ČZ 250/471, 350/472, 125/477, 487, 501, 502 skůtr, Jawa 350/632, 634 - D26 → cezeta-501, cezeta-502, cz-175-477, cz-175-487, cz-250-471, cz-350-472, jawa-350-634 → type [Jawa 250/350/500 + ČZ + Čezeta]
- Karburátor Jawa-ČZ 175, 250, 350 Kyvačka, Panelka a Velorex - D26 se sytičem → kyvacka-250, kyvacka-350, panelka-250-559, panelka-250-592, panelka-350-360, velorex-350 → nickname [Jawa 250/350/500 + Velorex]
- osky kola Stadion, Jawetta - M10 → jawetta, stadion-s11, stadion-s22, stadion-s23 → nickname [Jawetta + Stadion]
- s okroužkem Stadion, Jawetta → jawetta, stadion-s11, stadion-s22, stadion-s23 → nickname [Jawetta + Stadion]
- Zámek řízení Babetta 210, Korado, Jawa 350/634-640, ČZ 476, 477, 471, 472 → babetta-210, cz-125-476, cz-175-477, cz-250-471, cz-350-472, jawa-350-634, jawa-350-638, jawa-350-639, jawa-350-640 → type [Babetta + Jawa 250/350/500 + ČZ]
- žárovky - Jawa Panelka, Mustang a ČZ → mustang-23, panelka-250-559, panelka-250-592, panelka-350-360 → nickname [Jawa 250/350/500 + Jawa 50]
- dekompresoru Stadion S 11/22, Jawetta ZN → jawetta, stadion-s11, stadion-s22 → nickname [Jawetta + Stadion]
- Čep rozety Stadion Jawetta → jawetta, stadion-s11, stadion-s22, stadion-s23 → nickname [Jawetta + Stadion]
- filtru sání ČZ 450 470 502 Skútr → cezeta-502, cz-175-450, cz-175-470 → type [ČZ + Čezeta]
- Píst Jawa 50/550, 555, Stadion 11/22, Jawetta 38,25 mm → jawetta, pionyr-550, pionyr-555, stadion-s11, stadion-s22 → type [Jawa 50 + Jawetta + Stadion]
- Píst Jawa 50/550, 555, Stadion 11/22, Jawetta 38,50 mm → jawetta, pionyr-550, pionyr-555, stadion-s11, stadion-s22 → type [Jawa 50 + Jawetta + Stadion]
- Píst Jawa 50/550, 555, Stadion 11/22, Jawetta 39,75 mm → jawetta, pionyr-550, pionyr-555, stadion-s11, stadion-s22 → type [Jawa 50 + Jawetta + Stadion]
- převodovky Stadion Jawetta otevřené , CZ → jawetta, stadion-s11, stadion-s22, stadion-s23 → nickname [Jawetta + Stadion]
- Sklo světla Stadion, Jawetta → jawetta, stadion-s11, stadion-s22, stadion-s23 → nickname [Jawetta + Stadion]
- Stadion Jawetta → jawetta, stadion-s11, stadion-s22, stadion-s23 → nickname [Jawetta + Stadion]
- světla Jawa ČZ Californian 634 477 Pav dovoz → cz-175-477, jawa-350-634 → type [Jawa 250/350/500 + ČZ]
- světla Stadion S11/S22 Jawetta 6V/15w Ba15d se stíněním → jawetta, stadion-s11, stadion-s22 → nickname [Jawetta + Stadion]
- tachometru Jawa 90, 23 Mustang → jawa-90-roadster, jawa-90-trail, mustang-23 → type [Jawa 50 + Jawa 90]
- tlumiče Jawa 634-640, ČZ 476-488 → cz-125-476, cz-125-488, cz-175-477, cz-175-487, jawa-350-634, jawa-350-638, jawa-350-639, jawa-350-640 → type [Jawa 250/350/500 + ČZ]
- vidlice Stadion Jawetta → jawetta, stadion-s11, stadion-s22, stadion-s23 → nickname [Jawetta + Stadion]
- víka Stadion Jawetta → jawetta, stadion-s11, stadion-s22, stadion-s23 → nickname [Jawetta + Stadion]
- žárovky Stadion Jawetta Mototechna → jawetta, stadion-s11, stadion-s22, stadion-s23 → nickname [Jawetta + Stadion]
- Bowden přední brzdy - Stadion S22, Jawetta → jawetta, stadion-s22 → nickname [Jawetta + Stadion]

## Doplňující čísla

- Díly mapované zároveň na Jawettu a Stadion: **181** řádků
- Díly s vazbou na víc objemů ČZ: **214** řádků
- Řádky s „350 OHC“ (moderní Jawa, flag modern_jawa): **12**
- Token „206“ (nezařazený): **20** řádků, příklady názvů:

  - [javarna] teleskop  - Jawa Babetta 206, 207 - zinek
  - [motojelinek] Elektroinstalace (VAPE) - Babetta 207 228 206
  - [motomax] s kulličkami BABETTA 228, 206, 207 - řídítka "vlaštovky"  *M
  - [motomax] + pojistky BABETTA 228, 206, 207 - rám bez zadních teleskopů  *M
  - [motomax] čelistí BABETTA 228, 206, 207 - RS
  - [motomax] Doraz řízení BABETTA 228, 206, 207 surový  *M
  - [motomax] Koleno výfuku BABETTA 206, 207 - chrom  *M
  - [motomax] krku řízení BABETTA 228, 206, 207  *M
  - [motomax] M8x230mm JAWA 50 - 555, 05, 20, 21, 23, BABETTA 228, 206, 207 *M
  - [motomax] přední šedý BABETTA 228, 206, 207 (nízké řídítka)  *M
