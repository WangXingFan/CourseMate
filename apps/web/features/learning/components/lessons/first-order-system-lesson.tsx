"use client";

import { useTranslations } from "next-intl";
import * as React from "react";

import { LabSlider } from "@/features/learning/components/shared/lab-slider";
import { LessonPanel, LessonShell, Readout } from "@/features/learning/components/shared/lesson-shell";
import { SignalPlot, type PlotMarker, type PlotPoint } from "@/features/learning/components/shared/signal-plot";

const RESPONSE_SAMPLES = 500;

export function FirstOrderSystemLesson() {
  const t = useTranslations("learning.firstOrder");
  const [gain, setGain] = React.useState(1);
  const [timeConstant, setTimeConstant] = React.useState(1);

  const timeMax = Math.max(4, 5 * timeConstant);
  const response = React.useMemo(() => buildResponse(gain, timeConstant, timeMax), [gain, timeConstant, timeMax]);
  const finalValue = gain;
  const cutoff = 1 / (2 * Math.PI * timeConstant);
  const markers = React.useMemo(
    () => buildMarkers(gain, timeConstant, timeMax),
    [gain, timeConstant, timeMax],
  );

  return (
    <LessonShell title={t("title")} subtitle={t("subtitle")} formula={t.raw("formula")}>
      <div className="space-y-3">
        <LessonPanel title={t("controls.title")} description={t("controls.description")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <LabSlider
              label={t("controls.gain")}
              value={gain}
              min={0.5}
              max={2}
              step={0.1}
              onChange={setGain}
              format={(value) => `K = ${value.toFixed(1)}`}
              hint={t("controls.gainHint")}
            />
            <LabSlider
              label={t("controls.timeConstant")}
              value={timeConstant}
              min={0.2}
              max={2}
              step={0.05}
              onChange={setTimeConstant}
              format={(value) => `τ = ${value.toFixed(2)} s`}
              hint={t("controls.timeConstantHint")}
            />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Readout label={t("readouts.atTau")} value={`${(0.632 * gain).toFixed(3)}`} hint={t("readouts.atTauHint")} />
            <Readout label={t("readouts.atTwoTau")} value={`${(0.865 * gain).toFixed(3)}`} />
            <Readout label={t("readouts.settling")} value={`${(5 * timeConstant).toFixed(2)} s`} hint={t("readouts.settlingHint")} />
            <Readout label={t("readouts.cutoff")} value={`${cutoff.toFixed(2)} Hz`} hint={t("readouts.cutoffHint")} />
          </div>
        </LessonPanel>

        <LessonPanel title={t("plot.title")} description={t("plot.description", { value: gain.toFixed(1) })}>
          <SignalPlot
            xDomain={[0, timeMax]}
            yDomain={[0, Math.max(1.1, gain * 1.25)]}
            xLabel={t("plot.timeAxis")}
            yLabel="y(t)"
            series={[
              {
                id: "final",
                label: t("plot.finalValue"),
                points: [
                  [0, finalValue],
                  [timeMax, finalValue],
                ],
                color: "var(--chart-3)",
                dashed: true,
                width: 1.5,
              },
              { id: "step", label: t("plot.response"), points: response, color: "var(--chart-1)" },
            ]}
            markers={markers}
            verticalMarkers={[{ x: timeConstant, color: "var(--chart-2)", label: "τ" }]}
          />
        </LessonPanel>

        <div className="grid gap-3 md:grid-cols-2">
          <LessonPanel title={t("insight.title")}>
            <ul className="space-y-2 text-xs leading-5 text-muted-foreground">
              <li>{t("insight.definition")}</li>
              <li>{t("insight.meaning")}</li>
              <li>{t("insight.bandwidth")}</li>
              <li>{t("insight.gain")}</li>
            </ul>
          </LessonPanel>
          <LessonPanel title={t("experiment.title")}>
            <ol className="space-y-2 text-xs leading-5 text-muted-foreground">
              <li>1. {t("experiment.changeTau")}</li>
              <li>2. {t("experiment.changeGain")}</li>
              <li>3. {t("experiment.readPoint")}</li>
              <li>4. {t("experiment.connect")}</li>
            </ol>
          </LessonPanel>
        </div>
      </div>
    </LessonShell>
  );
}

function stepResponse(time: number, gain: number, timeConstant: number): number {
  return gain * (1 - Math.exp(-time / timeConstant));
}

function buildResponse(gain: number, timeConstant: number, timeMax: number): PlotPoint[] {
  const points: PlotPoint[] = [];
  for (let index = 0; index <= RESPONSE_SAMPLES; index += 1) {
    const time = (timeMax * index) / RESPONSE_SAMPLES;
    points.push([time, stepResponse(time, gain, timeConstant)]);
  }
  return points;
}

function buildMarkers(gain: number, timeConstant: number, timeMax: number): PlotMarker[] {
  const multipliers = [1, 2, 3, 5];
  return multipliers
    .map((multiplier) => multiplier * timeConstant)
    .filter((time) => time <= timeMax)
    .map((time) => ({
      x: time,
      y: stepResponse(time, gain, timeConstant),
      color: "var(--chart-2)",
      label: `${(time / timeConstant).toFixed(0)}τ`,
    }));
}
