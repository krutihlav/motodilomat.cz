<!-- Vygenerováno workflowem models-dry-run.yml (read-only) nad živou DB projektu motodilomat, plné názvy z shop_products, 2026-10-01. Do DB se nic nezapsalo. -->

> Seed: finální 63 modelů (revize 2026-10-01). Parser a pravidla kvality viz docs/decisions.md.

# Dry-run: párování dílů podle modelu (nic se nezapisuje)

Celkem pending řádků: **4808**

## Pokrytí po shopech a match_level

| shop | řádků | type | nickname | displacement | brand | none | pokryto modelem (type+nickname) |
|---|---:|---:|---:|---:|---:|---:|---:|
| javarna | 87 | 42 (48.3 %) | 33 (37.9 %) | 2 (2.3 %) | 10 (11.5 %) | 0 (0.0 %) | 86.2 % |
| jawa-korda | 236 | 100 (42.4 %) | 72 (30.5 %) | 16 (6.8 %) | 48 (20.3 %) | 0 (0.0 %) | 72.9 % |
| motojelinek | 151 | 63 (41.7 %) | 54 (35.8 %) | 15 (9.9 %) | 19 (12.6 %) | 0 (0.0 %) | 77.5 % |
| motokramek | 89 | 42 (47.2 %) | 28 (31.5 %) | 1 (1.1 %) | 18 (20.2 %) | 0 (0.0 %) | 78.7 % |
| motomax | 4245 | 1879 (44.3 %) | 732 (17.2 %) | 71 (1.7 %) | 629 (14.8 %) | 934 (22.0 %) | 61.5 % |
| **celkem** | 4808 | 2126 (44.2 %) | 919 (19.1 %) | 105 (2.2 %) | 724 (15.1 %) | 934 (19.4 %) | 63.3 % |

## Po vyřazení merche a Simsonu (nová pravidla kvality)

Vyřazeno: merch 186, Simson bez naší značky 393. Zbývá **4229** řádků.

| shop | řádků | type | nickname | displacement | brand | none | pokryto modelem (type+nickname) |
|---|---:|---:|---:|---:|---:|---:|---:|
| javarna | 87 | 42 (48.3 %) | 33 (37.9 %) | 2 (2.3 %) | 10 (11.5 %) | 0 (0.0 %) | 86.2 % |
| jawa-korda | 235 | 100 (42.6 %) | 71 (30.2 %) | 16 (6.8 %) | 48 (20.4 %) | 0 (0.0 %) | 72.8 % |
| motojelinek | 149 | 63 (42.3 %) | 53 (35.6 %) | 15 (10.1 %) | 18 (12.1 %) | 0 (0.0 %) | 77.9 % |
| motokramek | 89 | 42 (47.2 %) | 28 (31.5 %) | 1 (1.1 %) | 18 (20.2 %) | 0 (0.0 %) | 78.7 % |
| motomax | 3669 | 1856 (50.6 %) | 680 (18.5 %) | 70 (1.9 %) | 541 (14.7 %) | 522 (14.2 %) | 69.1 % |
| **celkem** | 4229 | 2103 (49.7 %) | 865 (20.5 %) | 104 (2.5 %) | 635 (15.0 %) | 522 (12.3 %) | 70.2 % |

### Co by zápis vytvořil

- shop_products k aktualizaci (model_match_level, fit_generic): **4229** řádků
- řádků s ≥1 vazbou na konkrétní model: **2968**
- vazeb shop_product_models: **8525** (type 5560, nickname 2965)
- řádků s fit_generic (displacement / brand): **3370**

## 30 náhodných ukázek (název → modely → úroveň)

