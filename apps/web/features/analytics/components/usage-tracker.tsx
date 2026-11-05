"use client";

import { useAnalyticsTracking } from "@/features/analytics/hooks/use-analytics-tracking";

export function UsageTracker() {
  useAnalyticsTracking();
  return null;
}
