import { Activity, AudioLines, ChartSpline, CircleDot, Gauge, Radio, Sigma, Waves } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type LearningTopicId =
  | "convolution"
  | "sampling"
  | "fourier-series"
  | "first-order"
  | "fourier-transform"
  | "laplace"
  | "second-order"
  | "modulation";

export type LearningTopicGroup = "concept" | "experiment";

export type LearningTopic = {
  id: LearningTopicId;
  href: string;
  icon: LucideIcon;
  accent: string;
  group: LearningTopicGroup;
};

export const LEARNING_TOPICS: readonly LearningTopic[] = [
  { id: "convolution", href: "/learn/convolution", icon: Waves, accent: "var(--chart-1)", group: "concept" },
  { id: "sampling", href: "/learn/sampling", icon: AudioLines, accent: "var(--chart-2)", group: "concept" },
  { id: "fourier-series", href: "/learn/fourier-series", icon: Sigma, accent: "var(--chart-3)", group: "concept" },
  { id: "first-order", href: "/learn/first-order", icon: Activity, accent: "var(--chart-4)", group: "concept" },
  {
    id: "fourier-transform",
    href: "/learn/fourier-transform",
    icon: ChartSpline,
    accent: "var(--chart-5)",
    group: "concept",
  },
  { id: "laplace", href: "/learn/laplace", icon: CircleDot, accent: "var(--chart-1)", group: "concept" },
  { id: "second-order", href: "/learn/second-order", icon: Gauge, accent: "var(--chart-2)", group: "concept" },
  { id: "modulation", href: "/learn/modulation", icon: Radio, accent: "var(--chart-3)", group: "concept" },
];
