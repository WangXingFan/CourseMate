"use client";

import { RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LessonPanel, LessonShell, Readout } from "@/features/learning/components/shared/lesson-shell";
import { PoleZeroPlot } from "@/features/learning/components/shared/pole-zero-plot";
import { ExperimentTutor } from "@/features/learning/components/shared/experiment-tutor";
import { PredictionCard, type PredictionResult } from "@/features/learning/components/shared/prediction-card";
import { RevealGate } from "@/features/learning/components/shared/reveal-gate";
import { SignalPlot, type PlotPoint } from "@/features/learning/components/shared/signal-plot";
import { useLearningLabSeed } from "@/features/learning/hooks/use-learning-lab-seed";
import { createRng, hashText, randomChoice, randomRange } from "@/features/learning/model/lab-random";

type Shape = "decay" | "constant" | "grow" | "monotonic";

type Scenario = {
  shape: Shape;
  sigma: number;
  omega: number;
  stability: "stable" | "marginal" | "unstable";
};

export function SDomainExperiment() {
  const t = useTranslations("learningLabs.experiments.sDomain");
  const common = useTranslations("learningLabs.common");
  const { seed, nextSeed } = useLearningLabSeed();
  const [selected, setSelected] = React.useState<string | null>(null);
  const [reason, setReason] = React.useState("");
  const [result, setResult] = React.useState<PredictionResult>(null);
  const [revealed, setRevealed] = React.useState(false);

  const scenario = seed ? buildScenario(seed) : null;
  const impulse = scenario ? buildImpulse(scenario) : [];

  React.useEffect(() => {
    setSelected(null);
    setReason("");
    setResult(null);
    setRevealed(false);
  }, [seed]);

  const options = [
    { id: "decay", label: t("options.decay") },
    { id: "constant", label: t("options.constant") },
    { id: "grow", label: t("options.grow") },
    { id: "monotonic", label: t("options.monotonic") },
  ];

  function handleSubmit() {
    if (!scenario || !selected || !seed) return;
    const correct = selected === scenario.shape;
    setResult({ correct, code: correct ? `SDOM-${hashText(`${seed}:${scenario.shape}`)}` : "" });
    setRevealed(true);
  }

  const record = scenario
    ? `${t("title")} | seed=${seed ?? ""} | answer=${selected ?? ""} | code=${result?.code ?? ""}\n${reason.trim()}`
    : "";

  return (
    <LessonShell title={t("title")} subtitle={t("subtitle")} formula={t("formula")}>
      <div className="space-y-3">
        <LessonPanel title={common("scenario")} description={t("scenarioDescription")}>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="rounded-md font-mono text-[10px] font-normal">
              {common("seed")}: {seed ?? "…"}
            </Badge>
            <Button type="button" size="xs" variant="outline" onClick={nextSeed}>
              <RefreshCw className="size-3" strokeWidth={1.8} />
              {common("newQuestion")}
            </Button>
          </div>
          <p className="mt-3 font-mono text-xs leading-6 text-foreground">
            {scenario
              ? scenario.shape === "monotonic"
                ? t("scenario.real", { sigma: scenario.sigma.toFixed(1) })
                : t("scenario.complex", {
                    sigma: scenario.sigma.toFixed(1),
                    omega: scenario.omega.toFixed(1),
                  })
              : "…"}
          </p>
        </LessonPanel>

        <PredictionCard
          question={t("question")}
          options={options}
          selected={selected}
          onSelect={(id) => {
            setSelected(id);
            setResult(null);
          }}
          reason={reason}
          onReason={(value) => {
            setReason(value);
            setResult(null);
          }}
          onSubmit={handleSubmit}
          onRetry={() => setResult(null)}
          result={result}
          record={record}
        />

        <div className="grid gap-3 lg:grid-cols-2">
          {scenario && seed ? <ExperimentTutor key={seed} seed={seed} experimentId="s-domain" action={result ? "explain" : "hint"} parameters={{ sigma: scenario.sigma, omega: scenario.omega }} plotSummary={t("scenarioDescription")} selected={selected} reason={reason} correct={result?.correct ?? false} /> : null}

        <LessonPanel title={t("plot.pzTitle")} description={t("plot.pzDescription")}>
            <RevealGate revealed={revealed} label={common("hidden")}>
              {scenario ? (
                <PoleZeroPlot
                  poles={
                    scenario.shape === "monotonic"
                      ? [
                          { re: scenario.sigma, im: 0 },
                          { re: scenario.sigma, im: 0 },
                        ]
                      : [
                          { re: scenario.sigma, im: scenario.omega },
                          { re: scenario.sigma, im: -scenario.omega },
                        ]
                  }
                  roc={{ kind: "right", boundary: scenario.sigma, label: `ROC: Re(s) > ${scenario.sigma.toFixed(1)}` }}
                  xDomain={[-4, 2]}
                  yDomain={[-4, 4]}
                  height={340}
                />
              ) : null}
            </RevealGate>
          </LessonPanel>
          <LessonPanel title={t("plot.impulseTitle")} description={t("plot.impulseDescription")}>
            <RevealGate revealed={revealed} label={common("hidden")}>
              {scenario ? (
                <SignalPlot
                  xDomain={[0, 8]}
                  yDomain={buildYDomain(impulse)}
                  xLabel={t("plot.timeAxis")}
                  yLabel="h(t)"
                  series={[{ id: "impulse", points: impulse, color: "var(--chart-1)" }]}
                  height={340}
                  legend={false}
                />
              ) : null}
            </RevealGate>
          </LessonPanel>
        </div>

        {revealed && scenario ? (
          <LessonPanel title={t("readouts.title")}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Readout
                label={t("readouts.poles")}
                value={
                  scenario.shape === "monotonic"
                    ? t("readouts.doublePole", { sigma: scenario.sigma.toFixed(1) })
                    : `${scenario.sigma.toFixed(1)} ± j${scenario.omega.toFixed(1)}`
                }
              />
              <Readout label={t("readouts.stability")} value={t(`stability.${scenario.stability}`)} />
              <Readout label={t("readouts.roc")} value={`Re(s) > ${scenario.sigma.toFixed(1)}`} />
              <Readout label={t("readouts.shape")} value={t(`options.${scenario.shape}`)} />
            </div>
          </LessonPanel>
        ) : null}

        <LessonPanel title={t("insight.title")}>
          <ul className="space-y-2 text-xs leading-5 text-muted-foreground">
            <li>{t("insight.left")}</li>
            <li>{t("insight.axis")}</li>
            <li>{t("insight.right")}</li>
            <li>{t("insight.repeat")}</li>
          </ul>
        </LessonPanel>
      </div>
    </LessonShell>
  );
}

