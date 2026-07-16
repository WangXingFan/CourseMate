import type {
  PublicModelPricingResponse,
  PublicModelPricingTierResponse,
  PublicModelResponse,
} from "@deeix/api-contract";

export type PublicModelPricingTierDTO = Omit<Required<PublicModelPricingTierResponse>, "upToTokens"> & {
  upToTokens: number | null;
};

export type PublicModelPricingDTO = Omit<Required<PublicModelPricingResponse>, "tiers"> & {
  tiers: PublicModelPricingTierDTO[];
};

export type PublicModelDTO = Omit<Required<PublicModelResponse>, "pricing"> & {
  pricing: PublicModelPricingDTO | null;
};