- Pouzdro ojnice na 15 čep JAWA 250 Pérák, Kývačka  - bronz  *M → kyvacka-250, perak-250 → nickname
- Stavěcí šroub spojky s maticí JAWA 50 - 20, 21, 23 → mustang-23, pionyr-20, pionyr-21 → type
- Pouzdra přední vidlice JAWA 50 - 550, 555, 05, 20, 21, 23 TUNING *M - sada 4ks → mustang-23, pionyr-05, pionyr-20, pionyr-21, pionyr-550, pionyr-555 → type
- Ojnice úpl. JAWA 350 Pérák, Kývačka, Panelka (*CKR, ložisko na 16 čep)  *M → kyvacka-350, panelka-350-360, perak-350 → nickname
- Přepínač úplný pravý JAWA 634, 638, 639, 640, ČZ 487, 488 → cz-125-488, cz-175-487, jawa-350-634, jawa-350-638, jawa-350-639, jawa-350-640 → type
- Držák zámku řízení - Pionýr → pionyr-05, pionyr-20, pionyr-21 → nickname
- Klikovka JAWA 50 - 550, 555 (ložisko pro pístní čep 10mm) → pionyr-550, pionyr-555 → type
- Vnitřní unašeč lehká spojka BABETTA 210, 225 *M → babetta-210, babetta-225 → type
- Sada šroubů setrvačníku BABETTA 228, 207  *M → babetta-207, babetta-228 → type
- Svítilna zadní úpl.  JAWA 638 / ČZ  -e- (náhrada)  "B → jawa-350-638 → type
- Kolo I rychl. 24 z.  JAWA 250 / 350 Pérák, Kývačka, Panelka → kyvacka-250, kyvacka-350, panelka-250-559, panelka-250-592, panelka-350-360, perak-250, perak-350 → nickname
- Pouzdro koše spojky JAWA Pérák, Kývačka, Panelka, 634, 640, ČZ 471, 472 *Origiál → cz-250-471, cz-350-472, jawa-350-634, jawa-350-640, kyvacka-250, kyvacka-350, panelka-250-559, panelka-250-592, panelka-350-360, perak-250, perak-350 → type
- Krytka / prachovka kola JAWA 50 - 550 -zinek → pionyr-550 → type
- Kryty pro zadní tlumič Stadion S22, Jawetta - ČR → jawetta, stadion-s22 → nickname
- Řetěz ČZ  1/2 x 3/16 MOFA 118 čl. se sponou  STADION, JAWETTA, KORADO → jawetta, stadion-s11, stadion-s22, stadion-s23 → nickname
- Píst bzdového třmenu  JAWA 639-640 → jawa-350-639, jawa-350-640 → type
- Pístní kroužek 41,00x2mm  STADION, JAWA 50 - 05, 20, 21, 23, BABETTA  "B → mustang-23, pionyr-05, pionyr-20, pionyr-21, stadion-s11, stadion-s22, stadion-s23 → type
- Násuvka páčky brzdy / spojky BABETTA, JAWA 50 → Babetta 50 ccm, Jawa 50 ccm → displacement
- Sada šroubů motoru JAWA Pérák 350 → perak-350 → nickname
- Řetěz ČZ  1/2 x 3/16 MOFA 126 čl. se sponou  STADION, JAWETTA, KORADO → jawetta, stadion-s11, stadion-s22, stadion-s23 → nickname
- Objímka rukojeti plynu standard JAWA, ČZ (bez šroubků) → Jawa, ČZ → brand
- Tlumič výfuku ,,doutník" JAWA 634 (sada)  ,,TW → jawa-350-634 → type
- Tričko s potiskem Stará láska nerezaví Pionýr Velikost: L → pionyr-05, pionyr-20, pionyr-21 → nickname
- Paprsek 4 x 224 zinek JAWA Pérák → perak-250, perak-350 → nickname
- Řídítka bez hrazdy JAWA 50 - 05, 20, 21, 23 (rychlopal) - chrom  *M → mustang-23, pionyr-05, pionyr-20, pionyr-21 → type
- Ukazatel zařazené rychlosti - chrom  ČZ 125/150C JAWA-ČZ 351/352 → cz-125-c, cz-150-c, jawa-cz-125-351, jawa-cz-150-352 → type
- Filc domečku pohonu tachometru JAWA 50 - 555, 05, 20, 21, 23 → mustang-23, pionyr-05, pionyr-20, pionyr-21, pionyr-555 → type
- Zástěrka s prolisem ČZ zakulacená -pryž → ČZ → brand
- Výrobní štítek s nýty  ,,JAWA PÉRÁK Zbrojovka Brno → perak-250, perak-350 → nickname
- Držák stupaček ČZ 125/150 C rádlovaný ZN → cz-125-c, cz-150-c → type

## Řádky bez shody: 934

20 ukázek:

