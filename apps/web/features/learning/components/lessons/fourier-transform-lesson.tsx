"use client";

import { useTranslations } from "next-intl";
import * as React from "react";

import { LabSlider } from "@/features/learning/components/shared/lab-slider";
import { LessonPanel, LessonShell, Readout } from "@/features/learning/components/shared/lesson-shell";
import { SignalPlot, type PlotPoint } from "@/features/learning/components/shared/signal-plot";

const TIME_MIN = -3;
const TIME_MAX = 3;
const FREQ_MIN = -4;
const FREQ_MAX = 4;
const SAMPLES = 900;

export function FourierTransformLesson() {
  const t = useTranslations("learningLabs.fourierTransform");
  const [width, setWidth] = React.useState(1);
  const [amplitude, setAmplitude] = React.useState(1);

  const pulse = React.useMemo(() => buildPulse(width, amplitude), [amplitude, width]);
  const spectrum = React.useMemo(() => buildSpectrum(width, amplitude), [amplitude, width]);
  const firstZero = 1 / width;
  const dcValue = amplitude * width;

  return (
    <LessonShell title={t("title")} subtitle={t("subtitle")} formula={t("formula")}>
      <div className="space-y-3">
        <LessonPanel title={t("controls.title")} description={t("controls.description")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <LabSlider
              label={t("controls.width")}
              value={width}
              min={0.5}
              max={3}
              step={0.05}
              onChange={setWidth}
              format={(value) => `τ = ${value.toFixed(2)} s`}
              hint={t("controls.widthHint")}
            />
            <LabSlider
              label={t("controls.amplitude")}
              value={amplitude}
              min={0.5}
              max={2}
              step={0.1}
              onChange={setAmplitude}
              format={(value) => `A = ${value.toFixed(1)}`}
              hint={t("controls.amplitudeHint")}
            />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Readout label={t("readouts.width")} value={`${width.toFixed(2)} s`} />
            <Readout label={t("readouts.dc")} value={dcValue.toFixed(2)} hint={t("readouts.dcHint")} />
            <Readout label={t("readouts.firstZero")} value={`${firstZero.toFixed(2)} Hz`} hint={t("readouts.firstZeroHint")} />
            <Readout label={t("readouts.area")} value={`${dcValue.toFixed(2)}`} hint={t("readouts.areaHint")} />
          </div>
        </LessonPanel>

        <LessonPanel title={t("plot.timeTitle")} description={t("plot.timeDescription")}>
          <SignalPlot
            xDomain={[TIME_MIN, TIME_MAX]}
            yDomain={[-0.2, amplitude * 1.3]}
            xLabel={t("plot.timeAxis")}
            yLabel="x(t)"
            series={[{ id: "pulse", label: t("plot.pulse"), points: pulse, color: "var(--chart-1)", fill: true }]}
            xTicks={[-3, -2, -1, 0, 1, 2, 3]}
            legend={false}
          />
        </LessonPanel>

        <LessonPanel title={t("plot.spectrumTitle")} description={t("plot.spectrumDescription")}>
          <SignalPlot
            xDomain={[FREQ_MIN, FREQ_MAX]}
            yDomain={[0, Math.max(0.1, dcValue * 1.15)]}
            xLabel={t("plot.freqAxis")}
            yLabel="|X(jω)|"
            series={[{ id: "spectrum", label: t("plot.spectrum"), points: spectrum, color: "var(--chart-3)" }]}
            verticalMarkers={[
              { x: -firstZero, color: "var(--chart-2)" },
              { x: firstZero, color: "var(--chart-2)", label: t("plot.firstZeroLabel") },
            ]}
            xTicks={[-4, -3, -2, -1, 0, 1, 2, 3, 4]}
            legend={false}
          />
        </LessonPanel>

        <div className="grid gap-3 md:grid-cols-2">
          <LessonPanel title={t("insight.title")}>
            <ul className="space-y-2 text-xs leading-5 text-muted-foreground">
              <li>{t("insight.duality")}</li>
              <li>{t("insight.scaling")}</li>
              <li>{t("insight.zeros")}</li>
              <li>{t("insight.uncertainty")}</li>
            </ul>
          </LessonPanel>
          <LessonPanel title={t("experiment.title")}>
            <ol className="space-y-2 text-xs leading-5 text-muted-foreground">
              <li>1. {t("experiment.narrow")}</li>
              <li>2. {t("experiment.predict")}</li>
              <li>3. {t("experiment.connect")}</li>
            </ol>
          </LessonPanel>
        </div>
      </div>
    </LessonShell>
  );
}

function buildPulse(width: number, amplitude: number): PlotPoint[] {
  const half = width / 2;
  return [
    [TIME_MIN, 0],
    [-half, 0],
    [-half, amplitude],
    [half, amplitude],
    [half, 0],
    [TIME_MAX, 0],
  ];
}

function buildSpectrum(width: number, amplitude: number): PlotPoint[] {
  const points: PlotPoint[] = [];
  for (let index = 0; index <= SAMPLES; index += 1) {
    const frequency = FREQ_MIN + ((FREQ_MAX - FREQ_MIN) * index) / SAMPLES;
    const value = amplitude * width * sinc(frequency * width);
    points.push([frequency, Math.abs(value)]);
  }
  return points;
}

function sinc(value: number): number {
  if (Math.abs(value) < 1e-9) return 1;
  return Math.sin(Math.PI * value) / (Math.PI * value);
}
