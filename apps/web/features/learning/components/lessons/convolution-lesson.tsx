"use client";

import { useTranslations } from "next-intl";
import * as React from "react";

import { LabSlider } from "@/features/learning/components/shared/lab-slider";
import { LessonPanel, LessonShell, Readout } from "@/features/learning/components/shared/lesson-shell";
import { SignalPlot, type PlotPoint } from "@/features/learning/components/shared/signal-plot";

const TAU_MIN = -1.4;
const TAU_MAX = 3.4;
const T_MIN = -1.2;
const T_MAX = 3.2;
const RECT_HALF_WIDTH = 0.5;
const SAMPLE_COUNT = 900;

export function ConvolutionLesson() {
  const t = useTranslations("learning.convolution");
  const [time, setTime] = React.useState(0.8);

  const shifted = React.useMemo(() => buildShiftedSeries(time), [time]);
  const output = React.useMemo(() => buildOutputSeries(), []);
  const integral = React.useMemo(() => trapezoid(shifted.product), [shifted.product]);
  const exact = React.useMemo(() => exactOutput(time), [time]);
  const overlap = React.useMemo(() => resolveOverlap(time), [time]);

  const phase =
    time < -RECT_HALF_WIDTH
      ? t("phases.before")
      : time <= RECT_HALF_WIDTH
        ? t("phases.rising")
        : t("phases.falling");

  return (
    <LessonShell title={t("title")} formula={t.raw("formula")}>
      <div className="space-y-3">
        <LessonPanel title={t("controls.title")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <LabSlider
              label={t("controls.time")}
              value={time}
              min={T_MIN}
              max={T_MAX}
              step={0.01}
              onChange={setTime}
              format={(value) => `t = ${value.toFixed(2)}`}
            />
            <div className="grid grid-cols-2 gap-2">
              <Readout label={t("readouts.integral")} value={integral.toFixed(3)} />
              <Readout label={t("readouts.exact")} value={exact.toFixed(3)} />
              <Readout label={t("readouts.overlap")} value={overlap} />
              <Readout label={t("readouts.phase")} value={phase} />
            </div>
          </div>
        </LessonPanel>

        <LessonPanel title={t("plot.overlapTitle")}>
          <SignalPlot
            xDomain={[TAU_MIN, TAU_MAX]}
            yDomain={[-0.08, 1.18]}
            xLabel="τ"
            yLabel={t("plot.amplitude")}
            series={[
              { id: "x", label: "x(τ)", points: shifted.input, color: "var(--chart-1)" },
              { id: "h", label: "h(t−τ)", points: shifted.kernel, color: "var(--chart-2)", dashed: true },
              { id: "product", label: t("plot.product"), points: shifted.product, color: "var(--chart-3)", fill: true, width: 1.5 },
            ]}
            verticalMarkers={[{ x: time, color: "var(--chart-4)", label: t("plot.currentT") }]}
          />
        </LessonPanel>

        <LessonPanel title={t("plot.outputTitle")}>
          <SignalPlot
            xDomain={[T_MIN, T_MAX]}
            yDomain={[-0.05, 0.8]}
            xLabel="t"
            yLabel="y(t)"
            series={[{ id: "y", label: "y(t) = x * h", points: output, color: "var(--chart-1)" }]}
            markers={[{ x: time, y: exact, color: "var(--chart-4)", label: `t=${time.toFixed(2)}` }]}
            verticalMarkers={[{ x: time, color: "var(--chart-4)" }]}
          />
        </LessonPanel>

        <div className="grid gap-3 md:grid-cols-2">
          <LessonPanel title={t("steps.title")}>
            <ol className="space-y-2 text-xs leading-5 text-muted-foreground">
              <li>1. {t("steps.flip")}</li>
              <li>2. {t("steps.shift")}</li>
              <li>3. {t("steps.multiply")}</li>
              <li>4. {t("steps.integrate")}</li>
            </ol>
          </LessonPanel>
          <LessonPanel title={t("observe.title")}>
            <ul className="space-y-2 text-xs leading-5 text-muted-foreground">
              <li>{t("observe.noOverlap")}</li>
              <li>{t("observe.rising")}</li>
              <li>{t("observe.falling")}</li>
              <li>{t("observe.area")}</li>
            </ul>
          </LessonPanel>
        </div>
      </div>
    </LessonShell>
  );
}

function inputSignal(tau: number): number {
  return Math.abs(tau) <= RECT_HALF_WIDTH ? 1 : 0;
}

function kernelSignal(tau: number): number {
  return tau >= 0 ? Math.exp(-tau) : 0;
}

function exactOutput(time: number): number {
  if (time < -RECT_HALF_WIDTH) return 0;
  if (time <= RECT_HALF_WIDTH) return 1 - Math.exp(-(time + RECT_HALF_WIDTH));
  return Math.exp(-(time - RECT_HALF_WIDTH)) - Math.exp(-(time + RECT_HALF_WIDTH));
}

function buildShiftedSeries(time: number) {
  const input: PlotPoint[] = [];
  const kernel: PlotPoint[] = [];
  const product: PlotPoint[] = [];
  for (let index = 0; index <= SAMPLE_COUNT; index += 1) {
    const tau = TAU_MIN + ((TAU_MAX - TAU_MIN) * index) / SAMPLE_COUNT;
    const x = inputSignal(tau);
    const h = kernelSignal(time - tau);
    input.push([tau, x]);
    kernel.push([tau, h]);
    product.push([tau, x * h]);
  }
  return { input, kernel, product };
}

function buildOutputSeries(): PlotPoint[] {
  const points: PlotPoint[] = [];
  for (let index = 0; index <= 400; index += 1) {
    const time = T_MIN + ((T_MAX - T_MIN) * index) / 400;
    points.push([time, exactOutput(time)]);
  }
  return points;
}

function trapezoid(points: readonly PlotPoint[]): number {
  let area = 0;
  for (let index = 1; index < points.length; index += 1) {
    const left = points[index - 1];
    const right = points[index];
    area += ((left[1] + right[1]) / 2) * (right[0] - left[0]);
  }
  return area;
}

function resolveOverlap(time: number): string {
  const lower = -RECT_HALF_WIDTH;
  const upper = Math.min(RECT_HALF_WIDTH, time);
  if (upper <= lower) return "∅";
  return `[${lower.toFixed(1)}, ${upper.toFixed(2)}]`;
}