- [motomax] Pojistková skříňka 2-polová, 6-konektorová SIMSON
- [motomax] Vložka ráfku pryžová 19" š-25mm
- [motomax] Víko skříně Alu. Pravé SIMSON
- [motomax] Indukční cívka 6V s objímkou  ,,CZ
- [motomax] Koleno výfuku SIMSON Skútr
- [motomax] Držák houkačky -zinek
- [motomax] Seřizovací šroub bowdenu d-3,15 / 6,4 Bw  *M
- [motomax] Karburátor *DELLORTO PHBG19DS  ,,IT
- [motomax] Pojistka keramická 16A
- [motomax] Víčko šoupátka karburátoru *JIKOV 2926
- [motomax] Klínek magneta 2x3,7 SIMSON
- [motomax] Plstěný / filcový kroužek prachovky kola *M
- [motomax] Těsnění kohoutu paliva / zátky oleje (hliník 1,5mm)
- [motomax] Přepínač směrovek - rukojeť DOMINO  *M
- [motomax] Kladívko / přerušovač zapalování SIMSON  *M
- [motomax] Žárovka  6V 5W  Ba15s *Elta
- [motomax] Tryska M4 x 0,7 - 110 *JIKOV karb.
- [motomax] Tryska M4 x 0,7 - 38 *JIKOV karb.
- [motomax] Ojnice MZ 150 ETZ *CKR
- [motomax] Ozdobný šroub SPZ M5x16

## Nerozřešené tokeny (četnost v řádcích)

| značka/kontext | typ | token | řádků |
|---|---|---|---:|
| Jawa | nickname | libenak | 3 |
| Babetta | number | 000 | 1 |
| Babetta | number | 002 | 1 |
| Babetta | number | 021 | 1 |
| Babetta | number | 022 | 1 |
| Babetta | number | 023 | 1 |
| Babetta | number | 100 | 1 |
| Babetta | number | 121 | 1 |
| Babetta | number | 122 | 1 |
| Babetta | number | 123 | 1 |
| Babetta | number | 220 | 1 |
| Jawa | number | 300 | 1 |
| Jawa/ČZ | number | 365 | 1 |
| ČZ | number | 485 | 1 |
| ČZ | number | 500 | 1 |
| ČZ | number | 505 | 1 |
| Velorex | number | 562 | 1 |
| Jawa | number | 585 | 1 |
| Jawa | number | 593 | 1 |
| Jawa | nickname | calif | 1 |

## Podezřelé případy

### Jeden díl na víc než 6 modelů: 86 názvů

