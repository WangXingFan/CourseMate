"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, Rectangle, XAxis, YAxis } from "recharts";
import type { BarShapeProps, RectangleProps } from "recharts";

import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  AdminUsageStatisticsMetricsDTO,
  AdminUsageStatisticsModelRankDTO,
  AdminUsageStatisticsRankBy,
  AdminUsageStatisticsTrendDTO,
  AdminUsageStatisticsUserRankDTO,
} from "@/features/admin/api";
import {
  formatBillingDisplayAmountFromUSD,
  formatBillingDisplayCompactAmountFromUSD,
  type BillingDisplayOptions,
} from "@/shared/lib/billing-display";

const trendChartConfig = {
  metricValue: {
    label: "Value",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const STACK_COLORS = [
  "#2563eb",
  "#06b6d4",
  "#f97316",
  "#7c3aed",
  "#22c55e",
  "#eab308",
  "#ec4899",
  "#4f46e5",
  "#14b8a6",
  "#ef4444",
];

function displayCost(value: number, billingDisplay: BillingDisplayOptions): string {
  if (!Number.isFinite(value) || value <= 0) {
    return formatBillingDisplayAmountFromUSD(0, billingDisplay, { maximumFractionDigits: 4 });
  }
  const compact = formatBillingDisplayCompactAmountFromUSD(value, billingDisplay, 0.0001);
  if (compact.startsWith("< ")) return compact;
  return formatBillingDisplayAmountFromUSD(value, billingDisplay, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
}

function chartMetricValue(
  metrics: AdminUsageStatisticsMetricsDTO,
  rankBy: AdminUsageStatisticsRankBy,
  billingDisplay: BillingDisplayOptions,
): number {
  const value = rawMetricValue(metrics, rankBy);
  if (rankBy !== "cost") return value;
  if (billingDisplay.currency === "CNY" && Number(billingDisplay.usdToCnyRate) > 0) {
    return value * Number(billingDisplay.usdToCnyRate);
  }
  return value;
}

function rawMetricValue(
  metrics: AdminUsageStatisticsMetricsDTO,
  rankBy: AdminUsageStatisticsRankBy,
): number {
  if (rankBy === "tokens") return metrics.totalTokens;
  if (rankBy === "calls") return metrics.callCount;
  return metrics.billedUSD;
}

function compactNumber(value: number, locale: string): string {
  if (!Number.isFinite(value) || value === 0) return "0";
  return new Intl.NumberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function chartAxisValue(
  value: number,
  rankBy: AdminUsageStatisticsRankBy,
  billingDisplay: BillingDisplayOptions,
  locale: string,
): string {
  if (rankBy !== "cost") return compactNumber(value, locale);
  const symbol = billingDisplay.currency === "CNY" && Number(billingDisplay.usdToCnyRate) > 0 ? "¥" : "$";
  return `${symbol}${compactNumber(value, locale)}`;
}

function formatLatency(value: number, locale: string): string {
  if (!Number.isFinite(value) || value <= 0) return "0";
  if (value < 1000) return `${Math.round(value).toLocaleString(locale)}ms`;
  return `${(value / 1000).toLocaleString(locale, { maximumFractionDigits: 2 })}s`;
}

function parsePeriodDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function periodLabels(value: string, granularity: string, locale: string): { short: string; full: string } {
  const date = parsePeriodDate(value);
  if (!date) return { short: "-", full: "-" };
  if (granularity === "month") {
    return {
      short: new Intl.DateTimeFormat(locale, { month: "short" }).format(date),
      full: new Intl.DateTimeFormat(locale, { year: "numeric", month: "long" }).format(date),
    };
  }
  return {
    short: new Intl.DateTimeFormat(locale, { month: "2-digit", day: "2-digit" }).format(date),
    full: new Intl.DateTimeFormat(locale, { year: "numeric", month: "2-digit", day: "2-digit" }).format(date),
  };
}

function StatisticsTooltipContent({
  active,
  payload,
  label,
  billingDisplay,
}: {
  active?: boolean;
  payload?: Array<{ payload?: { metrics?: AdminUsageStatisticsMetricsDTO; fullLabel?: string } }>;
  label?: string;
  billingDisplay: BillingDisplayOptions;
}) {
  const t = useTranslations("adminStatistics");
  const locale = useLocale();
  const item = payload?.[0]?.payload;
  const metrics = item?.metrics;
  if (!active || !metrics) return null;
  return (
    <div className="grid min-w-[12rem] gap-2 rounded-md border border-border/60 bg-background px-3 py-2 text-xs shadow-md">
      <p className="font-medium">{item.fullLabel || label}</p>
      <div className="grid gap-1 text-muted-foreground">
        <TooltipRow label={t("metrics.cost")} value={displayCost(metrics.billedUSD, billingDisplay)} />
        <TooltipRow label={t("metrics.tokens")} value={new Intl.NumberFormat(locale).format(metrics.totalTokens)} />
        <TooltipRow label={t("metrics.calls")} value={new Intl.NumberFormat(locale).format(metrics.callCount)} />
        <TooltipRow label={t("metrics.latency")} value={formatLatency(metrics.avgLatencyMS, locale)} />
      </div>
    </div>
  );
}

function TooltipRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-6">
      <span>{label}</span>
      <span className="font-medium tabular-nums text-foreground">{value}</span>
    </div>
  );
}

function ChartLoadingSkeleton({ horizontal = false }: { horizontal?: boolean }) {
  return (
    <div className={horizontal ? "grid h-[300px] content-center gap-3 px-5" : "flex h-[300px] items-end gap-2 px-5 pb-8 pt-10"}>
      {Array.from({ length: 10 }).map((_, index) => (
        <Skeleton
          key={`statistics-chart-skeleton-${index}`}
          className={horizontal ? "h-4 rounded-sm" : "flex-1 rounded-t-sm"}
          style={horizontal ? { width: `${38 + ((index * 13) % 58)}%` } : { height: `${25 + ((index * 19) % 68)}%` }}
        />
      ))}
    </div>
  );
}

export function StatisticsTrendChart({
  items,
  granularity,
  rankBy,
  billingDisplay,
  loading,
}: {
  items: AdminUsageStatisticsTrendDTO[];
  granularity: string;
  rankBy: AdminUsageStatisticsRankBy;
  billingDisplay: BillingDisplayOptions;
  loading: boolean;
}) {
  const t = useTranslations("adminStatistics");
  const locale = useLocale();
  const data = React.useMemo(
    () =>
      items.map((item) => {
        const labels = periodLabels(item.periodStart, granularity, locale);
        return {
          label: labels.short,
          fullLabel: labels.full,
          metricValue: chartMetricValue(item, rankBy, billingDisplay),
          metrics: item,
        };
      }),
    [billingDisplay, granularity, items, locale, rankBy],
  );
  const hasData = items.some((item) => item.recordCount > 0 || item.totalTokens > 0 || item.callCount > 0 || item.billedUSD > 0);

  if (loading) return <ChartLoadingSkeleton />;
  if (!loading && !hasData) {
    return <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">{t("empty")}</div>;
  }
  return (
    <ChartContainer config={trendChartConfig} className="h-[320px] w-full aspect-auto">
      <BarChart data={data} margin={{ top: 12, right: 12, left: 4, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" axisLine={false} tickLine={false} tickMargin={8} interval="preserveStartEnd" />
        <YAxis
          width={64}
          axisLine={false}
          tickLine={false}
          tickMargin={6}
          tickFormatter={(value: number) => chartAxisValue(value, rankBy, billingDisplay, locale)}
        />
        <ChartTooltip
          cursor={false}
          content={<StatisticsTooltipContent billingDisplay={billingDisplay} />}
        />
        <Bar dataKey="metricValue" fill="var(--color-metricValue)" radius={[5, 5, 1, 1]} maxBarSize={44} />
      </BarChart>
    </ChartContainer>
  );
}

type StatisticsStackedSeries = {
  key: string;
  label: string;
  fullLabel: string;
  color: string;
  trend: AdminUsageStatisticsTrendDTO[];
};

type StatisticsStackedSegment = {
  key: string;
  label: string;
  fullLabel: string;
  color: string;
  rawValue: number;
};

type StatisticsStackedChartPoint = Record<string, unknown> & {
  label: string;
  fullLabel: string;
  totalRawValue: number;
  segments: StatisticsStackedSegment[];
};

function statisticsPeriodKey(value: string): string {
  return value.slice(0, 10);
}

function formatStackedMetricValue(
  value: number,
  rankBy: AdminUsageStatisticsRankBy,
  billingDisplay: BillingDisplayOptions,
  locale: string,
): string {
  if (rankBy === "cost") return displayCost(value, billingDisplay);
  return new Intl.NumberFormat(locale).format(value);
}

function StatisticsStackedTooltipContent({
  active,
  payload,
  rankBy,
  billingDisplay,
}: {
  active?: boolean;
  payload?: Array<{ payload?: StatisticsStackedChartPoint }>;
  rankBy: AdminUsageStatisticsRankBy;
  billingDisplay: BillingDisplayOptions;
}) {
  const t = useTranslations("adminStatistics");
  const locale = useLocale();
  const item = payload?.[0]?.payload;
  if (!active || !item) return null;
  const segments = item.segments.filter((segment) => segment.rawValue > 0);
  if (segments.length === 0) return null;
  return (
    <div className="grid min-w-[15rem] max-w-[22rem] gap-2 rounded-md border border-border/60 bg-background px-3 py-2.5 text-xs shadow-md">
      <p className="font-medium">{item.fullLabel}</p>
      <TooltipRow
        label={t("rankings.total")}
        value={formatStackedMetricValue(item.totalRawValue, rankBy, billingDisplay, locale)}
      />
      <div className="grid gap-1.5 border-t border-border/50 pt-2 text-muted-foreground">
        {segments.map((segment) => (
          <div key={segment.key} className="flex items-center justify-between gap-6">
            <span className="flex min-w-0 items-center gap-1.5" title={segment.fullLabel}>
              <span className="size-2 shrink-0 rounded-[2px]" style={{ backgroundColor: segment.color }} />
              <span className="truncate">{segment.label}</span>
            </span>
            <span className="shrink-0 font-medium tabular-nums text-foreground">
              {formatStackedMetricValue(segment.rawValue, rankBy, billingDisplay, locale)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function isTopStackSegment(
  point: StatisticsStackedChartPoint,
  series: StatisticsStackedSeries[],
  seriesIndex: number,
): boolean {
  if (Number(point[series[seriesIndex]?.key] ?? 0) <= 0) return false;
  for (let index = seriesIndex + 1; index < series.length; index += 1) {
    if (Number(point[series[index]?.key] ?? 0) > 0) return false;
  }
  return true;
}

function StatisticsStackedBarShape({
  series,
  seriesIndex,
  props,
}: {
  series: StatisticsStackedSeries[];
  seriesIndex: number;
  props: BarShapeProps;
}) {
  const point: StatisticsStackedChartPoint | undefined = props.payload;
  const radius: RectangleProps["radius"] = point && isTopStackSegment(point, series, seriesIndex) ? [4, 4, 0, 0] : 0;
  return <Rectangle {...props} radius={radius} />;
}

function StatisticsStackedTrendChart({
  periods,
  granularity,
  series,
  rankBy,
  billingDisplay,
  loading,
}: {
  periods: AdminUsageStatisticsTrendDTO[];
  granularity: string;
  series: StatisticsStackedSeries[];
  rankBy: AdminUsageStatisticsRankBy;
  billingDisplay: BillingDisplayOptions;
  loading: boolean;
}) {
  const t = useTranslations("adminStatistics");
  const locale = useLocale();
  const config = React.useMemo<ChartConfig>(
    () => Object.fromEntries(series.map((item) => [item.key, { label: item.label, color: item.color }])),
    [series],
  );
  const data = React.useMemo<StatisticsStackedChartPoint[]>(
    () => {
      const metricsBySeries = series.map((item) =>
        new Map(item.trend.map((point) => [statisticsPeriodKey(point.periodStart), point])),
      );
      return periods.map((period) => {
        const labels = periodLabels(period.periodStart, granularity, locale);
        const segments = series.map((item, index) => {
          const metrics = metricsBySeries[index]?.get(statisticsPeriodKey(period.periodStart));
          return {
            key: item.key,
            label: item.label,
            fullLabel: item.fullLabel,
            color: item.color,
            rawValue: metrics ? rawMetricValue(metrics, rankBy) : 0,
            chartValue: metrics ? chartMetricValue(metrics, rankBy, billingDisplay) : 0,
          };
        });
        const point: StatisticsStackedChartPoint = {
          label: labels.short,
          fullLabel: labels.full,
          totalRawValue: segments.reduce((total, segment) => total + segment.rawValue, 0),
          segments,
        };
        for (const segment of segments) point[segment.key] = segment.chartValue;
        return point;
      });
    },
    [billingDisplay, granularity, locale, periods, rankBy, series],
  );
  const hasData = data.some((point) => point.totalRawValue > 0);
  if (loading) return <ChartLoadingSkeleton />;
  if (!loading && !hasData) {
    return <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">{t("empty")}</div>;
  }
  return (
    <div className="space-y-3">
      <ChartContainer config={config} className="h-[320px] w-full aspect-auto">
        <BarChart data={data} margin={{ top: 12, right: 12, left: 4, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tickMargin={8} interval="preserveStartEnd" />
          <YAxis
            width={64}
            axisLine={false}
            tickLine={false}
            tickMargin={6}
            tickFormatter={(value: number) => chartAxisValue(value, rankBy, billingDisplay, locale)}
          />
          <ChartTooltip
            cursor={{ fill: "var(--muted)", opacity: 0.45 }}
            content={<StatisticsStackedTooltipContent rankBy={rankBy} billingDisplay={billingDisplay} />}
          />
          {series.map((item, index) => (
            <Bar
              key={item.key}
              dataKey={item.key}
              stackId="usage"
              fill={item.color}
              maxBarSize={44}
              shape={(props: BarShapeProps) => (
                <StatisticsStackedBarShape series={series} seriesIndex={index} props={props} />
              )}
            />
          ))}
        </BarChart>
      </ChartContainer>
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-2 text-[11px] text-muted-foreground">
        {series.map((item) => (
          <span key={item.key} className="flex min-w-0 items-center gap-1.5" title={item.fullLabel}>
            <span className="size-2 shrink-0 rounded-[2px]" style={{ backgroundColor: item.color }} />
            <span className="max-w-48 truncate">{item.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function StatisticsModelRankingChart({
  items,
  periods,
  granularity,
  rankBy,
  billingDisplay,
  loading,
}: {
  items: AdminUsageStatisticsModelRankDTO[];
  periods: AdminUsageStatisticsTrendDTO[];
  granularity: string;
  rankBy: AdminUsageStatisticsRankBy;
  billingDisplay: BillingDisplayOptions;
  loading: boolean;
}) {
  const t = useTranslations("adminStatistics");
  const series = React.useMemo<StatisticsStackedSeries[]>(
    () =>
      items.map((item, index) => ({
        key: `model_${index}`,
        label: item.platformModelName.trim() || t("unknownModel"),
        fullLabel: item.platformModelName.trim() || t("unknownModel"),
        color: STACK_COLORS[index % STACK_COLORS.length],
        trend: item.trend ?? [],
      })),
    [items, t],
  );
  return (
    <StatisticsStackedTrendChart
      periods={periods}
      granularity={granularity}
      series={series}
      rankBy={rankBy}
      billingDisplay={billingDisplay}
      loading={loading}
    />
  );
}

export function StatisticsUserRankingChart({
  items,
  periods,
  granularity,
  rankBy,
  billingDisplay,
  loading,
}: {
  items: AdminUsageStatisticsUserRankDTO[];
  periods: AdminUsageStatisticsTrendDTO[];
  granularity: string;
  rankBy: AdminUsageStatisticsRankBy;
  billingDisplay: BillingDisplayOptions;
  loading: boolean;
}) {
  const t = useTranslations("adminStatistics");
  const series = React.useMemo<StatisticsStackedSeries[]>(
    () =>
      items.map((item, index) => {
        const label = item.userLabel.trim() || item.userDisplayName.trim() || item.username.trim() || t("unknownUser", { id: item.userID });
        return {
          key: `user_${index}`,
          label,
          fullLabel: `${label} (#${item.userID})`,
          color: STACK_COLORS[index % STACK_COLORS.length],
          trend: item.trend ?? [],
        };
      }),
    [items, t],
  );
  return (
    <StatisticsStackedTrendChart
      periods={periods}
      granularity={granularity}
      series={series}
      rankBy={rankBy}
      billingDisplay={billingDisplay}
      loading={loading}
    />
  );
}

export function formatStatisticsCost(value: number, billingDisplay: BillingDisplayOptions): string {
  return displayCost(value, billingDisplay);
}

export function formatStatisticsCount(value: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(value);
}

export function formatStatisticsLatency(value: number, locale: string): string {
  return formatLatency(value, locale);
}
