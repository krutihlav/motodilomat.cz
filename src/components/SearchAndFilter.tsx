import React from 'react';
import { Search, Filter, ShieldCheck, X, Check, ArrowUpDown } from 'lucide-react';
import { JAWA_MODELS } from '../data/jawaData';

interface SearchAndFilterProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedModel: string;
  setSelectedModel: (modelId: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  onlyCzechQuality: boolean;
  setOnlyCzechQuality: (val: boolean) => void;
  onlyInStock: boolean;
  setOnlyInStock: (val: boolean) => void;
  sortBy: 'price-asc' | 'price-desc' | 'offers-count' | 'name';
  setSortBy: (sort: 'price-asc' | 'price-desc' | 'offers-count' | 'name') => void;
}

const CATEGORIES = [
  { id: 'all', label: 'Všechny kategorie' },
  { id: 'motor', label: 'Motor & Převodovka' },
  { id: 'karburator', label: 'Karburátory & Sání' },
  { id: 'vyfuky', label: 'Výfuky & Kolena' },
  { id: 'elektro', label: 'Elektro & VAPE' },
  { id: 'kola', label: 'Kola, Ráfky & Špice' },
  { id: 'tesneni', label: 'Těsnění & Gufera' },
  { id: 'lanka', label: 'Lanka & Bowdeny' },
  { id: 'svetla', label: 'Světla & Plechy' },
];

export const SearchAndFilter: React.FC<SearchAndFilterProps> = ({
  searchQuery,
  setSearchQuery,
  selectedModel,
  setSelectedModel,
  selectedCategory,
  setSelectedCategory,
  onlyCzechQuality,
  setOnlyCzechQuality,
  onlyInStock,
  setOnlyInStock,
  sortBy,
  setSortBy,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs mb-8">
      {/* Search Input Bar */}
      <div className="relative mb-4">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-stone-400">
          <Search className="w-5 h-5 text-[#8B1E1E]" />
        </div>
        <input
          id="main-parts-search-input"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Hledat podle názvu dílu, katalogového čísla (např. 05-11-010, 353-15) nebo typu motocyklu..."
          className="w-full pl-12 pr-10 py-3.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#8B1E1E]/20 focus:border-[#8B1E1E] transition-all text-base"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Quick Search Chips */}
      <div className="flex flex-wrap items-center gap-1.5 mb-5 text-xs text-stone-500">
        <span className="font-semibold text-stone-600 mr-1">Rychlé vyhledávání:</span>
        {[
          'Zapalování VAPE',
          'Výfuky doutníky',
          'Karburátor Jikov',
          'Kliková hřídel',
          'Výbrus válce',
          'Lamely Ferodo',
          'Katalog 353',
        ].map((tag) => (
          <button
            key={tag}
            onClick={() => setSearchQuery(tag)}
            className="px-2.5 py-1 rounded-md bg-stone-100 hover:bg-stone-200/80 text-stone-700 font-medium transition-colors cursor-pointer border border-stone-200/60"
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Model Selection Horizontal Pills */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
            Výběr motocyklu Jawa / ČZ:
          </span>
          {selectedModel !== 'all' && (
            <button
              onClick={() => setSelectedModel('all')}
              className="text-xs text-[#8B1E1E] hover:underline font-semibold cursor-pointer"
            >
              Zobrazit všechny modely
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedModel('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all border ${
              selectedModel === 'all'
                ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                : 'bg-stone-100 text-stone-700 border-stone-200 hover:bg-stone-200/70'
            }`}
          >
            🏍️ Všechny motocykly
          </button>
          {JAWA_MODELS.map((model) => (
            <button
              key={model.id}
              onClick={() => setSelectedModel(model.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all border flex items-center gap-1.5 ${
                selectedModel === model.id
                  ? 'bg-[#8B1E1E] text-white border-[#8B1E1E] shadow-xs'
                  : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
              }`}
            >
              <span>{model.icon}</span>
              <span>{model.name.split('(')[0]}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                selectedModel === model.id ? 'bg-black/20 text-white' : 'bg-stone-200 text-stone-600'
              }`}>
                {model.code}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Secondary Filters Bar */}
      <div className="pt-4 border-t border-stone-100 flex flex-wrap items-center justify-between gap-4">
        {/* Category Dropdown & Quick Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-stone-500 font-semibold mr-1">
            <Filter className="w-3.5 h-3.5 text-stone-500" />
            Kategorie:
          </div>
          <select
            id="category-filter-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-semibold text-stone-800 focus:outline-none focus:border-[#8B1E1E] cursor-pointer"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>

          {/* Quality Filter Toggle */}
          <button
            onClick={() => setOnlyCzechQuality(!onlyCzechQuality)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
              onlyCzechQuality
                ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-xs'
                : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
            }`}
          >
            <ShieldCheck className={`w-3.5 h-3.5 ${onlyCzechQuality ? 'text-amber-600' : 'text-stone-400'}`} />
            Pouze ověřená kvalita (ČR / Originál)
          </button>

          {/* In Stock Toggle */}
          <button
            onClick={() => setOnlyInStock(!onlyInStock)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
              onlyInStock
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-xs'
                : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${onlyInStock ? 'bg-emerald-600' : 'bg-stone-400'}`} />
            Skladem ihned
          </button>
        </div>

        {/* Sort Select */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-500 font-semibold flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5" />
            Řadit podle:
          </span>
          <select
            id="sort-parts-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-semibold text-stone-800 focus:outline-none focus:border-[#8B1E1E] cursor-pointer"
          >
            <option value="price-asc">Nejnižší ceny od</option>
            <option value="price-desc">Nejvyšší ceny od</option>
            <option value="offers-count">Nejvíce nabídek e-shopů</option>
            <option value="name">Názvu (A-Z)</option>
          </select>
        </div>
      </div>
    </div>
  );
};
