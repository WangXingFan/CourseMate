"use client";

import { useTranslations } from "next-intl";
import * as React from "react";

import { LabSlider } from "@/features/learning/components/shared/lab-slider";
import { LessonPanel, LessonShell, Readout } from "@/features/learning/components/shared/lesson-shell";
import { SignalPlot, type PlotMarker, type PlotPoint } from "@/features/learning/components/shared/signal-plot";

const TIME_MAX = 1.2;
const CONTINUOUS_SAMPLES = 720;

export function SamplingLesson() {
  const t = useTranslations("learning.sampling");
  const [signalFrequency, setSignalFrequency] = React.useState(5);
  const [samplingFrequency, setSamplingFrequency] = React.useState(8);

  const nyquist = 2 * signalFrequency;
  const aliased = samplingFrequency < nyquist;
  const aliasFrequency = resolveAliasFrequency(signalFrequency, samplingFrequency);
  const continuous = React.useMemo(() => buildContinuous(signalFrequency), [signalFrequency]);
  const samples = React.useMemo(
    () => buildSamples(signalFrequency, samplingFrequency),
    [samplingFrequency, signalFrequency],
  );
  const alias = React.useMemo(
    () => (aliased ? buildContinuous(aliasFrequency) : []),
    [aliased, aliasFrequency],
  );

  return (
    <LessonShell title={t("title")} subtitle={t("subtitle")} formula={t.raw("formula")}>
      <div className="space-y-3">
        <LessonPanel title={t("controls.title")} description={t("controls.description")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <LabSlider
              label={t("controls.signalFrequency")}
              value={signalFrequency}
              min={1}
              max={10}
              step={0.5}
              onChange={setSignalFrequency}
              format={(value) => `${value.toFixed(1)} Hz`}
              hint={t("controls.signalHint")}
            />
            <LabSlider
              label={t("controls.samplingFrequency")}
              value={samplingFrequency}
              min={2}
              max={24}
              step={0.5}
              onChange={setSamplingFrequency}
              format={(value) => `${value.toFixed(1)} Hz`}
              hint={t("controls.samplingHint")}
            />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Readout label={t("readouts.nyquist")} value={`${nyquist.toFixed(1)} Hz`} />
            <Readout label={t("readouts.samplesPerPeriod")} value={(samplingFrequency / signalFrequency).toFixed(2)} />
            <Readout
              label={t("readouts.status")}
              value={aliased ? t("readouts.aliased") : t("readouts.safe")}
              hint={aliased ? t("readouts.aliasedHint") : t("readouts.safeHint")}
            />
            <Readout
              label={t("readouts.alias")}
              value={aliased ? `${aliasFrequency.toFixed(2)} Hz` : "—"}
              hint={aliased ? t("readouts.aliasHint") : undefined}
            />
          </div>
        </LessonPanel>

        <LessonPanel title={t("plot.title")} description={t("plot.description")}>
          <SignalPlot
            xDomain={[0, TIME_MAX]}
            yDomain={[-1.25, 1.25]}
            xLabel={t("plot.timeAxis")}
            yLabel={t("plot.amplitude")}
            series={[
              { id: "continuous", label: t("plot.continuous"), points: continuous, color: "var(--chart-1)" },
              ...(alias.length > 0
                ? [{ id: "alias", label: t("plot.alias"), points: alias, color: "var(--chart-3)", dashed: true }]
                : []),
            ]}
            markers={samples}
            xTicks={[0, 0.2, 0.4, 0.6, 0.8, 1, 1.2]}
            yTicks={[-1, -0.5, 0, 0.5, 1]}
          />
        </LessonPanel>

        <div className="grid gap-3 md:grid-cols-2">
          <LessonPanel title={t("theory.title")}>
            <ul className="space-y-2 text-xs leading-5 text-muted-foreground">
              <li>{t("theory.nyquist")}</li>
              <li>{t("theory.overlap")}</li>
              <li>{t("theory.edge")}</li>
            </ul>
          </LessonPanel>
          <LessonPanel title={t("experiment.title")}>
            <ol className="space-y-2 text-xs leading-5 text-muted-foreground">
              <li>1. {t("experiment.lowRate")}</li>
              <li>2. {t("experiment.increase")}</li>
              <li>3. {t("experiment.compare")}</li>
              <li>4. {t("experiment.question")}</li>
            </ol>
          </LessonPanel>
        </div>
      </div>
    </LessonShell>
  );
}

function buildContinuous(frequency: number): PlotPoint[] {
  const points: PlotPoint[] = [];
  for (let index = 0; index <= CONTINUOUS_SAMPLES; index += 1) {
    const time = (TIME_MAX * index) / CONTINUOUS_SAMPLES;
    points.push([time, Math.cos(2 * Math.PI * frequency * time)]);
  }
  return points;
}

function buildSamples(frequency: number, samplingFrequency: number): PlotMarker[] {
  const points: PlotMarker[] = [];
  const count = Math.floor(TIME_MAX * samplingFrequency);
  for (let index = 0; index <= count; index += 1) {
    const time = index / samplingFrequency;
    points.push({ x: time, y: Math.cos(2 * Math.PI * frequency * time), color: "var(--chart-2)" });
  }
  return points;
}

function resolveAliasFrequency(frequency: number, samplingFrequency: number): number {
  return Math.abs(frequency - Math.round(frequency / samplingFrequency) * samplingFrequency);
}
