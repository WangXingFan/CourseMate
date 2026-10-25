"use client";

import { useTranslations } from "next-intl";
import * as React from "react";

import { LabSlider } from "@/features/learning/components/shared/lab-slider";
import { LessonPanel, LessonShell, Readout } from "@/features/learning/components/shared/lesson-shell";
import { SignalPlot, type PlotPoint } from "@/features/learning/components/shared/signal-plot";

const SAMPLES = 1000;

export function SecondOrderLesson() {
  const t = useTranslations("learningLabs.secondOrder");
  const [zeta, setZeta] = React.useState(0.3);
  const [naturalFrequency, setNaturalFrequency] = React.useState(2);

  const timeMax = Math.min(20, Math.max(6, 6 / (zeta * naturalFrequency)));
  const response = React.useMemo(
    () => buildResponse(zeta, naturalFrequency, timeMax),
    [naturalFrequency, timeMax, zeta],
  );
  const peak = response.reduce((max, point) => Math.max(max, point[1]), 0);
  const overshoot = zeta < 1 ? Math.exp((-Math.PI * zeta) / Math.sqrt(1 - zeta * zeta)) * 100 : 0;
  const dampedFrequency = naturalFrequency * Math.sqrt(Math.max(0, 1 - zeta * zeta));
  const peakTime = zeta < 1 ? Math.PI / dampedFrequency : Number.POSITIVE_INFINITY;
  const dominantRate =
    zeta < 1 ? zeta * naturalFrequency : Math.abs(-zeta * naturalFrequency + naturalFrequency * Math.sqrt(zeta * zeta - 1));
  const settlingTime = dominantRate > 0 ? 4 / dominantRate : Number.POSITIVE_INFINITY;

  return (
    <LessonShell title={t("title")} formula={t.raw("formula")}>
      <div className="space-y-3">
        <LessonPanel title={t("controls.title")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <LabSlider
              label={t("controls.zeta")}
              value={zeta}
              min={0.1}
              max={2}
              step={0.05}
              onChange={setZeta}
              format={(value) => `ζ = ${value.toFixed(2)}`}
            />
            <LabSlider
              label={t("controls.naturalFrequency")}
              value={naturalFrequency}
              min={0.5}
              max={4}
              step={0.1}
              onChange={setNaturalFrequency}
              format={(value) => `ωn = ${value.toFixed(1)} rad/s`}
            />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Readout label={t("readouts.overshoot")} value={`${overshoot.toFixed(1)}%`} />
            <Readout
              label={t("readouts.peakTime")}
              value={Number.isFinite(peakTime) ? `${peakTime.toFixed(2)} s` : "—"}
            />
            <Readout label={t("readouts.settling")} value={`${settlingTime.toFixed(2)} s`} />
            <Readout
              label={t("readouts.dampedFrequency")}
              value={zeta < 1 ? `${dampedFrequency.toFixed(2)} rad/s` : "—"}
            />
          </div>
        </LessonPanel>

        <LessonPanel title={t("plot.title")}>
          <SignalPlot
            xDomain={[0, timeMax]}
            yDomain={[0, Math.max(1.4, peak * 1.15)]}
            xLabel={t("plot.timeAxis")}
            yLabel="y(t)"
            series={[
              {
                id: "final",
                label: t("plot.finalValue"),
                points: [
                  [0, 1],
                  [timeMax, 1],
                ],
                color: "var(--chart-3)",
                dashed: true,
                width: 1.5,
              },
              { id: "step", label: t("plot.response"), points: response, color: "var(--chart-1)" },
            ]}
            verticalMarkers={Number.isFinite(peakTime) ? [{ x: peakTime, color: "var(--chart-2)", label: t("plot.peak") }] : []}
            markers={Number.isFinite(peakTime) ? [{ x: peakTime, y: peak, color: "var(--chart-2)" }] : []}
          />
        </LessonPanel>

        <div className="grid gap-3 md:grid-cols-2">
          <LessonPanel title={t("insight.title")}>
            <ul className="space-y-2 text-xs leading-5 text-muted-foreground">
              <li>{t("insight.under")}</li>
              <li>{t("insight.critical")}</li>
              <li>{t("insight.over")}</li>
              <li>{t("insight.natural")}</li>
            </ul>
          </LessonPanel>
          <LessonPanel title={t("experiment.title")}>
            <ol className="space-y-2 text-xs leading-5 text-muted-foreground">
              <li>1. {t("experiment.fixed")}</li>
              <li>2. {t("experiment.cross")}</li>
              <li>3. {t("experiment.compare")}</li>
            </ol>
          </LessonPanel>
        </div>
      </div>
    </LessonShell>
  );
}

function stepResponse(time: number, zeta: number, naturalFrequency: number): number {
  if (zeta < 1) {
    const damped = naturalFrequency * Math.sqrt(1 - zeta * zeta);
    return (
      1 -
      Math.exp(-zeta * naturalFrequency * time) *
        (Math.cos(damped * time) + (zeta / Math.sqrt(1 - zeta * zeta)) * Math.sin(damped * time))
    );
  }
  if (Math.abs(zeta - 1) < 1e-6) {
    return 1 - Math.exp(-naturalFrequency * time) * (1 + naturalFrequency * time);
  }
  const root = naturalFrequency * Math.sqrt(zeta * zeta - 1);
  const p1 = -zeta * naturalFrequency + root;
  const p2 = -zeta * naturalFrequency - root;
  return 1 + (p2 * Math.exp(p1 * time) - p1 * Math.exp(p2 * time)) / (p1 - p2);
}

function buildResponse(zeta: number, naturalFrequency: number, timeMax: number): PlotPoint[] {
  const points: PlotPoint[] = [];
  for (let index = 0; index <= SAMPLES; index += 1) {
    const time = (timeMax * index) / SAMPLES;
    points.push([time, stepResponse(time, zeta, naturalFrequency)]);
  }
  return points;
}
