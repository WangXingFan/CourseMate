"use client";

import * as React from "react";
import { Activity, BadgeDollarSign, Braces, RefreshCw, Timer } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminDateRangeFilter } from "@/features/admin/components/admin-date-range-filter";
import type {
  AdminUsageStatisticsBillingScope,
  AdminUsageStatisticsMetricsDTO,
  AdminUsageStatisticsRankBy,
} from "@/features/admin/api";
import { useAdminStatistics, type AdminStatisticsRangePreset } from "@/features/admin/hooks/use-admin-statistics";
import { cn } from "@/lib/utils";
import { ModelSelect } from "@/shared/components/model-select";
import type { UserDTO } from "@/shared/api/auth.types";
import { AdminStatisticsUserFilter } from "./admin-statistics-user-filter";
import {
  formatStatisticsCost,
  formatStatisticsCount,
  formatStatisticsLatency,
  StatisticsModelRankingChart,
  StatisticsTrendChart,
  StatisticsUserRankingChart,
} from "./admin-statistics-charts";

const ALL_MODELS_VALUE = "__all_models__";

function FilterField({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("grid min-w-0 gap-1.5", className)}>
      <span className="px-0.5 text-[11px] font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
  loading,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  loading: boolean;
}) {
  return (
    <div className="rounded-md bg-muted/35 p-3.5 md:p-4">
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="text-foreground/55">{icon}</span>
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-7 w-28" />
      ) : (
        <p className="mt-2 truncate text-xl font-semibold tabular-nums tracking-tight text-foreground md:text-2xl">{value}</p>
      )}
    </div>
  );
}

function MetricSwitch({
  value,
  onChange,
  disabled,
}: {
  value: AdminUsageStatisticsRankBy;
  onChange: (value: AdminUsageStatisticsRankBy) => void;
  disabled: boolean;
}) {
  const t = useTranslations("adminStatistics");
  const options: AdminUsageStatisticsRankBy[] = ["cost", "tokens", "calls"];
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-muted/45 p-1">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          disabled={disabled}
          className={cn(
            "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-60",
            value === option
              ? "bg-background text-foreground shadow-xs"
              : "text-foreground/60 hover:text-foreground",
          )}
          onClick={() => onChange(option)}
        >
          {t(`rankBy.${option}`)}
        </button>
      ))}
    </div>
  );
}

function emptyMetrics(): AdminUsageStatisticsMetricsDTO {
  return {
    recordCount: 0,
    inputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    outputTokens: 0,
    reasoningTokens: 0,
    totalTokens: 0,
    callCount: 0,
    avgLatencyMS: 0,
    billedNanousd: 0,
    billedUSD: 0,
  };
}

