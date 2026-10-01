import { parseModels, type MatchLevel } from './parseModels';

export type ProductModelLink = {
  modelId: string;
  /** úroveň konkrétního zásahu (ModelHit.level), ne úroveň řádku */
  matchLevel: 'type' | 'nickname';
  source: 'name';
  matchedText: string;
};

export type FitGeneric = { brand: string; displacement?: number };

/** Co se zapíše k jedné nabídce: souhrn do shop_products + řádky shop_product_models. */
export type ProductModels = {
  modelMatchLevel: MatchLevel | 'none';
  links: ProductModelLink[];
  fitGeneric: FitGeneric[];
};

export function buildProductModels(name: string, shopId?: string): ProductModels {
  const parsed = parseModels(name, { shopId });
  return {
    modelMatchLevel: parsed.level ?? 'none',
    links: parsed.models.map((hit) => ({
      modelId: hit.slug,
      matchLevel: hit.level,
      source: 'name',
      matchedText: hit.matchedText,
    })),
    fitGeneric: parsed.generic.map((hit) => ({
      brand: hit.brand,
      ...(hit.displacement ? { displacement: hit.displacement } : {}),
    })),
  };
}
