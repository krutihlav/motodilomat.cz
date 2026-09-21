import React from 'react';
import { 
  X, 
  ExternalLink, 
  ShoppingBag, 
  ShieldCheck, 
  Truck, 
  Star, 
  Check, 
  AlertCircle,
  HelpCircle,
  TrendingDown,
  Layers
} from 'lucide-react';
import { JawaPart, Eshop } from '../types';
import { JAWA_MODELS } from '../data/jawaData';

interface PartDetailModalProps {
  part: JawaPart | null;
  onClose: () => void;
  eshops: Record<string, Eshop>;
  onAddToCart: (part: JawaPart, eshopId?: string) => void;
  isInCart: boolean;
  onOutboundClick: (eshopName: string, partName: string, url: string) => void;
}

export const PartDetailModal: React.FC<PartDetailModalProps> = ({
  part,
  onClose,
  eshops,
  onAddToCart,
  isInCart,
  onOutboundClick,
}) => {
  if (!part) return null;

  const sortedOffers = [...part.offers].sort((a, b) => a.price - b.price);
  const bestOffer = sortedOffers[0];
  const maxPrice = Math.max(...part.offers.map((o) => o.price));
  const minPrice = Math.min(...part.offers.map((o) => o.price));
  const maxSavings = maxPrice - minPrice;

  // Compatible models info
  const compatibleModelObjs = JAWA_MODELS.filter((m) =>
    part.compatibleModels.includes(m.id)
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        className="bg-white rounded-3xl max-w-4xl w-full border border-stone-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-stone-50 p-6 border-b border-stone-200 flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="font-mono font-bold text-xs bg-stone-200 text-stone-800 px-2.5 py-1 rounded-md">
                Katalogové číslo: {part.catalogNumber}
              </span>
              <span className="text-xs font-semibold bg-[#8B1E1E]/10 text-[#8B1E1E] px-2.5 py-1 rounded-md">
                {part.categoryLabel}
              </span>
            </div>
            <h2 className="text-2xl font-black text-stone-900 tracking-tight">
              {part.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-200/70 transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
          
          {/* Main highlights grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4">
              <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                Nejvýhodnější nabídka
              </div>
              <div className="text-2xl font-black font-mono text-emerald-950 mt-1">
                {minPrice.toLocaleString('cs-CZ')} Kč
              </div>
              <div className="text-xs text-emerald-700 mt-1">
                v e-shopu {eshops[bestOffer.eshopId]?.name}
              </div>
            </div>

            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4">
              <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                Rozptyl cen v e-shopech
              </div>
              <div className="text-lg font-bold text-stone-900 mt-1 font-mono">
                {minPrice.toLocaleString('cs-CZ')} – {maxPrice.toLocaleString('cs-CZ')} Kč
              </div>
              {maxSavings > 0 && (
                <div className="text-xs text-[#8B1E1E] font-bold flex items-center gap-1 mt-1">
                  <TrendingDown className="w-3.5 h-3.5" />
                  Rozdíl až {maxSavings.toLocaleString('cs-CZ')} Kč
                </div>
              )}
            </div>

            <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4">
              <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                Doporučená jakost
              </div>
              <div className="text-sm font-bold text-amber-950 mt-1">
                {part.recommendedQuality === 'cz_replica'
                  ? 'Česká přesná replika'
                  : part.recommendedQuality === 'original'
                  ? 'Originál ČSSR / ČR'
                  : 'Renovovaný originál'}
              </div>
              <div className="text-xs text-amber-800 mt-1 line-clamp-2">
                Prověřené dílny, žádné tenké plechy.
              </div>
            </div>
          </div>

          {/* Description & Renovation Advice */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
              Popis dílu a montážní rady
            </h4>
            <p className="text-stone-700 text-sm leading-relaxed">
              {part.description}
            </p>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 leading-relaxed">
                <span className="font-bold text-sm block mb-0.5">Tip pro nákup a renovaci:</span>
                {part.qualityAdvice}
              </div>
            </div>
          </div>

          {/* Compatibility list */}
          <div>
            <h4 className="text-sm font-bold text-stone-900 uppercase tracking-wider mb-2">
              Kompatibilní motocykly ({compatibleModelObjs.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {compatibleModelObjs.map((m) => (
                <div 
                  key={m.id}
                  className="px-3 py-1.5 rounded-xl bg-stone-100 border border-stone-200 text-xs font-semibold text-stone-800 flex items-center gap-1.5"
                >
                  <span>{m.icon}</span>
                  <span>{m.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed E-shop offers list */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
                Srovnání nabídek ({part.offers.length} prodejců)
              </h4>
              <span className="text-xs text-stone-400">
                Řazeno od nejnižší ceny
              </span>
            </div>

            <div className="border border-stone-200 rounded-2xl overflow-hidden divide-y divide-stone-200">
              {sortedOffers.map((offer, idx) => {
                const eshop = eshops[offer.eshopId];
                if (!eshop) return null;
                const isBest = idx === 0;

                return (
                  <div 
                    key={offer.eshopId}
                    className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                      isBest ? 'bg-emerald-50/40' : 'bg-white hover:bg-stone-50/80'
                    }`}
                  >
                    {/* Eshop info */}
                    <div className="space-y-1 min-w-[200px]">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-stone-900 text-sm">
                          {eshop.name}
                        </span>
                        {isBest && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white uppercase">
                            Nejlevnější
                          </span>
                        )}
                        {eshop.isVerified && (
                          <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                            Ověřený
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-stone-500">
                        <span className="flex items-center gap-1 text-amber-600 font-semibold">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          {eshop.rating} ({eshop.reviewsCount})
                        </span>
                        <span>•</span>
                        <span>{eshop.location}</span>
                      </div>

                      <div className="text-xs text-stone-600 italic">
                        {offer.qualityNote || eshop.specialization}
                      </div>
                    </div>

                    {/* Stock & Delivery */}
                    <div className="text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold text-emerald-700">
                        <Check className="w-4 h-4 text-emerald-600" />
                        {offer.inStock 
                          ? `Skladem (${offer.stockCount || 'ihned k odeslání'})` 
                          : 'Na objednávku do 7 dnů'}
                      </div>
                      <div className="text-stone-500 flex items-center gap-1">
                        <Truck className="w-3.5 h-3.5 text-stone-400" />
                        Poštovné: {offer.shippingCost === 0 ? (
                          <span className="font-bold text-emerald-600">ZDARMA</span>
                        ) : (
                          `${offer.shippingCost} Kč`
                        )}
                      </div>
                    </div>

                    {/* Price and Action Button */}
                    <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-stone-100">
                      <div className="text-left md:text-right">
                        <div className="text-xl font-black font-mono text-stone-900">
                          {offer.price.toLocaleString('cs-CZ')} Kč
                        </div>
                        <div className="text-[11px] text-stone-400">
                          vč. DPH
                        </div>
                      </div>

                      <button
                        onClick={() => onOutboundClick(eshop.name, part.name, offer.productUrl)}
                        className="px-4 py-2.5 rounded-xl bg-[#8B1E1E] hover:bg-[#721818] text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                      >
                        <span>Přejít do obchodu</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Modal Footer with quick actions */}
        <div className="bg-stone-50 p-4 px-6 border-t border-stone-200 flex items-center justify-between">
          <div className="text-xs text-stone-500">
            Ceny a dostupnost jsou aktualizovány z XML feedů e-shopů každé 2 hodiny.
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onAddToCart(part, bestOffer.eshopId)}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                isInCart
                  ? 'bg-emerald-600 text-white'
                  : 'bg-stone-900 hover:bg-stone-800 text-white'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>{isInCart ? 'Přidáno v renovačním košíku' : 'Přidat do košíku'}</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-200 text-xs font-semibold cursor-pointer"
            >
              Zavřít
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
