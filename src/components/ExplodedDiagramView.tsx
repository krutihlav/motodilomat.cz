import React, { useState } from 'react';
import { Layers, ShoppingBag, Info, ExternalLink, ShieldCheck, ChevronRight } from 'lucide-react';
import { JawaPart, Eshop } from '../types';

interface ExplodedDiagramViewProps {
  parts: JawaPart[];
  eshops: Record<string, Eshop>;
  onSelectPart: (part: JawaPart) => void;
  onAddToCart: (part: JawaPart) => void;
  cartPartIds: string[];
}

interface DiagramHotspot {
  id: number;
  label: string;
  partId: string;
  x: number; // percentage
  y: number; // percentage
  catalogNumber: string;
}

const DIAGRAM_HOTSPOTS: DiagramHotspot[] = [
  {
    id: 1,
    label: 'Zapalování VAPE / Dynamo',
    partId: 'part-vape-sz13-2',
    x: 26,
    y: 42,
    catalogNumber: 'VAPE-SZ13-2',
  },
  {
    id: 2,
    label: 'Karburátor Jikov + Sání',
    partId: 'part-karburator-jikov-2917-psb',
    x: 65,
    y: 28,
    catalogNumber: '05-11-010',
  },
  {
    id: 3,
    label: 'Kliková hřídel + ojnice',
    partId: 'part-klikovy-hridel-pionyr',
    x: 48,
    y: 62,
    catalogNumber: '05-12-001',
  },
  {
    id: 4,
    label: 'Válec s výbrusem + hlava',
    partId: 'part-valec-vybrus-sada-pionyr',
    x: 52,
    y: 22,
    catalogNumber: '05-11-002',
  },
  {
    id: 5,
    label: 'Spojkový koš & lamely Ferodo',
    partId: 'part-spojkove-lamely-ferodo-perak',
    x: 74,
    y: 65,
    catalogNumber: '353-12-050',
  },
  {
    id: 6,
    label: 'Sada těsnění karterů a válce',
    partId: 'part-tesneni-motoru-sada-350-634',
    x: 35,
    y: 75,
    catalogNumber: '634-11-080',
  },
];