- Kolo hlavní hřídele 20z JAWA 250, 350 Pérák, Kývačka, Panelka → kyvacka-250, kyvacka-350, panelka-250-559, panelka-250-592, panelka-350-360, perak-250, perak-350 → nickname (7 modelů)
- Pístní kroužek  38,75x2mm  STADION, JAWA 50 - 05, 20, 21, 23 "B → mustang-23, pionyr-05, pionyr-20, pionyr-21, stadion-s11, stadion-s22, stadion-s23 → type (7 modelů)
- Pístní kroužek  38,75x2x1,5mm  STADION, JAWA 50 - 05, 20, 21, 23 ,,CZ → mustang-23, pionyr-05, pionyr-20, pionyr-21, stadion-s11, stadion-s22, stadion-s23 → type (7 modelů)
- Stahovák skříně motoru STADION, JAWETTA, JAWA 50 - 550, 555, 05, 20, 21, 23 → jawetta, mustang-23, pionyr-05, pionyr-20, pionyr-21, pionyr-550, pionyr-555, stadion-s11, stadion-s22, stadion-s23 → type (10 modelů)
- Zadní svítilna úpl. JAWA 50 - 550, 555, Pérák, JAWETTA, ČZ 125, 150c → cz-125-c, cz-150-c, jawetta, perak-250, perak-350, pionyr-550, pionyr-555 → type (7 modelů)
- Pružina startovací páky JAWA Pérák, JAWA 50 - 550, 555, 05, 20, 21, 23 → mustang-23, perak-250, perak-350, pionyr-05, pionyr-20, pionyr-21, pionyr-550, pionyr-555 → type (8 modelů)
- Sada misek řízení s kuličkami JAWA Pérák, Kývačka, Panelka, JAWA-ČZ, ČZ → kyvacka-250, kyvacka-350, panelka-250-559, panelka-250-592, panelka-350-360, perak-250, perak-350 → nickname (7 modelů)
- Řetězové kolečko 17z. JAWA 350 - 634, 638, 639, 640, ČZ 471, 472, 476, 477, 487, 488 MZ250 → cz-125-476, cz-125-488, cz-175-477, cz-175-487, cz-250-471, cz-350-472, jawa-350-634, jawa-350-638, jawa-350-639, jawa-350-640 → type (10 modelů)
- Pístní kroužek 39,75x2mm  STADION, JAWA 50 - 05, 20, 21, 23, BABETTA  "B → mustang-23, pionyr-05, pionyr-20, pionyr-21, stadion-s11, stadion-s22, stadion-s23 → type (7 modelů)
- Ocelová lamela II. JAWA Pérák/Kývačka (koš spojky Panelka) → kyvacka-250, kyvacka-350, panelka-250-559, panelka-250-592, panelka-350-360, perak-250, perak-350 → nickname (7 modelů)
- Příložka zadní stupačky JAWA 50 - 05, 20, 21, 23, JAWA 90, ČZ 477 → cz-175-477, jawa-90-cross-trail, jawa-90-roadster, mustang-23, pionyr-05, pionyr-20, pionyr-21 → type (7 modelů)
- Řetěz ČZ  ASA 35 II.ř.  66 čl. JAWA 634, 632, 638, 639, 640 / ČZ 471, 472 → cz-250-471, cz-350-472, jawa-350-632, jawa-350-634, jawa-350-638, jawa-350-639, jawa-350-640 → type (7 modelů)
- Objímka / držák náhonu tachometru ČZ 125, 150 T, C, ČZ 125, 175, 250 - 450, 455, 477, 487 → cz-125-c, cz-125-t, cz-150-c, cz-175-450, cz-175-477, cz-175-487, cz-250-455 → type (7 modelů)
- Držák / patice žárovky zadní svítilny JAWA Pérák, 550, 555, JAWETTA, ČZ 125, 150, T, C → cz-125-c, cz-125-t, cz-150-c, jawetta, perak-250, perak-350, pionyr-550, pionyr-555 → type (8 modelů)
- Pístní kroužek 39,50 x 2 x 1,6mm  STADION, JAWA 50 - 05, 20, 21, 23, BABETTA  ,,CZ → mustang-23, pionyr-05, pionyr-20, pionyr-21, stadion-s11, stadion-s22, stadion-s23 → type (7 modelů)
- Pístní kroužek  38,25x2x1,5mm  STADION, JAWA 50 - 05, 20, 21, 23 ,,CZ → mustang-23, pionyr-05, pionyr-20, pionyr-21, stadion-s11, stadion-s22, stadion-s23 → type (7 modelů)
- Pouzdro převodovky průchozí  JAWA 250, 350 Pérák, Kývačka. Panelka  *M → kyvacka-250, kyvacka-350, panelka-250-559, panelka-250-592, panelka-350-360, perak-250, perak-350 → nickname (7 modelů)
- Guma rozety Jawa Panelka/634-640 - CZ → jawa-350-634, jawa-350-638, jawa-350-639, jawa-350-640, panelka-250-559, panelka-250-592, panelka-350-360 → type (7 modelů)
- Kolo spouštěče JAWA Pérák, Kývačka, Panelka, 634, ČZ 356, 450, 455, 502 → cezeta-502, cz-175-450, cz-250-455, jawa-350-634, jawa-cz-175-356, kyvacka-250, kyvacka-350, panelka-250-559, panelka-250-592, panelka-350-360, perak-250, perak-350 → type (12 modelů)
- Hřídel řazení s unašečem ČZ453/450/455/476/477/488/487 → cz-125-453, cz-125-476, cz-125-488, cz-175-450, cz-175-477, cz-175-487, cz-250-455 → type (7 modelů)
- Pístní kroužek 41,00x2mm  STADION, JAWA 50 - 05, 20, 21, 23, BABETTA  "B → mustang-23, pionyr-05, pionyr-20, pionyr-21, stadion-s11, stadion-s22, stadion-s23 → type (7 modelů)
- Pouzdra přední vidlice JAWA Kývačka, Panelka, Californian, 634 - Alu. (sada 6ks) → californian-362, jawa-350-634, kyvacka-250, kyvacka-350, panelka-250-559, panelka-250-592, panelka-350-360, sport-250-590, sport-350-361 → type (9 modelů)
- Tachometr 140km/h ČZ 477, 471, Bizon, Californian → californian-362, cz-175-477, cz-250-471, jawa-250-623, jawa-350-633, sport-250-590, sport-350-361 → type (7 modelů)
- Pojistná podl.koše spojky  JAWA Pérák, Kývačka, Panelka → kyvacka-250, kyvacka-350, panelka-250-559, panelka-250-592, panelka-350-360, perak-250, perak-350 → nickname (7 modelů)
- Guma pod zadní svítilnu JAWA 50 - 550, 555, Pérák, Jawetta, ČZ 125, 150 B,T,C → cz-125-b, cz-125-c, cz-125-t, cz-150-c, jawetta, perak-250, perak-350, pionyr-550, pionyr-555 → type (9 modelů)
- Karburátor ČZ 250/471, 350/472, 125/477, 487, 501, 502 skůtr, Jawa 350/632, 634 - D26 → cezeta-501, cezeta-502, cz-175-477, cz-175-487, cz-250-471, cz-350-472, jawa-350-632, jawa-350-634 → type (8 modelů)
- Pouzdro koše spojky JAWA Pérák, Kývačka, Panelka, 634, 640, ČZ 471, 472 *Origiál → cz-250-471, cz-350-472, jawa-350-634, jawa-350-640, kyvacka-250, kyvacka-350, panelka-250-559, panelka-250-592, panelka-350-360, perak-250, perak-350 → type (11 modelů)
- Čelist brzdy přední / zadní JAWA Panelka, 634, 638, ČZ 125, 175 - 477, 487 → cz-175-477, cz-175-487, jawa-350-634, jawa-350-638, panelka-250-559, panelka-250-592, panelka-350-360 → type (7 modelů)
- Pouzdro / náboj rozety JAWA Panelka, 634-640, ČZ 477, 472 → cz-175-477, cz-350-472, jawa-350-634, jawa-350-638, jawa-350-639, jawa-350-640, panelka-250-559, panelka-250-592, panelka-350-360 → type (9 modelů)
- Pružina řazení, startování JAWA Panelka, 634, 638, 639, 640 /D=22,5x28mm/ → jawa-350-634, jawa-350-638, jawa-350-639, jawa-350-640, panelka-250-559, panelka-250-592, panelka-350-360 → type (7 modelů)

