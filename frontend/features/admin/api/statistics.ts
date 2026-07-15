import { authedRequest } from "@/shared/api/authed-client";

export type AdminUsageStatisticsRankBy = "cost" | "tokens" | "calls";
export type AdminUsageStatisticsBillingScope = "all" | "free" | "billable";

export type AdminUsageStatisticsMetricsDTO = {
  recordCount: number;
  inputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  totalTokens: number;
  callCount: number;
  avgLatencyMS: number;
  billedNanousd: number;
  billedUSD: number;
};

export type AdminUsageStatisticsTrendDTO = AdminUsageStatisticsMetricsDTO & {
  periodStart: string;
};

export type AdminUsageStatisticsModelRankDTO = AdminUsageStatisticsMetricsDTO & {
  platformModelName: string;
  trend: AdminUsageStatisticsTrendDTO[];
};

export type AdminUsageStatisticsUserRankDTO = AdminUsageStatisticsMetricsDTO & {
  userID: number;
  username: string;
  userDisplayName: string;
  userLabel: string;
  trend: AdminUsageStatisticsTrendDTO[];
};

export type AdminUsageStatisticsData = {
  range: {
    startDate: string;
    endDate: string;
    granularity: "day" | "month" | string;
  };
  totals: AdminUsageStatisticsMetricsDTO;
  trend: AdminUsageStatisticsTrendDTO[];
  topModels: AdminUsageStatisticsModelRankDTO[];
  topUsers: AdminUsageStatisticsUserRankDTO[];
};

export type GetAdminUsageStatisticsOptions = {
  startDate: string;
  endDate: string;
  userID?: number;
  platformModelName?: string;
  billingScope?: AdminUsageStatisticsBillingScope;
  rankBy?: AdminUsageStatisticsRankBy;
};

export async function getAdminUsageStatistics(
  accessToken: string,
  options: GetAdminUsageStatisticsOptions,
): Promise<AdminUsageStatisticsData> {
  const params = new URLSearchParams({
    start_date: options.startDate,
    end_date: options.endDate,
    billing_scope: options.billingScope ?? "all",
    rank_by: options.rankBy ?? "cost",
  });
  if (options.userID && options.userID > 0) {
    params.set("user_id", String(options.userID));
  }
  if (options.platformModelName?.trim()) {
    params.set("platform_model_name", options.platformModelName.trim());
  }
  return authedRequest<AdminUsageStatisticsData>(
    `/api/v1/admin/usage-statistics?${params.toString()}`,
    { accessToken },
    true,
  );
}
