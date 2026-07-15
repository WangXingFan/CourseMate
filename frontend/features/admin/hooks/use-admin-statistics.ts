import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  getAdminBillingConfig,
  getAdminUsageStatistics,
  listAdminLLMModels,
  type AdminUsageStatisticsBillingScope,
  type AdminUsageStatisticsData,
  type AdminUsageStatisticsRankBy,
} from "@/features/admin/api";
import { listAllAdminPages } from "@/features/admin/api/shared";
import { resolveAdminErrorMessage } from "@/features/admin/utils/admin-error";
import type { ModelSelectOption } from "@/shared/components/model-select";
import { resolveAccessToken } from "@/shared/auth/resolve-access-token";
import {
  normalizeBillingDisplayCurrency,
  type BillingDisplayOptions,
} from "@/shared/lib/billing-display";
import { resolveModelOptionIconUrl } from "@/shared/lib/model-option-display";

export type AdminStatisticsRangePreset = "7" | "30" | "90" | "custom";
export type AdminStatisticsRangeError = "incomplete" | "invalid" | "tooLong" | null;

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function recentDateRange(days: number): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - Math.max(0, days - 1));
  return { startDate: formatLocalDate(start), endDate: formatLocalDate(end) };
}

function parseDateValue(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const timestamp = Date.UTC(year, month - 1, day);
  const date = new Date(timestamp);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return timestamp;
}

function validateDateRange(startDate: string, endDate: string): AdminStatisticsRangeError {
  if (!startDate.trim() || !endDate.trim()) return "incomplete";
  const start = parseDateValue(startDate);
  const end = parseDateValue(endDate);
  if (start === null || end === null || end < start) return "invalid";
  const days = Math.floor((end - start) / 86_400_000) + 1;
  return days > 366 ? "tooLong" : null;
}

export function useAdminStatistics() {
  const t = useTranslations("adminStatistics");
  const initialRangeRef = React.useRef(recentDateRange(30));
  const [startDate, setStartDateState] = React.useState(initialRangeRef.current.startDate);
  const [endDate, setEndDateState] = React.useState(initialRangeRef.current.endDate);
  const [rangePreset, setRangePresetState] = React.useState<AdminStatisticsRangePreset>("30");
  const [userID, setUserID] = React.useState<number | undefined>();
  const [platformModelName, setPlatformModelName] = React.useState("");
  const [billingScope, setBillingScope] = React.useState<AdminUsageStatisticsBillingScope>("all");
  const [rankBy, setRankBy] = React.useState<AdminUsageStatisticsRankBy>("cost");
  const [statistics, setStatistics] = React.useState<AdminUsageStatisticsData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [modelOptions, setModelOptions] = React.useState<ModelSelectOption[]>([]);
  const [referenceLoading, setReferenceLoading] = React.useState(true);
  const [billingDisplay, setBillingDisplay] = React.useState<BillingDisplayOptions>({
    currency: "USD",
    usdToCnyRate: null,
  });
  const requestSequenceRef = React.useRef(0);
  const rangeError = React.useMemo(
    () => validateDateRange(startDate, endDate),
    [endDate, startDate],
  );

  React.useEffect(() => {
    let cancelled = false;
    setReferenceLoading(true);
    void (async () => {
      try {
        const token = await resolveAccessToken();
        if (!token) return;
        const [configResult, modelsResult] = await Promise.allSettled([
          getAdminBillingConfig(token),
          listAllAdminPages((options) => listAdminLLMModels(token, { ...options, onlyActive: false })),
        ]);
        if (cancelled) return;
        if (configResult.status === "fulfilled") {
          setBillingDisplay({
            currency: normalizeBillingDisplayCurrency(configResult.value.config.displayCurrency),
            usdToCnyRate: configResult.value.config.usdToCNYRate ?? null,
          });
        }
        if (modelsResult.status === "fulfilled") {
          const nextModelOptions = modelsResult.value
            .map((model) => ({
              label: model.platformModelName.trim(),
              value: model.platformModelName.trim(),
              iconUrl: resolveModelOptionIconUrl({
                platformModelName: model.platformModelName,
                vendor: model.vendor ?? "",
                icon: model.icon ?? "",
              }),
            }))
            .filter((model) => model.value);
          setModelOptions(
            [...new Map(nextModelOptions.map((model) => [model.value, model])).values()].sort((left, right) =>
              left.label.localeCompare(right.label),
            ),
          );
        }
        const rejectedResult = [configResult, modelsResult].find((result) => result.status === "rejected");
        if (rejectedResult?.status === "rejected") {
          toast.error(t("toasts.referenceLoadFailed"), { description: resolveAdminErrorMessage(rejectedResult.reason) });
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(t("toasts.referenceLoadFailed"), { description: resolveAdminErrorMessage(error) });
        }
      } finally {
        if (!cancelled) setReferenceLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  React.useEffect(() => {
    if (rangeError) {
      requestSequenceRef.current += 1;
      setLoading(false);
      return;
    }
    const requestSequence = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestSequence;
    setLoading(true);
    void (async () => {
      try {
        const token = await resolveAccessToken();
        if (!token) {
          toast.error(t("toasts.sessionExpired"), { description: t("toasts.signInAgain") });
          return;
        }
        const data = await getAdminUsageStatistics(token, {
          startDate,
          endDate,
          userID,
          platformModelName,
          billingScope,
          rankBy,
        });
        if (requestSequence === requestSequenceRef.current) {
          setStatistics(data);
        }
      } catch (error) {
        if (requestSequence === requestSequenceRef.current) {
          toast.error(t("toasts.loadFailed"), { description: resolveAdminErrorMessage(error) });
        }
      } finally {
        if (requestSequence === requestSequenceRef.current) {
          setLoading(false);
        }
      }
    })();
  }, [billingScope, endDate, platformModelName, rangeError, rankBy, reloadKey, startDate, t, userID]);

  const setRangePreset = React.useCallback((preset: AdminStatisticsRangePreset) => {
    setRangePresetState(preset);
    if (preset === "custom") return;
    const range = recentDateRange(Number(preset));
    setStartDateState(range.startDate);
    setEndDateState(range.endDate);
  }, []);
  const setStartDate = React.useCallback((value: string) => {
    setRangePresetState("custom");
    setStartDateState(value);
  }, []);
  const setEndDate = React.useCallback((value: string) => {
    setRangePresetState("custom");
    setEndDateState(value);
  }, []);
  const refresh = React.useCallback(() => setReloadKey((current) => current + 1), []);

  return {
    statistics,
    loading,
    referenceLoading,
    billingDisplay,
    modelOptions,
    startDate,
    endDate,
    rangePreset,
    rangeError,
    userID,
    platformModelName,
    billingScope,
    rankBy,
    setStartDate,
    setEndDate,
    setRangePreset,
    setUserID,
    setPlatformModelName,
    setBillingScope,
    setRankBy,
    refresh,
  };
}
