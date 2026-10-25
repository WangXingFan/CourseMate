"use client";

import { useTranslations } from "next-intl";
import * as React from "react";

import { LabSlider } from "@/features/learning/components/shared/lab-slider";
import { LessonPanel, LessonShell, Readout } from "@/features/learning/components/shared/lesson-shell";
import { SignalPlot, type PlotPoint, type PlotSeries } from "@/features/learning/components/shared/signal-plot";

const TIME_MIN = -1.5;
const TIME_MAX = 1.5;
const TIME_SAMPLES = 1200;

export function FourierSeriesLesson() {
  const t = useTranslations("learning.fourierSeries");
  const [harmonics, setHarmonics] = React.useState(7);

  const waveform = React.useMemo(() => buildWaveform(harmonics), [harmonics]);
  const ideal = React.useMemo(() => buildIdeal(), []);
  const spectrum = React.useMemo(() => buildSpectrum(harmonics), [harmonics]);
  const peak = React.useMemo(() => waveform.reduce((max, point) => Math.max(max, point[1]), 0), [waveform]);
  const overshoot = Math.max(0, (peak - 1) * 100);

  return (
    <LessonShell title={t("title")} subtitle={t("subtitle")} formula={t.raw("formula")}>
      <div className="space-y-3">
        <LessonPanel title={t("controls.title")} description={t("controls.description")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <LabSlider
              label={t("controls.harmonics")}
              value={harmonics}
              min={1}
              max={31}
              step={2}
              onChange={setHarmonics}
              format={(value) => `${value}`}
              hint={t("controls.harmonicsHint")}
            />
            <div className="grid grid-cols-3 gap-2">
              <Readout label={t("readouts.harmonics")} value={harmonics} />
              <Readout label={t("readouts.peak")} value={peak.toFixed(3)} hint={t("readouts.peakHint")} />
              <Readout label={t("readouts.overshoot")} value={`${overshoot.toFixed(1)}%`} hint={t("readouts.overshootHint")} />
            </div>
          </div>
        </LessonPanel>

        <LessonPanel title={t("plot.timeTitle")} description={t("plot.timeDescription")}>
          <SignalPlot
            xDomain={[TIME_MIN, TIME_MAX]}
            yDomain={[-1.45, 1.45]}
            xLabel="t"
            yLabel="x(t)"
            series={[
              { id: "ideal", label: t("plot.ideal"), points: ideal, color: "var(--chart-2)", dashed: true, width: 1.5 },
              { id: "partial", label: t("plot.partial", { count: harmonics }), points: waveform, color: "var(--chart-1)" },
            ]}
            xTicks={[-1.5, -1, -0.5, 0, 0.5, 1, 1.5]}
            yTicks={[-1, 0, 1]}
          />
        </LessonPanel>

        <LessonPanel title={t("plot.spectrumTitle")} description={t("plot.spectrumDescription")}>
          <SignalPlot
            xDomain={[0, 33]}
            yDomain={[0, 1.35]}
            xLabel={t("plot.harmonicAxis")}
            yLabel={t("plot.amplitudeAxis")}
            series={spectrum}
            markers={spectrum.map((item) => ({ x: item.points[1][0], y: item.points[1][1], color: "var(--chart-2)" }))}
            xTicks={[1, 5, 9, 13, 17, 21, 25, 29, 33]}
            yTicks={[0, 0.5, 1]}
            legend={false}
          />
        </LessonPanel>

        <div className="grid gap-3 md:grid-cols-2">
          <LessonPanel title={t("insight.title")}>
            <ul className="space-y-2 text-xs leading-5 text-muted-foreground">
              <li>{t("insight.odd")}</li>
              <li>{t("insight.decay")}</li>
              <li>{t("insight.gibbs")}</li>
              <li>{t("insight.convergence")}</li>
            </ul>
          </LessonPanel>
          <LessonPanel title={t("experiment.title")}>
            <ol className="space-y-2 text-xs leading-5 text-muted-foreground">
              <li>1. {t("experiment.step")}</li>
              <li>2. {t("experiment.observe")}</li>
              <li>3. {t("experiment.spectrum")}</li>
            </ol>
          </LessonPanel>
        </div>
      </div>
    </LessonShell>
  );
}

function partialSum(time: number, harmonics: number): number {
  let sum = 0;
  for (let harmonic = 1; harmonic <= harmonics; harmonic += 2) {
    sum += Math.sin(2 * Math.PI * harmonic * time) / harmonic;
  }
  return (4 / Math.PI) * sum;
}

function buildWaveform(harmonics: number): PlotPoint[] {
  const points: PlotPoint[] = [];
  for (let index = 0; index <= TIME_SAMPLES; index += 1) {
    const time = TIME_MIN + ((TIME_MAX - TIME_MIN) * index) / TIME_SAMPLES;
    points.push([time, partialSum(time, harmonics)]);
  }
  return points;
}

function buildIdeal(): PlotPoint[] {
  const points: PlotPoint[] = [];
  for (let index = 0; index <= TIME_SAMPLES; index += 1) {
    const time = TIME_MIN + ((TIME_MAX - TIME_MIN) * index) / TIME_SAMPLES;
    const phase = time - Math.floor(time + 0.5);
    points.push([time, phase >= 0 ? 1 : -1]);
  }
  return points;
}

function buildSpectrum(harmonics: number): PlotSeries[] {
  const series: PlotSeries[] = [];
  for (let harmonic = 1; harmonic <= harmonics; harmonic += 2) {
    series.push({
      id: `harmonic-${harmonic}`,
      points: [
        [harmonic, 0],
        [harmonic, 4 / (Math.PI * harmonic)],
      ],
      color: "var(--chart-2)",
      width: 2,
    });
  }
  return series;
}
