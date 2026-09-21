export type QualityType = 'cz_replica' | 'original' | 'renovated' | 'import';

export interface JawaModel {
  id: string;
  name: string;
  code: string;
  years: string;
  displacement: string;
  popularName: string;
  category: 'malé_kubatury' | 'kyvacka_panelka' | 'veterany_perak' | 'novejsi_dvoutakty' | 'cz_motocykly';
  description: string;
  icon: string;
  image?: string;
  partsCount: number;
}

export interface Eshop {
  id: string;
  name: string;
  domain: string;
  location: string;
  rating: number;
  reviewsCount: number;
  shippingPrice: number;
  freeShippingFrom: number;
  deliverySpeed: string;
  isVerified: boolean;
  specialization: string;
  xmlFeedSupported: boolean;
  affiliateCommissionPct: number;
  cpcBidCzk: number;
}

export interface EshopOffer {
  eshopId: string;
  price: number;
  originalPrice?: number;
  inStock: boolean;
  stockCount?: number;
  deliveryDays: number;
  shippingCost: number;
  quality: QualityType;
  qualityNote?: string;
  productUrl: string;
  itemCodeInShop: string;
}

export interface JawaPart {
  id: string;
  name: string;
  catalogNumber: string; // např. 05-11-010, 353-12-001
  category: 'motor' | 'karburator' | 'vyfuky' | 'elektro' | 'ram' | 'brzdy' | 'lanka' | 'kola' | 'tesneni' | 'svetla';
  categoryLabel: string;
  compatibleModels: string[]; // model ids
  description: string;
  recommendedQuality: QualityType;
  qualityAdvice: string;
  diagramPosition?: number;
  diagramCoordinates?: { x: number; y: number };
  image: string;
  offers: EshopOffer[];
}

export interface CartItem {
  part: JawaPart;
  quantity: number;
  selectedOfferEshopId?: string;
}

export interface SingleShopResult {
  eshop: Eshop;
  availableItemsCount: number;
  totalItemsCount: number;
  itemsTotal: number;
  shippingTotal: number;
  grandTotal: number;
  missingParts: JawaPart[];
}

export interface MultiShopGroup {
  eshop: Eshop;
  items: { part: JawaPart; quantity: number; price: number }[];
  itemsSubtotal: number;
  shipping: number;
  groupTotal: number;
}

export interface OptimizationResult {
  bestSingleShop: SingleShopResult | null;
  optimalMultiShop: {
    groups: MultiShopGroup[];
    itemsTotal: number;
    shippingTotal: number;
    grandTotal: number;
    savingsVsWorstSingle: number;
  };
}

export interface BrandProposal {
  id: string;
  name: string;
  domain: string;
  domainAvailableEstimate: boolean;
  type: 'Descriptive' | 'SEO-focused' | 'Community' | 'Modern';
  seoScore: number;
  brandScore: number;
  memorability: number;
  tagline: string;
  pros: string[];
  cons: string[];
  trademarkNote: string;
}

export interface KeywordData {
  keyword: string;
  monthlySearchesCZ: number;
  cpcEstCzk: number;
  difficulty: 'Nízká' | 'Střední' | 'Vysoká';
  intent: 'Komerční' | 'Informační' | 'Transakční' | 'Navigační';
  targetUrl: string;
}
