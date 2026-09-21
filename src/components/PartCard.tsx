import React from 'react';
import { 
  ExternalLink, 
  ShoppingBag, 
  CheckCircle2, 
  AlertTriangle, 
  Truck, 
  ShieldCheck, 
  ChevronRight,
  TrendingDown,
  Info
} from 'lucide-react';
import { JawaPart, Eshop } from '../types';

interface PartCardProps {
  part: JawaPart;
  eshops: Record<string, Eshop>;
  onSelectPart: (part: JawaPart) => void;
  onAddToCart: (part: JawaPart, eshopId?: string) => void;
  isInCart: boolean;
  onOutboundClick: (eshopName: string, partName: string, url: string) => void;
}

export const PartCard: React.FC<PartCardProps> = ({
  part,
  eshops,
  onSelectPart,
  onAddToCart,
  isInCart,
  onOutboundClick,
}) => {
  // Sort offers by price ascending
  const sortedOffers = [...part.offers].sort((a, b) => a.price - b.price);
  const bestOffer = sortedOffers[0];
  const worstOffer = sortedOffers[sortedOffers.length - 1];
  const priceDifference = worstOffer ? worstOffer.price - bestOffer.price : 0;
  const bestEshop = bestOffer ? eshops[bestOffer.eshopId] : null;

  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group">
      {/* Top Part Header & Tags */}
      <div>
        <div className="p-5 pb-3">
          <div className="flex items-start justify-between gap-3 mb-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-stone-100 text-stone-700 border border-stone-200">
              Katalog: {part.catalogNumber}
            </span>
            <span className="text-[11px] font-semibold text-stone-500 bg-stone-50 px-2 py-0.5 rounded-md border border-stone-100">
              {part.categoryLabel}
            </span>
          </div>

          <h3 
            onClick={() => onSelectPart(part)}
            className="text-base font-bold text-stone-900 group-hover:text-[#8B1E1E] transition-colors cursor-pointer line-clamp-2 leading-snug"
          >
            {part.name}
          </h3>

          <p className="text-xs text-stone-500 mt-1.5 line-clamp-2 leading-relaxed">
            {part.description}
          </p>

          {/* Quality Indicator Box */}
          <div className="mt-3 p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-[11px] text-amber-900 leading-tight">
              <span className="font-bold">Doporučení renovátora: </span>
              <span className="text-amber-800">{part.qualityAdvice}</span>
            </div>
          </div>
        </div>

        {/* Price Span & Savings Highlight */}
        <div className="px-5 py-3 bg-stone-50/70 border-y border-stone-100 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
              Cena od
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold text-stone-900 font-mono">
                {bestOffer.price.toLocaleString('cs-CZ')} Kč
              </span>
              {sortedOffers.length > 1 && (
                <span className="text-xs text-stone-400 font-medium">
                  do {worstOffer.price.toLocaleString('cs-CZ')} Kč
                </span>
              )}
            </div>
          </div>

          {priceDifference > 0 && (
            <div className="text-right">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-md bg-emerald-100 text-emerald-800">
                <TrendingDown className="w-3.5 h-3.5" />
                Ušetříte až {priceDifference.toLocaleString('cs-CZ')} Kč
              </span>
            </div>
          )}
        </div>

        {/* E-shop offers mini table */}
        <div className="px-5 py-3 space-y-2">
          <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider flex items-center justify-between">
            <span>Nabídky e-shopů ({part.offers.length}):</span>
            <span className="text-stone-400 font-normal">Cena / Sklad</span>
          </div>

          {sortedOffers.slice(0, 3).map((offer) => {
            const eshop = eshops[offer.eshopId];
            if (!eshop) return null;
            return (
              <div 
                key={offer.eshopId} 
                className="flex items-center justify-between py-1.5 border-b border-stone-100 last:border-b-0 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full shrink-0 bg-emerald-500" />
                  <span className="font-semibold text-stone-800 truncate">
                    {eshop.name}
                  </span>
                  <span className="text-[10px] text-stone-400 hidden sm:inline">
                    ★ {eshop.rating}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono font-bold text-stone-900">
                    {offer.price.toLocaleString('cs-CZ')} Kč
                  </span>
                  <button
                    onClick={() => onOutboundClick(eshop.name, part.name, offer.productUrl)}
                    title={`Přejít do ${eshop.name}`}
                    className="p-1 text-stone-400 hover:text-[#8B1E1E] hover:bg-stone-100 rounded cursor-pointer transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Card Actions Footer */}
      <div className="p-4 pt-2 bg-white flex items-center gap-2">
        <button
          onClick={() => onSelectPart(part)}
          className="flex-1 py-2.5 px-3 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-800 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
        >
          <span>Porovnat {part.offers.length} e-shopy</span>
          <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
        </button>

        <button
          onClick={() => onAddToCart(part, bestOffer.eshopId)}
          className={`py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs ${
            isInCart
              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
              : 'bg-[#8B1E1E] text-white hover:bg-[#721818]'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>{isInCart ? 'V košíku' : 'Do košíku'}</span>
        </button>
      </div>
    </div>
  );
};
