import type {
  BillingAccountDataResponse,
  BillingAccountResponse,
  BillingConfigDataResponse,
  BillingConfigResponse,
  BillingOverviewDataResponse,
  BillingOverviewResponse,
  BillingPlanResponse,
  BillingPriceResponse,
  CheckoutDataResponse,
  CheckoutResponse,
  CreateCheckoutRequest as ContractCreateCheckoutRequest,
  NativeToolPricingResponse,
  RedeemCodeRequest,
  RedemptionApplyDataResponse,
  RedemptionResponse,
  SubscriptionDataResponse,
  SubscriptionEntitlementResponse,
  SubscriptionResponse,
  UsageDailyModelResponse,
  UsageDailyResponse,
  UsageLedgerResponse,
  UsageMonthlyResponse,
} from "@deeix/api-contract";

export type BillingPlanPriceDTO = Required<BillingPriceResponse>;

export type BillingPlanDTO = Omit<Required<BillingPlanResponse>, "permissionGroupID" | "prices"> & {
  prices: BillingPlanPriceDTO[];
};

export type CreateCheckoutRequest = ContractCreateCheckoutRequest;

export type CheckoutDTO = Omit<Required<CheckoutResponse>, "expiredAt"> & {
  expiredAt: string | null;
};

export type CheckoutData = Omit<Required<CheckoutDataResponse>, "checkout"> & {
  checkout: CheckoutDTO;
};

export type BillingMode = "self" | "period" | "usage";

export type NativeToolPricingDTO = Required<
  Pick<NativeToolPricingResponse, "billable" | "priceLabel" | "priceNanousd" | "provider" | "toolKey" | "unit">
>;

export type BillingConfigData = Omit<Required<BillingConfigDataResponse>, "config"> & {
  config: Required<
    Pick<
      BillingConfigResponse,
      "nativeToolBillingEnabled" | "usdToCNYRate"
    >
  > & {
    mode: BillingMode;
    nativeToolPricing: NativeToolPricingDTO[];
    paymentProviders: Array<"stripe" | "epay" | string>;
    displayCurrency: "USD" | "CNY" | string;
    epayTypes: Array<{ name: string; type: string }>;
  };
};

export type BillingAccountData = Omit<Required<BillingAccountDataResponse>, "account"> & {
  account: Required<BillingAccountResponse>;
};

export type BillingOverviewData = Omit<Required<BillingOverviewDataResponse>, "overview"> & {
  overview: Omit<
    Required<BillingOverviewResponse>,
    "account" | "periodEndAt" | "periodStartAt" | "plan" | "subscriptionEntitlements"
  > & {
    mode: BillingMode;
    plan: BillingPlanDTO | null;
    periodStartAt: string | null;
    periodEndAt: string | null;
    account: BillingAccountData["account"] | null;
    subscriptionEntitlements: BillingSubscriptionEntitlementDTO[];
  };
};

export type BillingSubscriptionDTO = Omit<Required<SubscriptionResponse>, "currentPeriodEndAt"> & {
  currentPeriodEndAt: string | null;
};

export type BillingSubscriptionEntitlementDTO = Omit<
  Required<SubscriptionEntitlementResponse>,
  "currentPeriodEndAt" | "plan"
> & {
  currentPeriodEndAt: string | null;
  plan: BillingPlanDTO;
};

export type RedeemBillingCodeRequest = RedeemCodeRequest;

export type BillingRedemptionDTO = Required<RedemptionResponse>;

export type RedeemBillingCodeData = Omit<
  Required<RedemptionApplyDataResponse>,
  "account" | "overview" | "redemption" | "subscription"
> & {
  redemption: BillingRedemptionDTO;
  account?: BillingAccountData["account"];
  subscription?: SubscribeData["subscription"];
  overview: BillingOverviewData["overview"];
};

export type BillingUsageLedgerDTO = Required<Omit<UsageLedgerResponse, "billingAt">>;

export type BillingUsageMonthlyDTO = Required<UsageMonthlyResponse>;

export type BillingUsageDailyDTO = Omit<Required<UsageDailyResponse>, "models"> & {
  models: BillingUsageDailyModelDTO[];
};

export type BillingUsageDailyModelDTO = Required<UsageDailyModelResponse>;

export type SubscribeData = Omit<Required<SubscriptionDataResponse>, "subscription"> & {
  subscription: Pick<BillingSubscriptionDTO, "id" | "planID" | "priceID" | "status">;
};