function buildScenario(seed: string): Scenario {
  const rng = createRng(seed);
  const shape = randomChoice(rng, ["decay", "constant", "grow", "monotonic"] as const);
  if (shape === "monotonic") {
    return { shape, sigma: -randomRange(rng, 1, 3, 0.1), omega: 0, stability: "stable" };
  }
  if (shape === "constant") {
    return { shape, sigma: 0, omega: randomRange(rng, 2, 4, 0.1), stability: "marginal" };
  }
  if (shape === "grow") {
    return { shape, sigma: randomRange(rng, 0.4, 1.2, 0.1), omega: randomRange(rng, 2, 4, 0.1), stability: "unstable" };
  }
  return { shape, sigma: -randomRange(rng, 0.5, 2, 0.1), omega: randomRange(rng, 2, 4, 0.1), stability: "stable" };
}

function buildImpulse(scenario: Scenario): PlotPoint[] {
  const points: PlotPoint[] = [];
  const samples = 900;
  for (let index = 0; index <= samples; index += 1) {
    const time = (8 * index) / samples;
    let value = 0;
    if (scenario.shape === "monotonic") {
      value = 4 * time * Math.exp(scenario.sigma * time);
    } else {
      value = scenario.omega * Math.exp(scenario.sigma * time) * Math.sin(scenario.omega * time);
    }
    points.push([time, Math.max(-8, Math.min(8, value))]);
  }
  return points;
}

function buildYDomain(points: readonly PlotPoint[]): readonly [number, number] {
  const peak = points.reduce((max, point) => Math.max(max, Math.abs(point[1])), 0.5);
  const limit = Math.max(1, Math.min(8, peak * 1.1));
  return [-limit, limit];
}