export const ExplodedDiagramView: React.FC<ExplodedDiagramViewProps> = ({
  parts,
  eshops,
  onSelectPart,
  onAddToCart,
  cartPartIds,
}) => {
  const [activeHotspotId, setActiveHotspotId] = useState<number>(3); // Default to crankshaft
  const [activeDiagramType, setActiveDiagramType] = useState<'engine' | 'frame'>('engine');

  const activeHotspot = DIAGRAM_HOTSPOTS.find((h) => h.id === activeHotspotId);
  const activePart = parts.find((p) => p.id === activeHotspot?.partId);

  const bestOffer = activePart ? [...activePart.offers].sort((a, b) => a.price - b.price)[0] : null;

  return (
    <div className="space-y-6">
      {/* Intro banner */}
      <div className="bg-gradient-to-r from-stone-900 to-stone-800 text-white rounded-3xl p-6 md:p-8 shadow-md border border-stone-700">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold mb-3 border border-amber-400/30">
            <Layers className="w-3.5 h-3.5" />
            Unikátní vyhledávač pro motorkáře a renovátory
          </div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight">
            Interaktivní technické rozkresy (Exploded views)
          </h2>
          <p className="text-stone-300 text-sm md:text-base mt-2 leading-relaxed">
            Nemusíte znát přesná katalogová čísla. Klikněte přímo na díl na technickém výkrese motoru nebo rámu a okamžitě uvidíte srovnání cen napříč všemi českými e-shopy.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-4">
            <button
              onClick={() => setActiveDiagramType('engine')}
              className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                activeDiagramType === 'engine'
                  ? 'bg-amber-400 text-stone-950 shadow-xs'
                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
              }`}
            >
              ⚙️ Rozkres dvoudobého motoru Jawa (typ 05 / 20 / 353)
            </button>
            <button
              onClick={() => setActiveDiagramType('frame')}
              className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                activeDiagramType === 'frame'
                  ? 'bg-amber-400 text-stone-950 shadow-xs'
                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
              }`}
            >
              🏍️ Rám, přední vidlice & výfukový systém
            </button>
          </div>
        </div>
      </div>

      {/* Main Diagram + Detail Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left: Technical Schematic Stage (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-stone-200 p-6 shadow-xs relative">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-stone-900 text-base">
                Technický rozkres: Klikněte na očíslovanou pozici
              </h3>
              <p className="text-xs text-stone-500">
                Původní katalog náhradních dílů Jawa n.p.
              </p>
            </div>
            <span className="text-xs font-mono bg-stone-100 text-stone-700 px-2.5 py-1 rounded-md border border-stone-200">
              Skupina 05-1 – Motor
            </span>
          </div>

          {/* Interactive Schematic Canvas Box */}
          <div className="relative aspect-4/3 bg-radial from-stone-50 to-stone-100 rounded-2xl border border-stone-200 overflow-hidden flex items-center justify-center p-4">
            {/* Vintage Grid blueprint background pattern */}
            <div 
              className="absolute inset-0 opacity-15 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(#8B1E1E 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }}
            />

            {/* Stylized Engine Blueprint Graphic */}
            <svg 
              className="w-full h-full max-h-[380px] text-stone-600 select-none"
              viewBox="0 0 600 450" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Crankcase silhouette */}
              <rect x="160" y="180" width="280" height="190" rx="30" stroke="#78716C" strokeWidth="3" strokeDasharray="6 3" fill="#F5F5F4" fillOpacity="0.8" />
              {/* Cylinder block */}
              <path d="M 230 180 L 230 80 L 370 80 L 370 180 Z" stroke="#57534E" strokeWidth="3.5" fill="#E7E5E4" />
              {/* Cooling fins */}
              <line x1="210" y1="100" x2="390" y2="100" stroke="#57534E" strokeWidth="3" />
              <line x1="210" y1="120" x2="390" y2="120" stroke="#57534E" strokeWidth="3" />
              <line x1="210" y1="140" x2="390" y2="140" stroke="#57534E" strokeWidth="3" />
              <line x1="210" y1="160" x2="390" y2="160" stroke="#57534E" strokeWidth="3" />
              {/* Cylinder head */}
              <path d="M 240 80 Q 300 40 360 80 Z" stroke="#44403C" strokeWidth="3" fill="#D6D3D1" />
              {/* Spark plug */}
              <rect x="290" y="25" width="20" height="25" stroke="#78716C" strokeWidth="2" fill="#FAFAFA" />
              <line x1="300" y1="15" x2="300" y2="25" stroke="#8B1E1E" strokeWidth="3" />
              {/* Crankshaft & flywheel circle */}
              <circle cx="290" cy="275" r="55" stroke="#8B1E1E" strokeWidth="2.5" strokeDasharray="4 2" fill="#E5E7EB" fillOpacity="0.5" />
              <circle cx="290" cy="275" r="16" stroke="#8B1E1E" strokeWidth="2" fill="#FFFFFF" />
              {/* Connecting rod */}
              <line x1="290" y1="275" x2="300" y2="135" stroke="#44403C" strokeWidth="5" strokeLinecap="round" />
              <circle cx="300" cy="135" r="8" fill="#57534E" />
              {/* Carburetor stub right */}
              <path d="M 370 140 L 440 140 L 440 170 L 370 170 Z" stroke="#57534E" strokeWidth="2" fill="#E5E7EB" />
              {/* Exhaust stub left */}
              <path d="M 230 140 L 160 150 L 160 175 L 230 165 Z" stroke="#57534E" strokeWidth="2" fill="#E5E7EB" />
              {/* Clutch housing right */}
              <rect x="390" y="230" width="80" height="90" rx="15" stroke="#78716C" strokeWidth="2" fill="#E7E5E4" />
              {/* Generator / Vape housing left */}
              <rect x="130" y="220" width="60" height="110" rx="10" stroke="#78716C" strokeWidth="2" fill="#E7E5E4" />
            </svg>

            {/* Clickable Hotspots overlay */}
            {DIAGRAM_HOTSPOTS.map((hotspot) => {
              const isActive = hotspot.id === activeHotspotId;
              return (
                <button
                  key={hotspot.id}
                  onClick={() => setActiveHotspotId(hotspot.id)}
                  style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full font-black text-xs flex items-center justify-center transition-all cursor-pointer shadow-md z-10 ${
                    isActive
                      ? 'bg-[#8B1E1E] text-white scale-125 ring-4 ring-[#8B1E1E]/30 animate-bounce'
                      : 'bg-stone-900 text-white hover:bg-[#8B1E1E] hover:scale-110'
                  }`}
                  title={`${hotspot.label} (${hotspot.catalogNumber})`}
                >
                  {hotspot.id}
                </button>
              );
            })}
          </div>

          {/* Hotspots legend table below diagram */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {DIAGRAM_HOTSPOTS.map((hotspot) => {
              const isActive = hotspot.id === activeHotspotId;
              return (
                <button
                  key={hotspot.id}
                  onClick={() => setActiveHotspotId(hotspot.id)}
                  className={`p-2 rounded-xl text-left text-xs transition-all cursor-pointer border flex items-center gap-2 ${
                    isActive
                      ? 'bg-[#8B1E1E]/10 border-[#8B1E1E] text-[#8B1E1E] font-bold'
                      : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    isActive ? 'bg-[#8B1E1E] text-white' : 'bg-stone-300 text-stone-800'
                  }`}>
                    {hotspot.id}
                  </span>
                  <span className="truncate">{hotspot.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Part Comparison Card (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-stone-200 p-6 shadow-xs">
          {activePart ? (
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
                <span className="text-xs font-mono font-bold bg-[#8B1E1E] text-white px-2.5 py-1 rounded-md">
                  Pozice #{activeHotspot?.id} v rozkresu
                </span>
                <span className="text-xs text-stone-500 font-mono">
                  Číslo dílu: {activePart.catalogNumber}
                </span>
              </div>

              <h3 className="text-xl font-black text-stone-900 leading-snug">
                {activePart.name}
              </h3>

              <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                {activePart.description}
              </p>

              {/* Quality alert */}
              <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="text-[11px] text-amber-900 leading-tight">
                  <span className="font-bold">Doporučení pro tuto pozici: </span>
                  {activePart.qualityAdvice}
                </div>
              </div>

              {/* Price summary */}
              <div className="my-5 p-4 rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold text-stone-500">
                    Nejlevnější cena na trhu
                  </div>
                  <div className="text-2xl font-black font-mono text-[#8B1E1E]">
                    {bestOffer?.price.toLocaleString('cs-CZ')} Kč
                  </div>
                </div>
                <div className="text-right text-xs text-stone-500">
                  <div>Porovnáno v <strong>{activePart.offers.length}</strong> e-shopech</div>
                  <div className="text-emerald-600 font-semibold mt-0.5">Skladem ihned</div>
                </div>
              </div>

              {/* Offers list inside diagram preview */}
              <div className="space-y-2 mb-6">
                <div className="text-xs font-bold uppercase tracking-wider text-stone-400">
                  Dostupné nabídky:
                </div>
                {activePart.offers.map((offer) => {
                  const eshop = eshops[offer.eshopId];
                  if (!eshop) return null;
                  return (
                    <div
                      key={offer.eshopId}
                      className="p-3 rounded-xl bg-stone-50/80 border border-stone-200 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-stone-900 flex items-center gap-1.5">
                          {eshop.name}
                          <span className="text-[10px] text-stone-400 font-normal">
                            ★ {eshop.rating}
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-500 mt-0.5">
                          Doprava: {offer.shippingCost === 0 ? 'Zdarma' : `${offer.shippingCost} Kč`} • {offer.deliveryDays === 1 ? 'Do 24 hod.' : `${offer.deliveryDays} dny`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-sm text-stone-900">
                          {offer.price.toLocaleString('cs-CZ')} Kč
                        </div>
                        <span className="text-[10px] text-emerald-700 font-semibold">
                          Skladem
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onSelectPart(activePart)}
                  className="flex-1 py-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Zobrazit kompletní detail</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onAddToCart(activePart)}
                  className={`py-3 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    cartPartIds.includes(activePart.id)
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#8B1E1E] text-white hover:bg-[#721818]'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>{cartPartIds.includes(activePart.id) ? 'V košíku' : 'Do košíku'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-stone-400">
              Vyberte díl na výkrese pro zobrazení cen.
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
