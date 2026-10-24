import { Activity, ChartSpline, CircleDot } from "lucide-react";

export const VIRTUAL_LAB_COURSES = [
  { id: "L1", icon: Activity, accent: "var(--chart-1)" },
  { id: "L2", icon: ChartSpline, accent: "var(--chart-2)" },
  { id: "L3", icon: CircleDot, accent: "var(--chart-3)" },
] as const;
