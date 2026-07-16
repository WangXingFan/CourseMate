import type {
  BatchDeleteRedemptionCodeDataResponse,
  BatchDeleteRedemptionCodeRequest,
  BatchDeleteRedemptionCodeResultResponse,
  BillingAccountDataResponse,
  BillingAccountResponse,
  BillingConfigDataResponse,
  BillingConfigRequest,
  BillingConfigResponse,
  BillingPlanDataResponse,
  BillingPlanResponse,
  BillingPriceResponse,
  CreateRedemptionCodeRequest,
  ModelPricingDataResponse,
  ModelPricingResponse,
  NativeToolPricingResponse,
  OpenRouterOfficialPricingDataResponse,
  OpenRouterOfficialPricingItemResponse,
  PatchRedemptionCodeRequestDoc,
  RedemptionCodeCreateDataResponse,
  RedemptionCodeDataResponse,
  RedemptionCodeDeleteDataResponse,
  RedemptionCodeResponse,
  UpdateBillingAccountBalanceRequest,
  UpdateBillingPlanRequest,
  UpsertModelPricingRequest,
} from "@deeix/api-contract";
import type { PagePayload } from "@/shared/api/common.types";

export type AdminBillingPlanPriceDTO = Required<BillingPriceResponse>;

export type AdminBillingPlanDTO = Omit<Required<BillingPlanResponse>, "permissionGroupID" | "prices"> & {
  permissionGroupID: number | null;
  prices: AdminBillingPlanPriceDTO[];
};

export type AdminModelPricingDTO = Required<ModelPricingResponse>;

export type UpsertAdminModelPricingRequest = UpsertModelPricingRequest;

export type AdminModelPricingData = Omit<Required<ModelPricingDataResponse>, "modelPricing"> & {
  modelPricing: AdminModelPricingDTO;
};

export type AdminOfficialPricingCatalogItemDTO = Required<OpenRouterOfficialPricingItemResponse>;

export type AdminOfficialPricingCatalogData = Omit<Required<OpenRouterOfficialPricingDataResponse>, "items"> & {
  items: AdminOfficialPricingCatalogItemDTO[];
};

export type UpdateAdminBillingPlanRequest = Omit<UpdateBillingPlanRequest, "billingInterval" | "permissionGroupID"> & {
  billingInterval: "month" | "year" | "lifetime" | string;
  permissionGroupID?: number | null;
};

export type AdminBillingPlanData = Omit<Required<BillingPlanDataResponse>, "plan"> & {
  plan: AdminBillingPlanDTO;
};

export type AdminBillingMode = "self" | "period" | "usage";

export type NativeToolPricingDTO = Required<NativeToolPricingResponse>;

export type AdminBillingConfigDTO = Omit<Required<BillingConfigResponse>, "epayTypes" | "mode" | "nativeToolPricing"> & {
  mode: AdminBillingMode;
  nativeToolPricing: NativeToolPricingDTO[];
  epayTypes: Array<{ name: string; type: string }>;
};

export type UpdateAdminBillingConfigRequest = Omit<BillingConfigRequest, "mode" | "nativeToolPricing"> & {
  mode: AdminBillingMode;
  nativeToolPricing?: NativeToolPricingDTO[];
};

export type AdminBillingConfigData = Omit<Required<BillingConfigDataResponse>, "config"> & {
  config: AdminBillingConfigDTO;
};

export type AdminBillingAccountDTO = Required<BillingAccountResponse>;

export type AdminBillingAccountData = Omit<Required<BillingAccountDataResponse>, "account"> & {
  account: AdminBillingAccountDTO;
};

export type UpdateAdminBillingAccountBalanceRequest = UpdateBillingAccountBalanceRequest;

export type AdminRedemptionCodeDTO = Omit<
  Required<RedemptionCodeResponse>,
  "code" | "expiresAt" | "maxRedemptions" | "remainingRedemptions"
> & {
  code?: string;
  maxRedemptions: number | null;
  remainingRedemptions: number | null;
  expiresAt: string | null;
};

export type CreateAdminRedemptionCodeRequest = Omit<CreateRedemptionCodeRequest, "expiresAt" | "maxRedemptions"> & {
  maxRedemptions?: number | null;
  expiresAt?: string | null;
};

export type UpdateAdminRedemptionCodeRequest = Omit<PatchRedemptionCodeRequestDoc, "expiresAt" | "maxRedemptions"> & {
  maxRedemptions?: number | null;
  expiresAt?: string | null;
};

export type AdminRedemptionCodePage = PagePayload<AdminRedemptionCodeDTO>;

export type AdminRedemptionCodeCreateData = Omit<Required<RedemptionCodeCreateDataResponse>, "results"> & {
  results: AdminRedemptionCodeDTO[];
};

export type AdminRedemptionCodeData = Omit<Required<RedemptionCodeDataResponse>, "code"> & {
  code: AdminRedemptionCodeDTO;
};

export type AdminRedemptionCodeDeleteData = Required<RedemptionCodeDeleteDataResponse>;

export type AdminRedemptionCodeBatchDeleteRequest = BatchDeleteRedemptionCodeRequest;

export type AdminRedemptionCodeBatchDeleteResult = Omit<Required<BatchDeleteRedemptionCodeResultResponse>, "error"> & {
  status: "deleted" | "not_found" | "failed" | string;
  error?: string;
};

export type AdminRedemptionCodeBatchDeleteData = Omit<Required<BatchDeleteRedemptionCodeDataResponse>, "results"> & {
  results: AdminRedemptionCodeBatchDeleteResult[];
};

export type AdminModelPricingPage = PagePayload<AdminModelPricingDTO>;
