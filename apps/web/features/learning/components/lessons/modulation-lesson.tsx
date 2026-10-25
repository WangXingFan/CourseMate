"use client";

import { useTranslations } from "next-intl";
import * as React from "react";

import { LabSlider } from "@/features/learning/components/shared/lab-slider";
import { LessonPanel, LessonShell, Readout } from "@/features/learning/components/shared/lesson-shell";
import { SignalPlot, type PlotPoint, type PlotSeries } from "@/features/learning/components/shared/signal-plot";

const SAMPLES = 1200;

export function ModulationLesson() {
  const t = useTranslations("learningLabs.modulation");
  const [messageFrequency, setMessageFrequency] = React.useState(1);
  const [carrierFrequency, setCarrierFrequency] = React.useState(8);
  const [modulationIndex, setModulationIndex] = React.useState(0.8);

  const timeMax = 2 / messageFrequency;
  const signal = React.useMemo(
    () => buildSignal(messageFrequency, carrierFrequency, modulationIndex, timeMax),
    [carrierFrequency, messageFrequency, modulationIndex, timeMax],
  );
  const envelopes = React.useMemo(
    () => buildEnvelopes(messageFrequency, modulationIndex, timeMax),
    [messageFrequency, modulationIndex, timeMax],
  );
  const spectrum = React.useMemo(
    () => buildSpectrum(carrierFrequency, messageFrequency, modulationIndex),
    [carrierFrequency, messageFrequency, modulationIndex],
  );
  const overmodulated = modulationIndex > 1;

  return (
    <LessonShell title={t("title")} subtitle={t("subtitle")} formula={t.raw("formula")}>
      <div className="space-y-3">
        <LessonPanel title={t("controls.title")} description={t("controls.description")}>
          <div className="grid gap-4 sm:grid-cols-3">
            <LabSlider
              label={t("controls.message")}
              value={messageFrequency}
              min={0.5}
              max={2}
              step={0.1}
              onChange={setMessageFrequency}
              format={(value) => `${value.toFixed(1)} Hz`}
              hint={t("controls.messageHint")}
            />
            <LabSlider
              label={t("controls.carrier")}
              value={carrierFrequency}
              min={5}
              max={15}
              step={0.5}
              onChange={setCarrierFrequency}
              format={(value) => `${value.toFixed(1)} Hz`}
              hint={t("controls.carrierHint")}
            />
            <LabSlider
              label={t("controls.index")}
              value={modulationIndex}
              min={0}
              max={1.4}
              step={0.05}
              onChange={setModulationIndex}
              format={(value) => `m = ${value.toFixed(2)}`}
              hint={t("controls.indexHint")}
            />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Readout label={t("readouts.bandwidth")} value={`${(2 * messageFrequency).toFixed(1)} Hz`} hint={t("readouts.bandwidthHint")} />
            <Readout label={t("readouts.sidebands")} value={`${(carrierFrequency - messageFrequency).toFixed(1)} / ${(carrierFrequency + messageFrequency).toFixed(1)} Hz`} />
            <Readout
              label={t("readouts.status")}
              value={overmodulated ? t("readouts.overmodulated") : t("readouts.normal")}
              hint={overmodulated ? t("readouts.overmodulatedHint") : t("readouts.normalHint")}
            />
            <Readout label={t("readouts.powerSplit")} value={`${(100 / (2 + modulationIndex * modulationIndex)).toFixed(0)}%`} hint={t("readouts.powerSplitHint")} />
          </div>
        </LessonPanel>

        <LessonPanel title={t("plot.timeTitle")} description={t("plot.timeDescription")}>
          <SignalPlot
            xDomain={[0, timeMax]}
            yDomain={[-(1 + modulationIndex) * 1.1, (1 + modulationIndex) * 1.1]}
            xLabel={t("plot.timeAxis")}
            yLabel="x(t)"
            series={[
              ...envelopes,
              { id: "am", label: t("plot.signal"), points: signal, color: "var(--chart-1)", width: 1.4 },
            ]}
            xTicks={[0, timeMax / 4, timeMax / 2, (3 * timeMax) / 4, timeMax]}
          />
        </LessonPanel>

        <LessonPanel title={t("plot.spectrumTitle")} description={t("plot.spectrumDescription")}>
          <SignalPlot
            xDomain={[0, carrierFrequency + messageFrequency + 2]}
            yDomain={[0, 1.2]}
            xLabel={t("plot.freqAxis")}
            yLabel={t("plot.amplitudeAxis")}
            series={spectrum.series}
            markers={spectrum.markers}
            xTicks={[
              Math.max(0, carrierFrequency - messageFrequency),
              carrierFrequency,
              carrierFrequency + messageFrequency,
            ]}
            yTicks={[0, 0.5, 1]}
            legend={false}
          />
        </LessonPanel>

        <div className="grid gap-3 md:grid-cols-2">
          <LessonPanel title={t("insight.title")}>
            <ul className="space-y-2 text-xs leading-5 text-muted-foreground">
              <li>{t("insight.shift")}</li>
              <li>{t("insight.sidebands")}</li>
              <li>{t("insight.bandwidth")}</li>
              <li>{t("insight.overmodulation")}</li>
            </ul>
          </LessonPanel>
          <LessonPanel title={t("experiment.title")}>
            <ol className="space-y-2 text-xs leading-5 text-muted-foreground">
              <li>1. {t("experiment.zero")}</li>
              <li>2. {t("experiment.increase")}</li>
              <li>3. {t("experiment.observe")}</li>
            </ol>
          </LessonPanel>
        </div>
      </div>
    </LessonShell>
  );
}

function buildSignal(
  messageFrequency: number,
  carrierFrequency: number,
  modulationIndex: number,
  timeMax: number,
): PlotPoint[] {
  const points: PlotPoint[] = [];
  for (let index = 0; index <= SAMPLES; index += 1) {
    const time = (timeMax * index) / SAMPLES;
    const envelope = 1 + modulationIndex * Math.cos(2 * Math.PI * messageFrequency * time);
    points.push([time, envelope * Math.cos(2 * Math.PI * carrierFrequency * time)]);
  }
  return points;
}

function buildEnvelopes(messageFrequency: number, modulationIndex: number, timeMax: number): PlotSeries[] {
  const upper: PlotPoint[] = [];
  const lower: PlotPoint[] = [];
  for (let index = 0; index <= SAMPLES; index += 1) {
    const time = (timeMax * index) / SAMPLES;
    const envelope = 1 + modulationIndex * Math.cos(2 * Math.PI * messageFrequency * time);
    upper.push([time, envelope]);
    lower.push([time, -envelope]);
  }
  return [
    { id: "upper", label: "1 + m cos(2πf_m t)", points: upper, color: "var(--chart-3)", dashed: true, width: 1.3 },
    { id: "lower", points: lower, color: "var(--chart-3)", dashed: true, width: 1.3 },
  ];
}

function buildSpectrum(
  carrierFrequency: number,
  messageFrequency: number,
  modulationIndex: number,
): { series: PlotSeries[]; markers: { x: number; y: number; color: string }[] } {
  const lines = [
    { frequency: carrierFrequency - messageFrequency, amplitude: modulationIndex / 2 },
    { frequency: carrierFrequency, amplitude: 1 },
    { frequency: carrierFrequency + messageFrequency, amplitude: modulationIndex / 2 },
  ];
  return {
    series: lines.map((line, index) => ({
      id: `line-${index}`,
      points: [
        [line.frequency, 0],
        [line.frequency, line.amplitude],
      ],
      color: index === 1 ? "var(--chart-1)" : "var(--chart-2)",
      width: 1.6,
    })),
    markers: lines.map((line, index) => ({
      x: line.frequency,
      y: line.amplitude,
      color: index === 1 ? "var(--chart-1)" : "var(--chart-2)",
    })),
  };
}