export function AdminStatisticsPage() {
  const t = useTranslations("adminStatistics");
  const locale = useLocale();
  const statistics = useAdminStatistics();
  const [selectedUser, setSelectedUser] = React.useState<UserDTO | null>(null);
  const totals = statistics.statistics?.totals ?? emptyMetrics();
  const trendItems = statistics.statistics?.trend ?? [];
  const granularity = statistics.statistics?.range.granularity ?? "day";
  const initialLoading = statistics.loading && !statistics.statistics;
  const modelOptions = React.useMemo(
    () => [{ label: t("filters.allModels"), value: ALL_MODELS_VALUE }, ...statistics.modelOptions],
    [statistics.modelOptions, t],
  );
  const rangeErrorText = statistics.rangeError ? t(`filters.rangeErrors.${statistics.rangeError}`) : "";

  return (
    <div className="space-y-6 pb-10 md:space-y-7">
      <div className="flex min-h-10 items-center justify-between gap-3 px-1">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{t("title")}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{t("description")}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 shrink-0 gap-1.5 px-2.5 text-xs"
          onClick={statistics.refresh}
          disabled={statistics.loading || Boolean(statistics.rangeError)}
        >
          <RefreshCw className={cn("size-3.5", statistics.loading && "animate-spin")} />
          {t("refresh")}
        </Button>
      </div>

      <section className="rounded-md bg-muted/30 p-3 md:p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
          <FilterField label={t("filters.rangePreset")}>
            <Select
              value={statistics.rangePreset}
              onValueChange={(value) => statistics.setRangePreset(value as AdminStatisticsRangePreset)}
            >
              <SelectTrigger className="h-8 w-full border-input/40 bg-transparent text-xs shadow-none dark:bg-input/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">{t("filters.last7Days")}</SelectItem>
                <SelectItem value="30">{t("filters.last30Days")}</SelectItem>
                <SelectItem value="90">{t("filters.last90Days")}</SelectItem>
                <SelectItem value="custom">{t("filters.custom")}</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label={t("filters.dateRange")}>
            <AdminDateRangeFilter
              fromValue={statistics.startDate}
              toValue={statistics.endDate}
              onFromChange={statistics.setStartDate}
              onToChange={statistics.setEndDate}
              disabled={statistics.loading}
              triggerClassName="h-8"
            />
          </FilterField>
          <FilterField label={t("filters.user")}>
            <AdminStatisticsUserFilter
              value={selectedUser}
              disabled={statistics.loading}
              onChange={(user) => {
                setSelectedUser(user);
                statistics.setUserID(user?.id);
              }}
            />
          </FilterField>
          <FilterField label={t("filters.model")}>
            <ModelSelect
              value={statistics.platformModelName || ALL_MODELS_VALUE}
              fallbackValue={ALL_MODELS_VALUE}
              options={modelOptions}
              disabled={statistics.referenceLoading || statistics.loading}
              valueAlign="start"
              itemAlign="start"
              align="start"
              triggerClassName="h-8 text-xs"
              contentClassName="min-w-[280px]"
              onChange={(value) => statistics.setPlatformModelName(value === ALL_MODELS_VALUE ? "" : value)}
            />
          </FilterField>
          <FilterField label={t("filters.billingScope")}>
            <Select
              value={statistics.billingScope}
              disabled={statistics.loading}
              onValueChange={(value) => statistics.setBillingScope(value as AdminUsageStatisticsBillingScope)}
            >
              <SelectTrigger className="h-8 w-full border-input/40 bg-transparent text-xs shadow-none dark:bg-input/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("filters.billingAll")}</SelectItem>
                <SelectItem value="free">{t("filters.billingFree")}</SelectItem>
                <SelectItem value="billable">{t("filters.billingBillable")}</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>
        </div>
        {rangeErrorText ? <p className="mt-3 px-0.5 text-xs text-destructive">{rangeErrorText}</p> : null}
      </section>

      <section className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <MetricCard
          label={t("metrics.cost")}
          value={formatStatisticsCost(totals.billedUSD, statistics.billingDisplay)}
          icon={<BadgeDollarSign className="size-4" />}
          loading={initialLoading}
        />
        <MetricCard
          label={t("metrics.tokens")}
          value={formatStatisticsCount(totals.totalTokens, locale)}
          icon={<Braces className="size-4" />}
          loading={initialLoading}
        />
        <MetricCard
          label={t("metrics.calls")}
          value={formatStatisticsCount(totals.callCount, locale)}
          icon={<Activity className="size-4" />}
          loading={initialLoading}
        />
        <MetricCard
          label={t("metrics.latency")}
          value={formatStatisticsLatency(totals.avgLatencyMS, locale)}
          icon={<Timer className="size-4" />}
          loading={initialLoading}
        />
      </section>

      <Separator />

      <section className="space-y-4">
        <div className="flex min-h-9 flex-wrap items-center justify-between gap-3 px-1">
          <div>
            <h3 className="text-sm font-semibold">{t("trend.title")}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {statistics.statistics?.range.granularity === "month" ? t("trend.monthly") : t("trend.daily")}
            </p>
          </div>
          <MetricSwitch value={statistics.rankBy} onChange={statistics.setRankBy} disabled={statistics.loading} />
        </div>
        <div className="rounded-md bg-muted/30 p-2 md:p-3">
          <StatisticsTrendChart
            items={trendItems}
            granularity={granularity}
            rankBy={statistics.rankBy}
            billingDisplay={statistics.billingDisplay}
            loading={statistics.loading}
          />
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <div className="space-y-3 rounded-md bg-muted/30 p-2 md:p-3">
          <div className="px-2 pt-1">
            <h3 className="text-sm font-semibold">{t("rankings.models")}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{t("rankings.top10", { metric: t(`rankBy.${statistics.rankBy}`) })}</p>
          </div>
          <StatisticsModelRankingChart
            items={statistics.statistics?.topModels ?? []}
            periods={trendItems}
            granularity={granularity}
            rankBy={statistics.rankBy}
            billingDisplay={statistics.billingDisplay}
            loading={statistics.loading}
          />
        </div>
        <div className="space-y-3 rounded-md bg-muted/30 p-2 md:p-3">
          <div className="px-2 pt-1">
            <h3 className="text-sm font-semibold">{t("rankings.users")}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{t("rankings.top10", { metric: t(`rankBy.${statistics.rankBy}`) })}</p>
          </div>
          <StatisticsUserRankingChart
            items={statistics.statistics?.topUsers ?? []}
            periods={trendItems}
            granularity={granularity}
            rankBy={statistics.rankBy}
            billingDisplay={statistics.billingDisplay}
            loading={statistics.loading}
          />
        </div>
      </section>
    </div>
  );
}
