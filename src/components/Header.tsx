import React from 'react';
import { 
  ShoppingBag, 
  Layers, 
  Sparkles, 
  Store, 
  BookOpen, 
  Search,
  ShieldCheck,
  TrendingUp,
  Cpu
} from 'lucide-react';

interface HeaderProps {
  activeTab: 'catalog' | 'diagrams' | 'cart' | 'stores' | 'strategy';
  setActiveTab: (tab: 'catalog' | 'diagrams' | 'cart' | 'stores' | 'strategy') => void;
  cartCount: number;
  cartTotal: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  cartCount,
  cartTotal,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-xs">
      {/* Top Banner with live market info */}
      <div className="bg-[#8B1E1E] text-white text-xs py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-400 text-stone-900 uppercase tracking-wider">
              Specializovaný agregátor
            </span>
            <span className="hidden sm:inline text-stone-200">
              Porovnáváme 18 500+ dílů z 6 ověřených moto e-shopů (Fichtlkrámek, Motokrámek, Motomax...)
            </span>
          </div>
          <div className="flex items-center gap-4 text-stone-200 text-xs">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
              Hlídáme kvalitu: České repliky vs. Dovoz
            </span>
            <button 
              onClick={() => setActiveTab('strategy')}
              className="text-amber-300 hover:text-white font-medium underline flex items-center gap-1 cursor-pointer transition-colors"
            >
              <TrendingUp className="w-3 h-3" />
              Byznys model & SEO rozbor
            </button>
          </div>
        </div>
      </div>

      {/* Main navigation bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4">
          
          {/* Logo & Brand Identity */}
          <div 
            onClick={() => setActiveTab('catalog')}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#8B1E1E] to-[#601212] flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform duration-200">
              <span className="text-2xl font-black tracking-tighter font-mono">M</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-stone-900">
                  Moto<span className="text-[#8B1E1E]">Dílomat</span>
                </span>
                <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 border border-stone-200">
                  .cz
                </span>
              </div>
              <p className="text-xs text-stone-500 font-medium hidden sm:block">
                Srovnávač dílů pro dvoutakty z ČSSR • Na jedno šlápnutí
              </p>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden lg:flex items-center gap-1 bg-stone-100 p-1.5 rounded-xl border border-stone-200">
            <button
              id="nav-catalog-btn"
              onClick={() => setActiveTab('catalog')}
              className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'catalog'
                  ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
              }`}
            >
              <Search className="w-4 h-4 text-[#8B1E1E]" />
              Katalog & Ceny
            </button>

            <button
              id="nav-diagrams-btn"
              onClick={() => setActiveTab('diagrams')}
              className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'diagrams'
                  ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
              }`}
            >
              <Layers className="w-4 h-4 text-amber-600" />
              Rozkresy dílů
              <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded-full">
                Interaktivní
              </span>
            </button>

            <button
              id="nav-cart-btn"
              onClick={() => setActiveTab('cart')}
              className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'cart'
                  ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
              }`}
            >
              <Cpu className="w-4 h-4 text-emerald-600" />
              Optimalizátor košíku
            </button>

            <button
              id="nav-stores-btn"
              onClick={() => setActiveTab('stores')}
              className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'stores'
                  ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
              }`}
            >
              <Store className="w-4 h-4 text-blue-600" />
              E-shopy & Feedy
            </button>

            <button
              id="nav-strategy-btn"
              onClick={() => setActiveTab('strategy')}
              className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'strategy'
                  ? 'bg-[#8B1E1E] text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Strategie & Monetizace
            </button>
          </nav>

          {/* Quick Cart Action Button */}
          <div className="flex items-center gap-2.5">
            <button
              id="quick-cart-button"
              onClick={() => setActiveTab('cart')}
              className={`relative flex items-center gap-2.5 px-4 py-2.5 rounded-xl border transition-all cursor-pointer ${
                cartCount > 0
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950 hover:bg-emerald-100 shadow-xs'
                  : 'bg-stone-100 border-stone-200 text-stone-700 hover:bg-stone-200/80'
              }`}
            >
              <div className="relative">
                <ShoppingBag className="w-5 h-5 text-stone-700" />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-[#8B1E1E] text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
                    {cartCount}
                  </span>
                )}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold leading-none">
                  Renovační košík
                </div>
                <div className="text-xs font-bold text-stone-900 mt-0.5">
                  {cartCount > 0 ? `${cartTotal.toLocaleString('cs-CZ')} Kč` : '0 položek'}
                </div>
              </div>
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Navigation bar */}
      <div className="lg:hidden border-t border-stone-200 bg-stone-50 px-2 py-1.5 flex items-center justify-around overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap ${
            activeTab === 'catalog' ? 'bg-[#8B1E1E] text-white' : 'text-stone-700'
          }`}
        >
          Katalog
        </button>
        <button
          onClick={() => setActiveTab('diagrams')}
          className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap ${
            activeTab === 'diagrams' ? 'bg-[#8B1E1E] text-white' : 'text-stone-700'
          }`}
        >
          Rozkresy
        </button>
        <button
          onClick={() => setActiveTab('cart')}
          className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap ${
            activeTab === 'cart' ? 'bg-[#8B1E1E] text-white' : 'text-stone-700'
          }`}
        >
          Košík ({cartCount})
        </button>
        <button
          onClick={() => setActiveTab('stores')}
          className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap ${
            activeTab === 'stores' ? 'bg-[#8B1E1E] text-white' : 'text-stone-700'
          }`}
        >
          E-shopy
        </button>
        <button
          onClick={() => setActiveTab('strategy')}
          className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap ${
            activeTab === 'strategy' ? 'bg-[#8B1E1E] text-white' : 'text-stone-700'
          }`}
        >
          Byznys plán
        </button>
      </div>
    </header>
  );
};
