import React from 'react';
import { Shield, Heart, Store, Layers, Search, Sparkles } from 'lucide-react';
import { JAWA_MODELS } from '../data/jawaData';

interface FooterProps {
  onSelectModel: (modelId: string) => void;
  setActiveTab: (tab: 'catalog' | 'diagrams' | 'cart' | 'stores' | 'strategy') => void;
}

export const Footer: React.FC<FooterProps> = ({ onSelectModel, setActiveTab }) => {
  return (
    <footer className="bg-stone-900 text-stone-300 pt-16 pb-12 border-t border-stone-800 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 pb-12 border-b border-stone-800">
          
          {/* Brand & Purpose (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#8B1E1E] flex items-center justify-center text-white font-black text-xl font-mono">
                M
              </div>
              <span className="text-xl font-black text-white tracking-tight">
                Moto<span className="text-[#8B1E1E]">Dílomat</span>.cz
              </span>
            </div>
            <p className="text-xs text-stone-400 leading-relaxed max-w-sm">
              Nezávislý cenový agregátor, vyhledávač a katalog náhradních dílů pro dvoutakty z ČSSR (Jawa, ČZ, Babetta, Stadion). Pomáháme veteránistům ušetřit čas a peníze za díly i zbytečné poštovné.
            </p>
            <div className="flex items-center gap-2 text-xs text-stone-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Denně aktualizováno z XML feedů e-shopů</span>
            </div>
          </div>

          {/* Quick Models Navigation */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
              Populární modely
            </h4>
            <ul className="space-y-2 text-xs text-stone-400">
              {JAWA_MODELS.slice(0, 5).map((m) => (
                <li key={m.id}>
                  <button
                    onClick={() => {
                      onSelectModel(m.id);
                      setActiveTab('catalog');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="hover:text-white transition-colors cursor-pointer text-left"
                  >
                    {m.name.split('(')[0]}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Features */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
              Nástroje & Rozkresy
            </h4>
            <ul className="space-y-2 text-xs text-stone-400">
              <li>
                <button
                  onClick={() => {
                    setActiveTab('diagrams');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Interaktivní rozkresy motoru
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setActiveTab('cart');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Optimalizátor poštovného košíku
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setActiveTab('stores');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Přehled e-shopů & doprava
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setActiveTab('strategy');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Byznys model & SEO strategie
                </button>
              </li>
            </ul>
          </div>

          {/* Community & E-shops */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
              E-shopy & Partneři
            </h4>
            <ul className="space-y-2 text-xs text-stone-400">
              <li>Fichtlkrámek.cz</li>
              <li>Motokrámek.cz</li>
              <li>Motomax / MotoJelínek</li>
              <li>Partdeck.cz (JAWA Praha)</li>
              <li>JAWA-Korda.cz</li>
              <li>Jawárna.cz</li>
            </ul>
          </div>

        </div>

        {/* Legal Disclaimer regarding Jawa trademark */}
        <div className="pt-8 text-[11px] text-stone-500 space-y-2 leading-relaxed">
          <p>
            <strong>Právní upozornění:</strong> Tento web je nezávislý agregátor nabídek a technický katalog pro renovátory. JAWA je registrovanou ochrannou známkou společnosti JAWA Moto spol. s r.o. (Týnec nad Sázavou). Názvy motocyklů a ochranné známky jsou použity výhradně k označení účelu použití a kompatibility náhradních dílů ve smyslu ustanovení § 10 odst. 1 písm. c) zákona č. 441/2003 Sb., o ochranných známkách. Tento server není oficiálním zástupcem společnosti JAWA Moto spol. s r.o.
          </p>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-4 border-t border-stone-800/60 text-stone-400">
            <div>
              © {new Date().getFullYear()} MotoDílomat.cz – Všechny díly na jednom místě.
            </div>
            <div>
              Vytvořeno pro českou a slovenskou veteránskou komunitu.
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
