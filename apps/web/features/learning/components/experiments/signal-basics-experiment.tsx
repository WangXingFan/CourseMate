"use client";

import { RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LessonPanel, LessonShell, Readout } from "@/features/learning/components/shared/lesson-shell";
import { ExperimentTutor } from "@/features/learning/components/shared/experiment-tutor";
import { PredictionCard, type PredictionResult } from "@/features/learning/components/shared/prediction-card";
import { RevealGate } from "@/features/learning/components/shared/reveal-gate";
import { SignalPlot, type PlotPoint } from "@/features/learning/components/shared/signal-plot";
import { useLearningLabSeed } from "@/features/learning/hooks/use-learning-lab-seed";
import { createRng, hashText, randomRange } from "@/features/learning/model/lab-random";

type SignalKind = "energy" | "power" | "ramp";

type Scenario = {
  kind: SignalKind;
  amplitude: number;
  decay: number;
  frequency: number;
  answerId: SignalKind | "neither" | "both";
  energy: number | null;
  power: number | null;
};

export function SignalBasicsExperiment() {
  const t = useTranslations("learningLabs.experiments.signalBasics");
  const common = useTranslations("learningLabs.common");
  const { seed, nextSeed } = useLearningLabSeed();
  const [selected, setSelected] = React.useState<string | null>(null);
  const [reason, setReason] = React.useState("");
  const [result, setResult] = React.useState<PredictionResult>(null);
  const [revealed, setRevealed] = React.useState(false);

  const scenario = seed ? buildScenario(seed) : null;
  const scenarioText = scenario
    ? scenario.kind === "energy"
      ? t("scenario.energy", { a: scenario.amplitude.toFixed(2), d: scenario.decay.toFixed(2) })
      : scenario.kind === "power"
        ? t("scenario.power", { a: scenario.amplitude.toFixed(2), f: scenario.frequency.toFixed(2) })
        : t("scenario.ramp", { a: scenario.amplitude.toFixed(2) })
    : "…";

  React.useEffect(() => {
    setSelected(null);
    setReason("");
    setResult(null);
    setRevealed(false);
  }, [seed]);

  const options = [
    { id: "energy", label: t("options.energy") },
    { id: "power", label: t("options.power") },
    { id: "neither", label: t("options.neither") },
    { id: "both", label: t("options.both") },
  ];

  function handleSubmit() {
    if (!scenario || !selected || !seed) return;
    const correct = selected === scenario.answerId;
    setResult({
      correct,
      code: correct ? `SIG-${hashText(`${seed}:${scenario.answerId}`)}` : "",
    });
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
            {scenarioText}
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

        {scenario && seed ? <ExperimentTutor key={seed} seed={seed} experimentId="signal-basics" action={result ? "explain" : "hint"} parameters={{ amplitude: scenario.amplitude, decay: scenario.decay, frequency: scenario.frequency }} plotSummary={scenarioText} selected={selected} reason={reason} correct={result?.correct ?? false} /> : null}

        <LessonPanel title={t("plot.timeTitle")} description={t("plot.timeDescription")}>
          <RevealGate revealed={revealed} label={common("hidden")}>
            {scenario ? (
              <SignalPlot
                xDomain={scenario.kind === "power" ? [-2, 2] : [0, scenario.kind === "ramp" ? 3 : 6]}
                yDomain={buildYDomain(scenario)}
                xLabel={t("plot.timeAxis")}
                yLabel={t("plot.amplitude")}
                series={[
                  {
                    id: "signal",
                    label: t(`type.${scenario.kind}`),
                    points: buildSignal(scenario),
                    color: "var(--chart-1)",
                    fill: scenario.kind !== "power",
                  },
                ]}
              />
            ) : null}
          </RevealGate>
          {revealed && scenario ? (
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Readout label={t("readouts.type")} value={t(`type.${scenario.kind}`)} />
              <Readout label={t("readouts.energy")} value={scenario.energy === null ? "∞" : scenario.energy.toFixed(2)} />
              <Readout label={t("readouts.power")} value={scenario.power === null ? "∞" : scenario.power.toFixed(2)} />
            </div>
          ) : null}
        </LessonPanel>

        <LessonPanel title={t("insight.title")}>
          <ul className="space-y-2 text-xs leading-5 text-muted-foreground">
            <li>{t("insight.energy")}</li>
            <li>{t("insight.power")}</li>
            <li>{t("insight.neither")}</li>
          </ul>
        </LessonPanel>
      </div>
    </LessonShell>
  );
}

function buildScenario(seed: string): Scenario {
  const rng = createRng(seed);
  const kindRoll = rng();
  const amplitude = randomRange(rng, 1, 2.4, 0.1);
  const decay = randomRange(rng, 0.6, 1.4, 0.1);
  const frequency = randomRange(rng, 0.5, 1.5, 0.1);

  if (kindRoll < 0.4) {
    return {
      kind: "energy",
      amplitude,
      decay,
      frequency,
      answerId: "energy",
      energy: (amplitude * amplitude) / (2 * decay),
      power: 0,
    };
  }
  if (kindRoll < 0.8) {
    return {
      kind: "power",
      amplitude,
      decay,
      frequency,
      answerId: "power",
      energy: null,
      power: (amplitude * amplitude) / 2,
    };
  }
  return {
    kind: "ramp",
    amplitude,
    decay,
    frequency,
    answerId: "neither",
    energy: null,
    power: null,
  };
}

function buildSignal(scenario: Scenario): PlotPoint[] {
  const points: PlotPoint[] = [];
  const samples = 900;
  if (scenario.kind === "energy") {
    for (let index = 0; index <= samples; index += 1) {
      const time = (6 * index) / samples;
      points.push([time, scenario.amplitude * Math.exp(-scenario.decay * time)]);
    }
    return points;
  }
  if (scenario.kind === "power") {
    for (let index = 0; index <= samples; index += 1) {
      const time = -2 + (4 * index) / samples;
      points.push([time, scenario.amplitude * Math.cos(2 * Math.PI * scenario.frequency * time)]);
    }
    return points;
  }
  for (let index = 0; index <= samples; index += 1) {
    const time = (3 * index) / samples;
    points.push([time, scenario.amplitude * time]);
  }
  return points;
}

function buildYDomain(scenario: Scenario): readonly [number, number] {
  if (scenario.kind === "power") return [-scenario.amplitude * 1.2, scenario.amplitude * 1.2];
  if (scenario.kind === "ramp") return [-0.1, scenario.amplitude * 3.2];
  return [-0.1, scenario.amplitude * 1.2];
}
