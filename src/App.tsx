import React, { useState, useMemo } from 'react';
import { Header } from './components/Header';
import { SearchAndFilter } from './components/SearchAndFilter';
import { PartCard } from './components/PartCard';
import { PartDetailModal } from './components/PartDetailModal';
import { ExplodedDiagramView } from './components/ExplodedDiagramView';
import { CartOptimizer } from './components/CartOptimizer';
import { StrategyHub } from './components/StrategyHub';
import { EshopDirectory } from './components/EshopDirectory';
import { Footer } from './components/Footer';

import { JAWA_PARTS, ESHOPS, JAWA_MODELS } from './data/jawaData';
import { JawaPart, CartItem, Eshop } from './types';
import { ExternalLink, CheckCircle, Sparkles, AlertCircle, ShoppingBag, X } from 'lucide-react';

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<'catalog' | 'diagrams' | 'cart' | 'stores' | 'strategy'>('catalog');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModel, setSelectedModel] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [onlyCzechQuality, setOnlyCzechQuality] = useState(false);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [sortBy, setSortBy] = useState<'price-asc' | 'price-desc' | 'offers-count' | 'name'>('price-asc');

  // Selected Part for Detail Modal
  const [selectedPart, setSelectedPart] = useState<JawaPart | null>(null);

  // Eshops indexed map
  const eshopsMap = useMemo(() => {
    const map: Record<string, Eshop> = {};
    ESHOPS.forEach((e) => {
      map[e.id] = e;
    });
    return map;
  }, []);

  // Renovation Cart items (Pre-loaded with sample parts to showcase the optimizer instantly!)
  const [cartItems, setCartItems] = useState<CartItem[]>([
    {
      part: JAWA_PARTS[1], // Karburator Jikov
      quantity: 1,
    },
    {
      part: JAWA_PARTS[4], // Valec s vybrusem
      quantity: 1,
    },
    {
      part: JAWA_PARTS[5], // Spojkove lamely Ferodo
      quantity: 2,
    },
  ]);

  // Outbound link tracker modal/toast
  const [outboundToast, setOutboundToast] = useState<{
    visible: boolean;
    eshopName: string;
    partName: string;
    url: string;
  } | null>(null);

  // Filtered Parts
  const filteredParts = useMemo(() => {
    return JAWA_PARTS.filter((part) => {
      // Search query (name, catalog number, description)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = part.name.toLowerCase().includes(q);
        const matchCat = part.catalogNumber.toLowerCase().includes(q);
        const matchDesc = part.description.toLowerCase().includes(q);
        const matchModel = part.compatibleModels.some((m) => m.toLowerCase().includes(q));
        if (!matchName && !matchCat && !matchDesc && !matchModel) {
          return false;
        }
      }

      // Model filter
      if (selectedModel !== 'all') {
        if (!part.compatibleModels.includes(selectedModel)) {
          return false;
        }
      }

      // Category filter
      if (selectedCategory !== 'all') {
        if (part.category !== selectedCategory) {
          return false;
        }
      }

      // Quality filter
      if (onlyCzechQuality) {
        if (part.recommendedQuality !== 'cz_replica' && part.recommendedQuality !== 'original') {
          return false;
        }
      }

      // In stock filter
      if (onlyInStock) {
        const hasStock = part.offers.some((o) => o.inStock);
        if (!hasStock) return false;
      }

      return true;
    }).sort((a, b) => {
      const minA = Math.min(...a.offers.map((o) => o.price));
      const minB = Math.min(...b.offers.map((o) => o.price));

      if (sortBy === 'price-asc') return minA - minB;
      if (sortBy === 'price-desc') return minB - minA;
      if (sortBy === 'offers-count') return b.offers.length - a.offers.length;
      if (sortBy === 'name') return a.name.localeCompare(b.name, 'cs');
      return 0;
    });
  }, [searchQuery, selectedModel, selectedCategory, onlyCzechQuality, onlyInStock, sortBy]);

  // Cart operations
  const handleAddToCart = (part: JawaPart, eshopId?: string) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.part.id === part.id);
      if (existing) {
        return prev.map((item) =>
          item.part.id === part.id
            ? { ...item, quantity: item.quantity + 1, selectedOfferEshopId: eshopId || item.selectedOfferEshopId }
            : item
        );
      }
      return [...prev, { part, quantity: 1, selectedOfferEshopId: eshopId }];
    });
  };

  const handleUpdateQuantity = (partId: string, quantity: number) => {
    setCartItems((prev) =>
      prev.map((item) => (item.part.id === partId ? { ...item, quantity } : item))
    );
  };

  const handleRemoveFromCart = (partId: string) => {
    setCartItems((prev) => prev.filter((item) => item.part.id !== partId));
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  // Cart totals
  const cartTotal = useMemo(() => {
    return cartItems.reduce((acc, curr) => {
      const lowestPrice = Math.min(...curr.part.offers.map((o) => o.price));
      return acc + lowestPrice * curr.quantity;
    }, 0);
  }, [cartItems]);

  const cartPartIds = useMemo(() => cartItems.map((c) => c.part.id), [cartItems]);

  // Outbound affiliate / CPC tracker
  const handleOutboundClick = (eshopName: string, partName: string, url: string) => {
    setOutboundToast({
      visible: true,
      eshopName,
      partName,
      url,
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA] text-[#1E293B]">
      {/* Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        cartCount={cartItems.length}
        cartTotal={cartTotal}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* TAB 1: CATALOG VIEW */}
        {activeTab === 'catalog' && (
          <div className="space-y-6">
            {/* Hero Quick Banner */}
            <div className="bg-gradient-to-r from-stone-900 via-stone-850 to-[#601212] text-white rounded-3xl p-6 md:p-8 shadow-sm border border-stone-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400 text-stone-950 text-xs font-bold mb-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  Katalog pro motocykly Jawa & ČZ
                </div>
                <h1 className="text-2xl md:text-3xl font-black tracking-tight">
                  Porovnejte ceny náhradních dílů ve všech moto e-shopech
                </h1>
                <p className="text-stone-300 text-xs md:text-sm mt-2 leading-relaxed">
                  Už žádné zdlouhavé přepínání mezi Fichtlkrámkem, Motokrámkem a Motomaxem. Zadejte název nebo číslo dílu a okamžitě uvidíte, kde mají díl skladem za nejnižší cenu.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                <button
                  onClick={() => setActiveTab('diagrams')}
                  className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                >
                  <span>Hledat přes rozkres motoru</span>
                </button>
                <button
                  onClick={() => setActiveTab('strategy')}
                  className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-semibold text-xs border border-stone-700 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Zobrazit byznys plán</span>
                </button>
              </div>
            </div>

            {/* Search and Filters */}
            <SearchAndFilter
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              onlyCzechQuality={onlyCzechQuality}
              setOnlyCzechQuality={setOnlyCzechQuality}
              onlyInStock={onlyInStock}
              setOnlyInStock={setOnlyInStock}
              sortBy={sortBy}
              setSortBy={setSortBy}
            />

            {/* Results count indicator */}
            <div className="flex items-center justify-between px-1 text-xs text-stone-500 font-medium">
              <div>
                Nalezeno <strong>{filteredParts.length}</strong> dílů
                {selectedModel !== 'all' && (
                  <span> pro <strong>{JAWA_MODELS.find((m) => m.id === selectedModel)?.name}</strong></span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span>Porovnáváno v reálném čase</span>
              </div>
            </div>

            {/* Parts Grid */}
            {filteredParts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredParts.map((part) => (
                  <PartCard
                    key={part.id}
                    part={part}
                    eshops={eshopsMap}
                    onSelectPart={setSelectedPart}
                    onAddToCart={handleAddToCart}
                    isInCart={cartPartIds.includes(part.id)}
                    onOutboundClick={handleOutboundClick}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center shadow-xs">
                <AlertCircle className="w-12 h-12 text-stone-400 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-stone-900">
                  Žádný díl neodpovídá vašemu filtru
                </h3>
                <p className="text-xs text-stone-500 mt-1">
                  Zkuste zrušit filtr jakosti nebo rozšířit hledaný výraz.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedModel('all');
                    setSelectedCategory('all');
                    setOnlyCzechQuality(false);
                  }}
                  className="mt-4 px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-semibold cursor-pointer"
                >
                  Resetovat všechny filtry
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: EXPLODED DIAGRAMS VIEW */}
        {activeTab === 'diagrams' && (
          <ExplodedDiagramView
            parts={JAWA_PARTS}
            eshops={eshopsMap}
            onSelectPart={setSelectedPart}
            onAddToCart={handleAddToCart}
            cartPartIds={cartPartIds}
          />
        )}

        {/* TAB 3: CART OPTIMIZER */}
        {activeTab === 'cart' && (
          <CartOptimizer
            cartItems={cartItems}
            eshops={eshopsMap}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveFromCart}
            onClearCart={handleClearCart}
            onOutboundClick={handleOutboundClick}
            onGoToCatalog={() => setActiveTab('catalog')}
          />
        )}

        {/* TAB 4: E-SHOPS DIRECTORY */}
        {activeTab === 'stores' && (
          <EshopDirectory
            eshops={ESHOPS}
            onOutboundClick={handleOutboundClick}
          />
        )}

        {/* TAB 5: STRATEGY & BUSINESS ROADMAP */}
        {activeTab === 'strategy' && (
          <StrategyHub />
        )}

      </main>

      {/* Part Detail Modal */}
      <PartDetailModal
        part={selectedPart}
        onClose={() => setSelectedPart(null)}
        eshops={eshopsMap}
        onAddToCart={handleAddToCart}
        isInCart={selectedPart ? cartPartIds.includes(selectedPart.id) : false}
        onOutboundClick={handleOutboundClick}
      />

      {/* Outbound Link Simulator Modal / Toast */}
      {outboundToast && outboundToast.visible && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-stone-200 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-3 text-emerald-700">
              <ExternalLink className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-black text-stone-900 text-center">
              Přesměrování do partnerského obchodu
            </h3>
            
            <p className="text-xs text-stone-600 text-center mt-1">
              Otevíráme položku <strong>{outboundToast.partName}</strong> v e-shopu <strong>{outboundToast.eshopName}</strong>.
            </p>

            {/* Monetization Proof explanation */}
            <div className="my-4 p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs space-y-1.5 font-mono text-stone-600">
              <div className="flex justify-between">
                <span>Model vyúčtování:</span>
                <span className="font-bold text-stone-900">CPC / Affiliate</span>
              </div>
              <div className="flex justify-between">
                <span>Generovaný UTM tag:</span>
                <span className="text-emerald-700">?utm_source=jawasrovnavac</span>
              </div>
              <div className="flex justify-between">
                <span>Hodnota provize za proklik:</span>
                <span className="font-bold text-emerald-700">~ 3,20 Kč</span>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-5">
              <a
                href={outboundToast.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOutboundToast(null)}
                className="flex-1 py-3 rounded-xl bg-[#8B1E1E] hover:bg-[#721818] text-white text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Otevřít {outboundToast.eshopName}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={() => setOutboundToast(null)}
                className="px-4 py-3 rounded-xl border border-stone-200 text-stone-600 text-xs font-semibold hover:bg-stone-100 cursor-pointer"
              >
                Zavřít
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <Footer
        onSelectModel={(modelId) => {
          setSelectedModel(modelId);
          setActiveTab('catalog');
        }}
        setActiveTab={setActiveTab}
      />
    </div>
  );
}
