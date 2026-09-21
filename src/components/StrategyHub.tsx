import React, { useState } from 'react';
import { 
  Sparkles, 
  Search, 
  DollarSign, 
  ShieldAlert, 
  Database, 
  TrendingUp, 
  Award, 
  FileText, 
  CheckCircle2, 
  ArrowUpRight,
  Code,
  Layers,
  Globe,
  Sliders,
  Calculator
} from 'lucide-react';
import { BRAND_PROPOSALS, KEYWORDS_RESEARCH, MONETIZATION_MODELS } from '../data/jawaData';

export const StrategyHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'names' | 'seo' | 'monetization' | 'trademark' | 'tech'>('names');

  // Interactive CPC & Revenue Calculator State
  const [estimatedMonthlyVisitors, setEstimatedMonthlyVisitors] = useState<number>(35000);
  const [clickThroughRatePct, setClickThroughRatePct] = useState<number>(25); // 25% click out to eshops
  const [avgCpcCzk, setAvgCpcCzk] = useState<number>(3.50);
  const [affiliateBasketCzk, setAffiliateBasketCzk] = useState<number>(2400);
  const [affiliateOrdersMonthly, setAffiliateOrdersMonthly] = useState<number>(320);
  const [affiliateCommissionPct, setAffiliateCommissionPct] = useState<number>(6.5);

  const calculatedOutboundClicks = Math.round((estimatedMonthlyVisitors * clickThroughRatePct) / 100);
  const calculatedCpcRevenue = Math.round(calculatedOutboundClicks * avgCpcCzk);
  const calculatedAffiliateRevenue = Math.round(affiliateOrdersMonthly * affiliateBasketCzk * (affiliateCommissionPct / 100));
  const calculatedPremiumSellersRevenue = 5 * 1990; // 5 shops with VIP package
  const calculatedTotalMonthly = calculatedCpcRevenue + calculatedAffiliateRevenue + calculatedPremiumSellersRevenue;

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="bg-gradient-to-br from-stone-900 via-stone-850 to-[#601212] text-white rounded-3xl p-6 md:p-10 shadow-lg border border-stone-800">
        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400 text-stone-950 text-xs font-black mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            KOMPLETNÍ STRATEGICKÁ ANALÝZA & DEEP SEARCH
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-tight">
            Jak vybudovat a monetizovat specializovanou „Heuréku pro Jawa díly“
          </h1>
          <p className="text-stone-300 text-sm md:text-base mt-3 leading-relaxed">
            Hloubkový rozbor trhu veteránů v ČR, návrhy brandingu, struktura SEO pro 18 500+ dílů, kalkulátor ziskovosti z prokliků (CPC) i provizí (affiliate) a právní ošetření ochranné známky.
          </p>
        </div>

        {/* Strategy Sub-tabs */}
        <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-stone-800">
          {[
            { id: 'names', label: '1. Návrhy názvů & Domény', icon: Award },
            { id: 'seo', label: '2. SEO Strategie & Klíčová slova', icon: Search },
            { id: 'monetization', label: '3. Monetizace & Finanční kalkulačka', icon: DollarSign },
            { id: 'trademark', label: '4. Právní rozbor (Ochranná známka)', icon: ShieldAlert },
            { id: 'tech', label: '5. XML Feedy & Architektura', icon: Database },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-white text-stone-950 shadow-xs'
                    : 'bg-stone-800/80 text-stone-300 hover:bg-stone-700 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: Brand Proposals */}
      {activeTab === 'names' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-stone-200 p-6 md:p-8 shadow-xs">
            <h3 className="text-xl font-black text-stone-900">
              Návrhy názvů a domén pro projekt
            </h3>
            <p className="text-stone-500 text-sm mt-1">
              Při výběru názvu je nutné balancovat zapamatovatelnost, SEO dopad a právní riziko se slovem JAWA.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {BRAND_PROPOSALS.map((prop) => (
                <div 
                  key={prop.id}
                  className="bg-stone-50 border border-stone-200 rounded-2xl p-6 flex flex-col justify-between hover:border-[#8B1E1E]/40 transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-stone-200 text-stone-800">
                        {prop.type}
                      </span>
                      <span className="font-mono text-xs font-bold text-[#8B1E1E]">
                        {prop.domain}
                      </span>
                    </div>

                    <h4 className="text-xl font-black text-stone-900">
                      {prop.name}
                    </h4>
                    <p className="text-xs text-stone-600 italic mt-1">
                      „{prop.tagline}“
                    </p>

                    {/* Scores */}
                    <div className="grid grid-cols-3 gap-2 my-4 p-3 bg-white rounded-xl border border-stone-200 text-center">
                      <div>
                        <div className="text-[10px] text-stone-400 font-bold uppercase">SEO síla</div>
                        <div className="text-sm font-black text-emerald-600">{prop.seoScore} %</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-stone-400 font-bold uppercase">Brand</div>
                        <div className="text-sm font-black text-stone-900">{prop.brandScore} %</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-stone-400 font-bold uppercase">Pamatovatelnost</div>
                        <div className="text-sm font-black text-blue-600">{prop.memorability} %</div>
                      </div>
                    </div>

                    {/* Pros & Cons */}
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="font-bold text-emerald-700 block mb-1">Výhody:</span>
                        <ul className="list-disc list-inside space-y-0.5 text-stone-600">
                          {prop.pros.map((p, i) => <li key={i}>{p}</li>)}
                        </ul>
                      </div>
                      <div className="pt-2">
                        <span className="font-bold text-amber-700 block mb-1">Pozor:</span>
                        <ul className="list-disc list-inside space-y-0.5 text-stone-600">
                          {prop.cons.map((c, i) => <li key={i}>{c}</li>)}
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-stone-200 text-[11px] text-stone-500">
                    ⚖️ <strong>Právní status:</strong> {prop.trademarkNote}
                  </div>
                </div>
              ))}
            </div>

            {/* Expert Verdict */}
            <div className="mt-8 p-6 rounded-2xl bg-amber-50 border border-amber-200">
              <h4 className="font-bold text-amber-950 text-sm flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-700" />
                Vítězná strategie: Co musí název unést a jak to řeší MotoDílomat.cz
              </h4>
              <p className="text-xs text-amber-900 mt-2 leading-relaxed">
                Název potřebuje sdělit tři věci: <strong>Díly</strong> (o čem to je) + <strong>Automat/Srovnání</strong> (že za tebe počítá a hledá) + <strong>Veteráni/ČSSR</strong> (pro koho to je). Žádné jedno slovo neunese všechna 3 kritéria.
              </p>
              <div className="mt-3 p-3 bg-white/80 rounded-xl border border-amber-300 text-xs text-amber-950 space-y-1">
                <div>🏆 <strong>Vítězný vzorec:</strong> Název <strong>MotoDílomat.cz</strong> (nese <em>Díly + Automat pro všechny kubatury</em>) + slogan <strong>„Srovnávač dílů pro dvoutakty z ČSSR. Na jedno šlápnutí.“</strong> (nese <em>Veteráni/Jawa/ČZ a sjednocující dvoutaktní prvek</em>).</div>
                <div className="text-[11px] text-amber-800">Tím se dokonale odbourá riziko, že by si majitel Péráka nebo Jawy 350 myslel, že je web jen pro fichtly, i riziko, že by web působil jako obecný obchod pro moderní motorky.</div>
              </div>
            </div>

            {/* Launch Checklist: Krok za krokem od nákupu domény */}
            <div className="mt-8 pt-8 border-t border-stone-200">
              <h4 className="text-lg font-black text-stone-900 mb-2">
                🚀 Přesný postup: Co vyřešit PRVNÍ a co až potom?
              </h4>
              <p className="text-xs text-stone-500 mb-6">
                Koupit doménu je skvělý první krok (náklad cca 180 Kč/rok), ale pro úspěšný rozjezd projektu je nutné dodržet toto pořadí:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-stone-100 border border-stone-200 flex flex-col justify-between">
                  <div>
                    <span className="w-6 h-6 rounded-full bg-[#8B1E1E] text-white flex items-center justify-center text-xs font-bold mb-2">
                      1
                    </span>
                    <h5 className="font-bold text-stone-900 text-sm">Registrace .CZ domény</h5>
                    <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                      Ověřte volnost na <em>nic.cz</em> a zaregistrujte u registrátora (Wedos, Forpsi, Subreg). Doporučujeme koupit hlavní název + 1 překlepovou/obrannou variantu (náklad ~350 Kč).
                    </p>
                  </div>
                  <div className="mt-3 text-[10px] font-bold text-emerald-700 uppercase">
                    Den 1 • Náklad 180 Kč
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-stone-100 border border-stone-200 flex flex-col justify-between">
                  <div>
                    <span className="w-6 h-6 rounded-full bg-stone-800 text-white flex items-center justify-center text-xs font-bold mb-2">
                      2
                    </span>
                    <h5 className="font-bold text-stone-900 text-sm">Oslovení 2–3 hlavních e-shopů</h5>
                    <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                      Napište přátelský e-mail majitelům Fichtlkrámku a Motokrámku: <em>„Stavíme komunitní srovnávač pro fichtlaře a veterány, chceme vám posílat objednávky – poskytnete nám Heureka XML feed?“</em> (Většina nadšeně souhlasí).
                    </p>
                  </div>
                  <div className="mt-3 text-[10px] font-bold text-stone-700 uppercase">
                    Týden 1 • Zajištění feedů
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-stone-100 border border-stone-200 flex flex-col justify-between">
                  <div>
                    <span className="w-6 h-6 rounded-full bg-stone-800 text-white flex items-center justify-center text-xs font-bold mb-2">
                      3
                    </span>
                    <h5 className="font-bold text-stone-900 text-sm">Spuštění MVP s rozkresy</h5>
                    <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                      Nasaďte tento připravený web s katalogem a interaktivními rozkresy motoru. Rozkresy fungují jako virální magnet na fórech Motorkáři.cz a Facebook skupinách.
                    </p>
                  </div>
                  <div className="mt-3 text-[10px] font-bold text-stone-700 uppercase">
                    Týden 2 • Spuštění webu
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col justify-between">
                  <div>
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold mb-2">
                      4
                    </span>
                    <h5 className="font-bold text-emerald-950 text-sm">Aktivace CPC & Affiliate</h5>
                    <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                      Jakmile máte prvních 1 000 návštěvníků měsíčně, přepnete prokliky na placený kredit (2,50–3,50 Kč/klik) nebo aktivujete provize z nákupních košíků (5–7 %).
                    </p>
                  </div>
                  <div className="mt-3 text-[10px] font-bold text-emerald-700 uppercase">
                    Měsíc 2+ • První zisk
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SEO Strategy */}
      {activeTab === 'seo' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-stone-200 p-6 md:p-8 shadow-xs">
            <h3 className="text-xl font-black text-stone-900">
              SEO Blueprint: Jak získat statisíce návštěv z Google a Seznamu
            </h3>
            <p className="text-stone-500 text-sm mt-1">
              Protože na trhu existuje přes 18 500 katalogových čísel, specializovaný srovnávač může vygenerovat bezkonkurenční Long-tail SEO architekturu, kterou obecná Heureka nikdy nepokryje.
            </p>

            {/* Keyword volume table */}
            <div className="mt-6 border border-stone-200 rounded-2xl overflow-hidden">
              <div className="bg-stone-50 p-4 border-b border-stone-200 font-bold text-xs uppercase tracking-wider text-stone-600">
                Analýza klíčových slov (Český trh – Google & Seznam)
              </div>
              <div className="divide-y divide-stone-200 overflow-x-auto text-xs">
                <table className="w-full text-left">
                  <thead className="bg-stone-100 text-stone-700 font-bold">
                    <tr>
                      <th className="p-3">Hledaný dotaz</th>
                      <th className="p-3">Měsíční hledanost</th>
                      <th className="p-3">Odhad CPC</th>
                      <th className="p-3">Konkurence</th>
                      <th className="p-3">Nákupní záměr</th>
                      <th className="p-3">Doporučená URL struktura</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {KEYWORDS_RESEARCH.map((kw, i) => (
                      <tr key={i} className="hover:bg-stone-50">
                        <td className="p-3 font-bold text-stone-900">{kw.keyword}</td>
                        <td className="p-3 font-mono font-semibold">{kw.monthlySearchesCZ.toLocaleString()} / měs.</td>
                        <td className="p-3 font-mono">{kw.cpcEstCzk.toFixed(2)} Kč</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            kw.difficulty === 'Nízká' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {kw.difficulty}
                          </span>
                        </td>
                        <td className="p-3 text-stone-600">{kw.intent}</td>
                        <td className="p-3 font-mono text-[11px] text-[#8B1E1E]">{kw.targetUrl}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3 Pillars of Super SEO */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-[#8B1E1E] text-white flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <h4 className="font-bold text-stone-900 text-sm">Indexace dle katalogových čísel (OEM)</h4>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Každý díl musí mít URL ve tvaru <code>/dily/05-11-010-karburator-jikov</code>. Když veteránista dohledá v manuálu staré číslo dílu z roku 1968, váš web musí být na Google první!
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-[#8B1E1E] text-white flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <h4 className="font-bold text-stone-900 text-sm">Strukturovaná data Schema.org (Product & Offer)</h4>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Implementace rich snippets <code>AggregateOffer</code> zobrazí ve výsledcích vyhledávání přímo cenu (např. „od 890 Kč – 4 obchody skladem“), což zvýší míru prokliku (CTR) o 35 %.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-[#8B1E1E] text-white flex items-center justify-center font-bold text-sm">
                  3
                </div>
                <h4 className="font-bold text-stone-900 text-sm">Zpětné odkazy z Motorkáři.cz a JawaMania</h4>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Jawa komunita žije ve fórech. Vytvořením bezplatných rozkresů dílů a technických manuálů získáte stovky přirozených odkazů z diskusních vláken o renovacích.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Monetization & Calculator */}
      {activeTab === 'monetization' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-stone-200 p-6 md:p-8 shadow-xs">
            <h3 className="text-xl font-black text-stone-900">
              Modely monetizace & Interaktivní finanční kalkulačka
            </h3>
            <p className="text-stone-500 text-sm mt-1">
              Jak bude web vydělávat peníze od prvního dne spuštění.
            </p>

            {/* Monetization Streams Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {MONETIZATION_MODELS.map((m, i) => (
                <div key={i} className="p-6 rounded-2xl bg-stone-50 border border-stone-200 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-[#8B1E1E] uppercase tracking-wider">
                        {m.type}
                      </span>
                      <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-mono">
                        {m.rate}
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-stone-900">
                      {m.title}
                    </h4>
                    <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                      {m.description}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {m.features.map((f, fi) => (
                        <span key={fi} className="text-[10px] bg-white border border-stone-200 px-2 py-0.5 rounded text-stone-700">
                          ✓ {f}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-stone-200 flex items-center justify-between text-xs font-bold">
                    <span className="text-stone-500">Očekávaný měsíční příjem:</span>
                    <span className="text-emerald-700 font-mono text-sm">{m.projectedMonthly}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Interactive Calculator Box */}
            <div className="mt-8 p-6 md:p-8 rounded-3xl bg-stone-900 text-white shadow-md">
              <div className="flex items-center gap-2 mb-4">
                <Calculator className="w-5 h-5 text-amber-400" />
                <h4 className="text-lg font-black tracking-tight">
                  Simulátor měsíčních výnosů portálu
                </h4>
              </div>
              <p className="text-stone-400 text-xs mb-6">
                Upravte posuvníky podle reálné návštěvnosti a otestujte potenciál příjmů.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Control 1 */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-stone-300">Měsíční návštěvnost:</span>
                    <span className="font-bold font-mono text-amber-400">{estimatedMonthlyVisitors.toLocaleString()} návštěv</span>
                  </div>
                  <input
                    type="range"
                    min="5000"
                    max="100000"
                    step="5000"
                    value={estimatedMonthlyVisitors}
                    onChange={(e) => setEstimatedMonthlyVisitors(Number(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                  <div className="text-[10px] text-stone-500">V ČR je cca 120 000 registrovaných Jawa motocyklů</div>
                </div>

                {/* Control 2 */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-stone-300">Průměrná cena prokliku (CPC):</span>
                    <span className="font-bold font-mono text-amber-400">{avgCpcCzk.toFixed(2)} Kč</span>
                  </div>
                  <input
                    type="range"
                    min="1.5"
                    max="6.0"
                    step="0.25"
                    value={avgCpcCzk}
                    onChange={(e) => setAvgCpcCzk(Number(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                  <div className="text-[10px] text-stone-500">Heureka v moto segmentu účtuje 3 – 5 Kč/proklik</div>
                </div>

                {/* Control 3 */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-stone-300">Affiliate nákupů měsíčně:</span>
                    <span className="font-bold font-mono text-amber-400">{affiliateOrdersMonthly} objednávek</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="1000"
                    step="50"
                    value={affiliateOrdersMonthly}
                    onChange={(e) => setAffiliateOrdersMonthly(Number(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                  <div className="text-[10px] text-stone-500">Průměrný košík: {affiliateBasketCzk} Kč při {affiliateCommissionPct}% provizi</div>
                </div>
              </div>

              {/* Real-time Calculation Result Bar */}
              <div className="mt-8 pt-6 border-t border-stone-800 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="p-3 rounded-xl bg-stone-800/80">
                  <div className="text-[10px] uppercase font-bold text-stone-400">Prokliky (CPC)</div>
                  <div className="text-lg font-mono font-bold text-white mt-1">
                    {calculatedCpcRevenue.toLocaleString('cs-CZ')} Kč
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-stone-800/80">
                  <div className="text-[10px] uppercase font-bold text-stone-400">Affiliate provize</div>
                  <div className="text-lg font-mono font-bold text-white mt-1">
                    {calculatedAffiliateRevenue.toLocaleString('cs-CZ')} Kč
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-stone-800/80">
                  <div className="text-[10px] uppercase font-bold text-stone-400">Paušály e-shopů</div>
                  <div className="text-lg font-mono font-bold text-white mt-1">
                    {calculatedPremiumSellersRevenue.toLocaleString('cs-CZ')} Kč
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500">
                  <div className="text-[10px] uppercase font-bold text-emerald-400">Měsíční zisk celkem</div>
                  <div className="text-xl font-mono font-black text-emerald-300 mt-1">
                    {calculatedTotalMonthly.toLocaleString('cs-CZ')} Kč
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Trademark Legal Analysis */}
      {activeTab === 'trademark' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-stone-200 p-6 md:p-8 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <ShieldAlert className="w-6 h-6 text-amber-600" />
              <h3 className="text-xl font-black text-stone-900">
                Právní rozbor: Ochranná známka „JAWA“ a provoz srovnávače
              </h3>
            </div>

            <div className="space-y-4 text-xs md:text-sm text-stone-700 leading-relaxed">
              <div className="p-4 rounded-2xl bg-stone-100 border border-stone-200">
                <h4 className="font-bold text-stone-900 text-sm mb-1">
                  1. Kdo vlastní ochrannou známku?
                </h4>
                <p>
                  Slovní i grafickou ochrannou známku <strong>JAWA</strong> vlastní společnost <em>JAWA Moto spol. s r.o.</em> (se sídlem v Týnci nad Sázavou, IČO 25114704). Známka je zapsána u Úřadu průmyslového vlastnictví (ÚPV) pro třídy výrobků 12 (motocykly, náhradní díly).
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950">
                <h4 className="font-bold text-emerald-900 text-sm mb-1">
                  2. Jak srovnávač legálně funguje (Zákonná výjimka pro kompatibilitu)
                </h4>
                <p>
                  Podle <strong>§ 10 odst. 1 písm. c) zákona č. 441/2003 Sb., o ochranných známkách</strong> vlastník ochranné známky <u>nemá právo zakázat</u> třetím osobám užívat ochrannou známku v obchodním styku, pokud je to nezbytné k označení účelu výrobku nebo služby, zejména u příslušenství nebo náhradních dílů.
                </p>
                <p className="mt-2 font-medium">
                  To znamená: Můžete legálně uvádět „Náhradní díly pro motocykly Jawa“, „Vhodné pro Jawa 250 Pérák“ i porovnávat ceny.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950">
                <h4 className="font-bold text-amber-900 text-sm mb-1">
                  3. Co naopak NIKDY nedělat:
                </h4>
                <ul className="list-disc list-inside space-y-1 mt-1 text-xs">
                  <li>Nesmíte tvrdit, že jste oficiální zástupce nebo oficiální e-shop JAWA Moto Týnec.</li>
                  <li>Nesmíte neoprávněně používat oválné logo Jawa (grafickou známku) v záhlaví způsobem, který by vyvolal dojem autorizovaného zastoupení.</li>
                  <li>Doporučujeme mít v patičce jasný disclaimer: <em>„Tento portál je nezávislý srovnávač cen a katalog. JAWA je registrovaná ochranná známka JAWA Moto spol. s r.o.“</em></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Technical Feeds & Pipeline */}
      {activeTab === 'tech' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-stone-200 p-6 md:p-8 shadow-xs">
            <h3 className="text-xl font-black text-stone-900">
              Technická architektura: Zpracování XML feedů e-shopů
            </h3>
            <p className="text-stone-500 text-sm mt-1">
              Jak načítat data od Fichtlkrámku, Motokrámku a Motomaxu bez nutnosti ručního přepisování cen.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
                <h4 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                  <Code className="w-4 h-4 text-[#8B1E1E]" />
                  Standard Heureka XML & Zboží XML
                </h4>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Každý z těchto e-shopů již má vygenerovaný XML feed pro Heureku a Zboží.cz. Stačí jim poslat partnerskou smlouvu a napojit URL jejich feedu:
                </p>
                <div className="p-3 bg-stone-900 text-stone-300 rounded-xl font-mono text-[11px] overflow-x-auto">
                  <code>{`<SHOPITEM>
  <ITEM_ID>05-11-010</ITEM_ID>
  <PRODUCTNAME>Karburátor Jikov 2917 PSB</PRODUCTNAME>
  <PRICE_VAT>890</PRICE_VAT>
  <DELIVERY_DATE>0</DELIVERY_DATE>
  <URL>https://eshop.cz/p/karburator</URL>
</SHOPITEM>`}</code>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
                <h4 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-600" />
                  Párovací algoritmus dílů (Matching Engine)
                </h4>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Klíčem k úspěchu je párování položek. Zatímco Heureka často selhává na odlišných názvech („karbec 20“ vs. „karburátor Jikov 2917“), náš engine páruje prioritně podle:
                </p>
                <ul className="text-xs space-y-1 text-stone-700">
                  <li><strong>1. Shoda OEM čísla</strong> (např. <code>05-11-010</code>, <code>353-15-010</code>)</li>
                  <li><strong>2. Modelová kompatibilita</strong> (Pionýr 20/21 vs. Pérák)</li>
                  <li><strong>3. Rozpoznání jakosti</strong> (ČR replika vs. Taiwan/import)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
