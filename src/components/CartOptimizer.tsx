import React from 'react';
import { 
  ShoppingBag, 
  Trash2, 
  TrendingDown, 
  Truck, 
  Store, 
  CheckCircle, 
  AlertCircle, 
  ArrowRight,
  ExternalLink,
  Sparkles,
  Layers
} from 'lucide-react';
import { CartItem, Eshop, JawaPart } from '../types';

interface CartOptimizerProps {
  cartItems: CartItem[];
  eshops: Record<string, Eshop>;
  onUpdateQuantity: (partId: string, quantity: number) => void;
  onRemoveItem: (partId: string) => void;
  onClearCart: () => void;
  onOutboundClick: (eshopName: string, partName: string, url: string) => void;
  onGoToCatalog: () => void;
}

export const CartOptimizer: React.FC<CartOptimizerProps> = ({
  cartItems,
  eshops,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onOutboundClick,
  onGoToCatalog,
}) => {
  if (cartItems.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center max-w-xl mx-auto shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-4 text-stone-400">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-black text-stone-900">
          Váš renovační košík je zatím prázdný
        </h3>
        <p className="text-sm text-stone-500 mt-2 max-w-md mx-auto leading-relaxed">
          Při renovaci motocyklu obvykle potřebujete 5–15 různých dílů. Přidejte díly do košíku a náš optimalizátor spočítá, zda se vyplatí koupit vše v jednom e-shopu (ušetříte na poštovném) nebo rozdělit objednávku.
        </p>
        <button
          onClick={onGoToCatalog}
          className="mt-6 px-6 py-3 rounded-xl bg-[#8B1E1E] text-white text-xs font-bold hover:bg-[#721818] transition-all cursor-pointer shadow-xs"
        >
          Procházet katalog dílů Jawa
        </button>
      </div>
    );
  }

  // --- Optimization Algorithm ---
  // 1. Calculate Single-Shop scenarios: For each eshop, find items they have and calculate total + shipping
  const eshopList = Object.values(eshops);
  const singleShopScenarios = eshopList.map((shop) => {
    let subtotal = 0;
    let availableCount = 0;
    const itemsWithPrices: { part: JawaPart; quantity: number; price: number }[] = [];
    const missing: JawaPart[] = [];

    cartItems.forEach(({ part, quantity }) => {
      const offer = part.offers.find((o) => o.eshopId === shop.id);
      if (offer && offer.inStock) {
        subtotal += offer.price * quantity;
        availableCount += 1;
        itemsWithPrices.push({ part, quantity, price: offer.price });
      } else {
        missing.push(part);
      }
    });

    // Shipping calculation (free over threshold)
    const isFreeShipping = subtotal >= shop.freeShippingFrom;
    const shipping = subtotal > 0 ? (isFreeShipping ? 0 : shop.shippingPrice) : 0;
    const grandTotal = subtotal + shipping;

    return {
      eshop: shop,
      availableCount,
      totalCount: cartItems.length,
      subtotal,
      shipping,
      grandTotal,
      isFreeShipping,
      itemsWithPrices,
      missing,
    };
  }).filter((s) => s.availableCount > 0);

  // Sort single shop options by: 1st completely having all parts, then lowest grand total
  const completeShops = singleShopScenarios
    .filter((s) => s.availableCount === cartItems.length)
    .sort((a, b) => a.grandTotal - b.grandTotal);

  const bestSingleShop = completeShops[0] || singleShopScenarios.sort((a, b) => a.grandTotal - b.grandTotal)[0];

  // 2. Multi-Shop Smart Split (finding strictly lowest item price anywhere + adding shipping per involved shop)
  const itemsBestOffers = cartItems.map(({ part, quantity }) => {
    const sorted = [...part.offers].sort((a, b) => a.price - b.price);
    const best = sorted[0];
    return {
      part,
      quantity,
      bestOffer: best,
      eshop: eshops[best.eshopId],
    };
  });

  // Group by eshop
  const multiShopGroups: Record<string, { eshop: Eshop; items: any[]; subtotal: number }> = {};
  itemsBestOffers.forEach(({ part, quantity, bestOffer, eshop }) => {
    if (!multiShopGroups[eshop.id]) {
      multiShopGroups[eshop.id] = { eshop, items: [], subtotal: 0 };
    }
    multiShopGroups[eshop.id].items.push({ part, quantity, price: bestOffer.price });
    multiShopGroups[eshop.id].subtotal += bestOffer.price * quantity;
  });

  let multiItemsTotal = 0;
  let multiShippingTotal = 0;
  Object.values(multiShopGroups).forEach((group) => {
    multiItemsTotal += group.subtotal;
    const isFree = group.subtotal >= group.eshop.freeShippingFrom;
    multiShippingTotal += isFree ? 0 : group.eshop.shippingPrice;
  });
  const multiGrandTotal = multiItemsTotal + multiShippingTotal;

  // Compare single shop vs multi-shop
  const worstCaseTotal = Math.max(...singleShopScenarios.map((s) => s.grandTotal), multiGrandTotal);
  const totalCartBasePrice = cartItems.reduce((acc, curr) => {
    const cheapest = Math.min(...curr.part.offers.map((o) => o.price));
    return acc + cheapest * curr.quantity;
  }, 0);

  return (
    <div className="space-y-8">
      {/* Header with smart savings banner */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 md:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-stone-200">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
              Optimalizátor renovačních nákladů
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-stone-900 tracking-tight">
              Chytrý košík pro Jawa díly ({cartItems.length} položek)
            </h2>
            <p className="text-stone-500 text-xs md:text-sm mt-1">
              Běžný zákazník přeplatí stovky korun na zbytečném poštovném. Zde vidíte přesné porovnání variant nákupu.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClearCart}
              className="px-3.5 py-2 rounded-xl text-stone-500 hover:text-stone-800 hover:bg-stone-100 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-stone-200"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Vysypat košík
            </button>
            <button
              onClick={onGoToCatalog}
              className="px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 transition-all cursor-pointer"
            >
              + Přidat další díly
            </button>
          </div>
        </div>

        {/* 2 Scenarios Split Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          
          {/* Strategy A: Single Shop (1x poštovné, pohodlí) */}
          <div className="bg-stone-50 border-2 border-stone-300/80 rounded-2xl p-6 relative flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Varianta A • 1 objednávka (1 balík)
                </span>
                {bestSingleShop?.isFreeShipping && (
                  <span className="text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                    Poštovné ZDARMA
                  </span>
                )}
              </div>

              <h4 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <span>Vše z {bestSingleShop?.eshop.name}</span>
                <span className="text-xs font-normal text-stone-500">
                  ({bestSingleShop?.availableCount} z {cartItems.length} dílů)
                </span>
              </h4>

              <div className="mt-4 space-y-2 text-xs text-stone-600">
                <div className="flex justify-between">
                  <span>Cena dílů:</span>
                  <span className="font-mono font-semibold">{bestSingleShop?.subtotal.toLocaleString('cs-CZ')} Kč</span>
                </div>
                <div className="flex justify-between">
                  <span>Poštovné ({bestSingleShop?.eshop.name}):</span>
                  <span className="font-mono font-semibold">
                    {bestSingleShop?.shipping === 0 ? '0 Kč (doprava zdarma)' : `${bestSingleShop?.shipping} Kč`}
                  </span>
                </div>
                <div className="pt-2 border-t border-stone-200 flex justify-between text-sm font-bold text-stone-900">
                  <span>Celková cena nákupu:</span>
                  <span className="text-lg font-mono text-[#8B1E1E]">
                    {bestSingleShop?.grandTotal.toLocaleString('cs-CZ')} Kč
                  </span>
                </div>
              </div>

              <div className="mt-4 p-3 bg-stone-100 rounded-xl text-xs text-stone-600">
                💡 <strong>Výhoda:</strong> Vše vám dorazí v jedné krabici na jedno výdejní místo. Žádné zmatky s více balíky.
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-stone-200">
              <button
                onClick={() => onOutboundClick(bestSingleShop.eshop.name, 'Košík více položek', `https://${bestSingleShop.eshop.domain}`)}
                className="w-full py-3 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <span>Objednat vše v {bestSingleShop?.eshop.name}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Strategy B: Smart Multi-Shop Split (Nejnižší možná cena dílů) */}
          <div className="bg-emerald-50/60 border-2 border-emerald-400 rounded-2xl p-6 relative flex flex-col justify-between">
            <div className="absolute -top-3 right-6 bg-emerald-600 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-wider shadow-xs">
              Algoritmicky nejlevnější
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                  Varianta B • Rozdělení ({Object.keys(multiShopGroups).length} e-shopy)
                </span>
              </div>

              <h4 className="text-lg font-bold text-emerald-950 flex items-center gap-2">
                Rozdělit do {Object.keys(multiShopGroups).length} specializovaných obchodů
              </h4>

              <div className="mt-4 space-y-2 text-xs text-stone-600">
                <div className="flex justify-between">
                  <span>Cena dílů (všude absolutně nejnižší):</span>
                  <span className="font-mono font-semibold">{multiItemsTotal.toLocaleString('cs-CZ')} Kč</span>
                </div>
                <div className="flex justify-between">
                  <span>Poštovné celkem ({Object.keys(multiShopGroups).length} zásilky):</span>
                  <span className="font-mono font-semibold">{multiShippingTotal} Kč</span>
                </div>
                <div className="pt-2 border-t border-emerald-200 flex justify-between text-sm font-bold text-emerald-950">
                  <span>Finální cena celkem:</span>
                  <span className="text-lg font-mono text-emerald-900 font-black">
                    {multiGrandTotal.toLocaleString('cs-CZ')} Kč
                  </span>
                </div>
              </div>

              <div className="mt-4 p-3 bg-emerald-100/70 border border-emerald-200 rounded-xl text-xs text-emerald-900">
                {bestSingleShop && multiGrandTotal < bestSingleShop.grandTotal ? (
                  <div className="flex items-center gap-1.5 font-bold">
                    <TrendingDown className="w-4 h-4 text-emerald-700 shrink-0" />
                    Ušetříte {(bestSingleShop.grandTotal - multiGrandTotal).toLocaleString('cs-CZ')} Kč oproti nákupu v jednom obchodě i po započtení vícenásobného poštovného!
                  </div>
                ) : (
                  <div>
                    Při tomto složení košíku se vyplatí Varianta A, protože ušetřené poštovné převýší drobné cenové rozdíly dílů.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-emerald-200">
              <div className="grid grid-cols-2 gap-2">
                {Object.values(multiShopGroups).map((grp) => (
                  <button
                    key={grp.eshop.id}
                    onClick={() => onOutboundClick(grp.eshop.name, 'Část košíku', `https://${grp.eshop.domain}`)}
                    className="p-2.5 rounded-xl bg-white border border-emerald-300 hover:bg-emerald-100 text-stone-900 text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer"
                  >
                    <span className="truncate">{grp.eshop.name} ({grp.items.length})</span>
                    <ExternalLink className="w-3 h-3 text-stone-400 shrink-0 ml-1" />
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Cart Items Detailed Table */}
      <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs">
        <div className="p-6 border-b border-stone-200 flex items-center justify-between">
          <h3 className="font-bold text-stone-900 text-base">
            Seznam dílů ve vašem renovačním projektu
          </h3>
          <span className="text-xs text-stone-500 font-mono">
            {cartItems.length} položek
          </span>
        </div>

        <div className="divide-y divide-stone-200">
          {cartItems.map(({ part, quantity }) => {
            const sortedOffers = [...part.offers].sort((a, b) => a.price - b.price);
            const bestOffer = sortedOffers[0];
            const eshop = eshops[bestOffer.eshopId];

            return (
              <div key={part.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-stone-50/50 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded">
                      {part.catalogNumber}
                    </span>
                    <span className="text-xs text-stone-400">
                      {part.categoryLabel}
                    </span>
                  </div>
                  <h4 className="font-bold text-stone-900 text-sm md:text-base">
                    {part.name}
                  </h4>
                  <p className="text-xs text-stone-500 max-w-xl">
                    Nejlevnější v: <strong>{eshop?.name}</strong> za {bestOffer.price} Kč ({bestOffer.qualityNote || 'ČR kvalita'})
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0">
                  {/* Quantity selector */}
                  <div className="flex items-center gap-2 bg-stone-100 p-1 rounded-xl border border-stone-200">
                    <button
                      onClick={() => onUpdateQuantity(part.id, Math.max(1, quantity - 1))}
                      className="w-7 h-7 rounded-lg bg-white text-stone-700 font-bold hover:bg-stone-200 flex items-center justify-center text-xs cursor-pointer shadow-2xs"
                    >
                      -
                    </button>
                    <span className="w-8 text-center text-xs font-bold font-mono">
                      {quantity}
                    </span>
                    <button
                      onClick={() => onUpdateQuantity(part.id, quantity + 1)}
                      className="w-7 h-7 rounded-lg bg-white text-stone-700 font-bold hover:bg-stone-200 flex items-center justify-center text-xs cursor-pointer shadow-2xs"
                    >
                      +
                    </button>
                  </div>

                  {/* Subtotal */}
                  <div className="text-right min-w-[90px]">
                    <div className="text-base font-black font-mono text-stone-900">
                      {(bestOffer.price * quantity).toLocaleString('cs-CZ')} Kč
                    </div>
                    <div className="text-[10px] text-stone-400">
                      {quantity} × {bestOffer.price} Kč
                    </div>
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={() => onRemoveItem(part.id)}
                    className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                    title="Odebrat z košíku"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