### Konflikty mezi řadami: 371 názvů

- Řetězové kolečko 14z. STADION / JAWETTA *M → jawetta, stadion-s11, stadion-s22, stadion-s23 → nickname [Jawetta + Stadion]
- Parabola předního světlometu STADION  S11, S22, JAWETTA → jawetta, stadion-s11, stadion-s22 → nickname [Jawetta + Stadion]
- Kliková hřídel, CKR - Stadion, Jawetta → jawetta, stadion-s11, stadion-s22, stadion-s23 → nickname [Jawetta + Stadion]
- Vložka výfuku STADION S11, JAWETTA, JAWA 50 -  550, 555 -zinek → jawetta, pionyr-550, pionyr-555, stadion-s11 → type [Jawa 50 + Jawetta + Stadion]
- Rukojeť řazení STADION / JAWETTA -zinek → jawetta, stadion-s11, stadion-s22, stadion-s23 → nickname [Jawetta + Stadion]
- Pístní kroužek  38,75x2mm  STADION, JAWA 50 - 05, 20, 21, 23 "B → mustang-23, pionyr-05, pionyr-20, pionyr-21, stadion-s11, stadion-s22, stadion-s23 → type [Jawa 50 + Stadion]
- Rozeta úpl. 30z. STADION / JAWETTA → jawetta, stadion-s11, stadion-s22, stadion-s23 → nickname [Jawetta + Stadion]
- Píst STADION, JAWA 50 - 550, 555, JAWETTA  38,75 / 10 *Almet → jawetta, pionyr-550, pionyr-555, stadion-s11, stadion-s22, stadion-s23 → type [Jawa 50 + Jawetta + Stadion]
- Průchodka masky pravá STADION S22 / JAWETTA  *M → jawetta, stadion-s22 → nickname [Jawetta + Stadion]
- Otáčkoměr JAWA 350 - 634, 638, 639, 640, ČZ -487/488 - originál  *PAL → cz-125-488, cz-175-487, jawa-350-634, jawa-350-638, jawa-350-639, jawa-350-640 → type [Jawa 250/350/500 + ČZ]
- Pístní kroužek  38,75x2x1,5mm  STADION, JAWA 50 - 05, 20, 21, 23 ,,CZ → mustang-23, pionyr-05, pionyr-20, pionyr-21, stadion-s11, stadion-s22, stadion-s23 → type [Jawa 50 + Stadion]
- Návlek řadící páky JAWA 50, Pérák, ČZ 125, 150 B, T, C  *M → cz-125-b, cz-125-c, cz-125-t, cz-150-c, perak-250, perak-350 → type [Jawa 250/350/500 + ČZ]
- Klíč brzdy (d-10mm) STADION, JAWETTA (přední, zadní)  *M → jawetta, stadion-s11, stadion-s22, stadion-s23 → nickname [Jawetta + Stadion]
- Vedení řadící vidličky 120mm JAWA-ČZ, ČZ - 125, 175 - 356, 450 → cz-175-450, jawa-cz-175-356 → type [Jawa-ČZ + ČZ]
- Stahovák skříně motoru STADION, JAWETTA, JAWA 50 - 550, 555, 05, 20, 21, 23 → jawetta, mustang-23, pionyr-05, pionyr-20, pionyr-21, pionyr-550, pionyr-555, stadion-s11, stadion-s22, stadion-s23 → type [Jawa 50 + Jawetta + Stadion]
- Zadní svítilna úpl. JAWA 50 - 550, 555, Pérák, JAWETTA, ČZ 125, 150c → cz-125-c, cz-150-c, jawetta, perak-250, perak-350, pionyr-550, pionyr-555 → type [Jawa 250/350/500 + Jawa 50 + Jawetta + ČZ]
- Kolo s nábojem JAWA 634, 638, 639, 634, ČZ 471,472 → cz-250-471, cz-350-472, jawa-350-634, jawa-350-638, jawa-350-639 → type [Jawa 250/350/500 + ČZ]
- Houkačka 6V JAWA / ČZ Pérák, Kývačka, ČZ 125T, ČZ 150C chrom - červená → cz-125-t, cz-150-c, kyvacka-250, kyvacka-350, perak-250, perak-350 → type [Jawa 250/350/500 + ČZ]
- Folie (slída) zadního světla Pérák/Pařez → perak-250, perak-350, pionyr-550, pionyr-555 → nickname [Jawa 250/350/500 + Jawa 50]
- Napínák levý STADION S22, JAWETTA → jawetta, stadion-s22 → nickname [Jawetta + Stadion]
- Rámeček světlometu JAWA 50 - 20, 21, 23 Mustang, JAWA 90 (chrom) → jawa-90-cross-trail, jawa-90-roadster, mustang-23, pionyr-20, pionyr-21 → type [Jawa 50 + Jawa 90]
- Silentblok skříně motoru STADION S11, S22, JAWETTA  *M → jawetta, stadion-s11, stadion-s22 → nickname [Jawetta + Stadion]
- Pružina startovací páky JAWA Pérák, JAWA 50 - 550, 555, 05, 20, 21, 23 → mustang-23, perak-250, perak-350, pionyr-05, pionyr-20, pionyr-21, pionyr-550, pionyr-555 → type [Jawa 250/350/500 + Jawa 50]
- Řetězové kolečko 17z. JAWA 350 - 634, 638, 639, 640, ČZ 471, 472, 476, 477, 487, 488 MZ250 → cz-125-476, cz-125-488, cz-175-477, cz-175-487, cz-250-471, cz-350-472, jawa-350-634, jawa-350-638, jawa-350-639, jawa-350-640 → type [Jawa 250/350/500 + ČZ]
- Pružina řazení  STADION / JAWETTA → jawetta, stadion-s11, stadion-s22, stadion-s23 → nickname [Jawetta + Stadion]
- Gufero kluzáku přední vidlice 36x47 / 6,5x10 JAWA 638, 639, 640 - ČZ 472 (originál) *M → cz-350-472, jawa-350-638, jawa-350-639, jawa-350-640 → type [Jawa 250/350/500 + ČZ]
- Rozpěrka náboje kola STADION S11, S22, JAWETTA → jawetta, stadion-s11, stadion-s22 → nickname [Jawetta + Stadion]
- Filc víčka nádrže, ČERNÝ - JAWA 50 23, Stadion S22,S23 → mustang-23, stadion-s22, stadion-s23 → type [Jawa 50 + Stadion]
- Pístní kroužek 39,75x2mm  STADION, JAWA 50 - 05, 20, 21, 23, BABETTA  "B → mustang-23, pionyr-05, pionyr-20, pionyr-21, stadion-s11, stadion-s22, stadion-s23 → type [Jawa 50 + Stadion]
- Podložka šroubu řízení STADION S11, S22, JAWETTA, JAWA 50, BABETTA 207 - nerez  *M → babetta-207, jawetta, stadion-s11, stadion-s22 → type [Babetta + Jawetta + Stadion]

## Doplňující čísla

- Díly mapované zároveň na Jawettu a Stadion: **181** řádků
- Díly s vazbou na víc objemů ČZ: **216** řádků
- Řádky s „350 OHC“ (moderní Jawa, flag modern_jawa): **12**
- Token „206“ (nezařazený): **0** řádků, příklady názvů:
