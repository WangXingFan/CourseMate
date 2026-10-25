"use client";

import { useTranslations } from "next-intl";
import * as React from "react";

import { LabSlider } from "@/features/learning/components/shared/lab-slider";
import { LessonPanel, LessonShell, Readout } from "@/features/learning/components/shared/lesson-shell";
import { PoleZeroPlot } from "@/features/learning/components/shared/pole-zero-plot";
import { SignalPlot, type PlotPoint } from "@/features/learning/components/shared/signal-plot";

const SAMPLES = 900;

export function LaplaceLesson() {
  const t = useTranslations("learningLabs.laplace");
  const [sigma, setSigma] = React.useState(-1);
  const [omega, setOmega] = React.useState(2);

  const timeMax = sigma < 0 ? Math.min(8, Math.max(3, 4 / Math.abs(sigma))) : 4;
  const rawImpulse = React.useMemo(() => buildImpulse(sigma, omega, timeMax), [omega, sigma, timeMax]);
  const peak = rawImpulse.reduce((max, point) => Math.max(max, Math.abs(point[1])), 0);
  const limit = Math.min(8, Math.max(0.5, peak * 1.1));
  const impulse = React.useMemo(
    () => rawImpulse.map(([time, value]) => [time, Math.max(-limit, Math.min(limit, value))] as const),
    [limit, rawImpulse],
  );
  const stability = sigma < -1e-9 ? t("readouts.stable") : sigma > 1e-9 ? t("readouts.unstable") : t("readouts.marginal");
  const responseShape =
    sigma < -1e-9 ? t("readouts.decaying") : sigma > 1e-9 ? t("readouts.growing") : t("readouts.constant");
  const poleRadius = Math.hypot(sigma, omega);

  return (
    <LessonShell title={t("title")} subtitle={t("subtitle")} formula={t.raw("formula")}>
      <div className="space-y-3">
        <LessonPanel title={t("controls.title")} description={t("controls.description")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <LabSlider
              label={t("controls.sigma")}
              value={sigma}
              min={-3}
              max={1}
              step={0.1}
              onChange={setSigma}
              format={(value) => `σ = ${value.toFixed(1)}`}
              hint={t("controls.sigmaHint")}
            />
            <LabSlider
              label={t("controls.omega")}
              value={omega}
              min={0.4}
              max={4}
              step={0.1}
              onChange={setOmega}
              format={(value) => `ω = ${value.toFixed(1)} rad/s`}
              hint={t("controls.omegaHint")}
            />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Readout label={t("readouts.poles")} value={`${sigma.toFixed(1)} ± j${omega.toFixed(1)}`} />
            <Readout label={t("readouts.stability")} value={stability} hint={t("readouts.stabilityHint")} />
            <Readout label={t("readouts.roc")} value={`Re(s) > ${sigma.toFixed(1)}`} />
            <Readout
              label={t("readouts.oscillation")}
              value={`${(omega / (2 * Math.PI)).toFixed(2)} Hz`}
              hint={t("readouts.oscillationHint")}
            />
          </div>
        </LessonPanel>

        <div className="grid gap-3 lg:grid-cols-2">
          <LessonPanel title={t("plot.pzTitle")} description={t("plot.pzDescription")}>
            <PoleZeroPlot
              poles={[
                { re: sigma, im: omega, label: "×" },
                { re: sigma, im: -omega },
              ]}
              roc={{ kind: "right", boundary: sigma, label: `ROC: Re(s) > ${sigma.toFixed(1)}` }}
              xDomain={[-4, 2]}
              yDomain={[-4, 4]}
              height={360}
            />
          </LessonPanel>
          <LessonPanel
            title={t("plot.impulseTitle")}
            description={peak > limit ? t("plot.clipped", { peak: peak.toFixed(1) }) : t("plot.impulseDescription")}
          >
            <SignalPlot
              xDomain={[0, timeMax]}
              yDomain={[-limit, limit]}
              xLabel={t("plot.timeAxis")}
              yLabel="h(t)"
              series={[{ id: "impulse", label: t("plot.impulse"), points: impulse, color: "var(--chart-1)" }]}
              height={360}
              legend={false}
            />
          </LessonPanel>
        </div>

        <LessonPanel title={t("readouts.decayTitle")} description={t("readouts.decayDescription")}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Readout label={t("readouts.poleRadius")} value={poleRadius.toFixed(2)} />
            <Readout
              label={t("readouts.decayTime")}
              value={sigma < 0 ? `${(1 / Math.abs(sigma)).toFixed(2)} s` : "∞"}
              hint={t("readouts.decayTimeHint")}
            />
            <Readout label={t("readouts.rocAxis")} value={sigma < 0 ? t("readouts.includesAxis") : t("readouts.excludesAxis")} />
            <Readout label={t("readouts.responseType")} value={responseShape} />
          </div>
        </LessonPanel>

        <div className="grid gap-3 md:grid-cols-2">
          <LessonPanel title={t("insight.title")}>
            <ul className="space-y-2 text-xs leading-5 text-muted-foreground">
              <li>{t("insight.left")}</li>
              <li>{t("insight.axis")}</li>
              <li>{t("insight.right")}</li>
              <li>{t("insight.roc")}</li>
            </ul>
          </LessonPanel>
          <LessonPanel title={t("experiment.title")}>
            <ol className="space-y-2 text-xs leading-5 text-muted-foreground">
              <li>1. {t("experiment.cross")}</li>
              <li>2. {t("experiment.omega")}</li>
              <li>3. {t("experiment.roc")}</li>
            </ol>
          </LessonPanel>
        </div>
      </div>
    </LessonShell>
  );
}

function buildImpulse(sigma: number, omega: number, timeMax: number): PlotPoint[] {
  const radius = Math.hypot(sigma, omega);
  const scale = (radius * radius) / omega;
  const points: PlotPoint[] = [];
  for (let index = 0; index <= SAMPLES; index += 1) {
    const time = (timeMax * index) / SAMPLES;
    points.push([time, scale * Math.exp(sigma * time) * Math.sin(omega * time)]);
  }
  return points;
}
