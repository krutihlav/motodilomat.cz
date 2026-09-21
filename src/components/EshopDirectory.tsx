import React, { useState } from 'react';
import { Store, Star, Truck, ShieldCheck, ExternalLink, CheckCircle2, Plus, Sparkles } from 'lucide-react';
import { Eshop } from '../types';

interface EshopDirectoryProps {
  eshops: Eshop[];
  onOutboundClick: (eshopName: string, partName: string, url: string) => void;
}

export const EshopDirectory: React.FC<EshopDirectoryProps> = ({ eshops, onOutboundClick }) => {
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registeredSuccess, setRegisteredSuccess] = useState(false);
  const [newEshopName, setNewEshopName] = useState('');
  const [newEshopDomain, setNewEshopDomain] = useState('');
  const [newEshopFeedUrl, setNewEshopFeedUrl] = useState('');

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEshopName || !newEshopDomain) return;
    setRegisteredSuccess(true);
    setTimeout(() => {
      setShowRegisterModal(false);
      setRegisteredSuccess(false);
      setNewEshopName('');
      setNewEshopDomain('');
      setNewEshopFeedUrl('');
    }, 2500);
  };

  return (
    <div className="space-y-8">
      {/* Intro */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 md:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-800 text-xs font-bold mb-2">
            <Store className="w-3.5 h-3.5 text-blue-600" />
            Partnerská síť ověřených prodejců
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-stone-900 tracking-tight">
            Zapojené e-shopy s náhradními díly Jawa & ČZ
          </h2>
          <p className="text-stone-500 text-xs md:text-sm mt-1">
            Data o cenách, skladové dostupnosti a ceně dopravy synchronizujeme v reálném čase přes standardizované XML feedy.
          </p>
        </div>

        <button
          onClick={() => setShowRegisterModal(true)}
          className="px-5 py-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Zapojit svůj e-shop (B2B)</span>
        </button>
      </div>

      {/* Grid of Eshops */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {eshops.map((shop) => (
          <div
            key={shop.id}
            className="bg-white rounded-2xl border border-stone-200 p-6 flex flex-col justify-between hover:shadow-md transition-all group"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <span className="font-mono text-xs font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded">
                  {shop.location}
                </span>
                {shop.isVerified && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Ověřený prodejce
                  </span>
                )}
              </div>

              <h3 className="text-xl font-bold text-stone-900 group-hover:text-[#8B1E1E] transition-colors">
                {shop.name}
              </h3>
              <div className="text-xs text-stone-400 font-mono mt-0.5">
                https://{shop.domain}
              </div>

              <div className="flex items-center gap-1.5 my-3 text-xs">
                <div className="flex items-center text-amber-500 font-bold">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400 mr-1" />
                  {shop.rating} / 5.0
                </div>
                <span className="text-stone-400">({shop.reviewsCount.toLocaleString()} hodnocení)</span>
              </div>

              <p className="text-xs text-stone-600 line-clamp-2 mb-4">
                {shop.specialization}
              </p>

              {/* Shipping & Delivery details */}
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-100 text-xs space-y-1.5 text-stone-600">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-stone-400" />
                    Základní poštovné:
                  </span>
                  <span className="font-bold text-stone-900">{shop.shippingPrice} Kč</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Doprava zdarma od:</span>
                  <span className="font-bold text-emerald-700">{shop.freeShippingFrom.toLocaleString()} Kč</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Rychlost odeslání:</span>
                  <span className="text-stone-900 font-medium">{shop.deliverySpeed}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-stone-100 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                ✓ XML Feed aktivní
              </span>
              <button
                onClick={() => onOutboundClick(shop.name, 'Profil obchodu', `https://${shop.domain}`)}
                className="text-xs font-bold text-[#8B1E1E] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Navštívit e-shop</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Shop registration modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-stone-200 shadow-2xl relative">
            <h3 className="text-xl font-black text-stone-900">
              Registrace nového e-shopu do JawaSrovnávače
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              Získejte okamžitý přísun relevantních zákazníků, kteří aktivně renovují motocykly Jawa.
            </p>

            {registeredSuccess ? (
              <div className="my-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                <h4 className="font-bold text-emerald-950 text-sm">Žádost byla úspěšně odeslána!</h4>
                <p className="text-xs text-emerald-800 mt-1">
                  Náš technický tým zkontroluje váš XML feed a ozve se vám do 24 hodin.
                </p>
              </div>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Název e-shopu:
                  </label>
                  <input
                    type="text"
                    required
                    value={newEshopName}
                    onChange={(e) => setNewEshopName(e.target.value)}
                    placeholder="Např. MotoDíly Novák"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs focus:outline-none focus:border-[#8B1E1E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Doména / Webová adresa:
                  </label>
                  <input
                    type="text"
                    required
                    value={newEshopDomain}
                    onChange={(e) => setNewEshopDomain(e.target.value)}
                    placeholder="www.vaseshop.cz"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs focus:outline-none focus:border-[#8B1E1E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    URL adresa XML feedu (Heureka nebo Zboží specifikace):
                  </label>
                  <input
                    type="url"
                    value={newEshopFeedUrl}
                    onChange={(e) => setNewEshopFeedUrl(e.target.value)}
                    placeholder="https://vaseshop.cz/feed/heureka.xml"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs focus:outline-none focus:border-[#8B1E1E]"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-[#8B1E1E] text-white font-bold text-xs hover:bg-[#721818] cursor-pointer"
                  >
                    Odeslat k validaci
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRegisterModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 text-xs font-semibold hover:bg-stone-100 cursor-pointer"
                  >
                    Zrušit
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
