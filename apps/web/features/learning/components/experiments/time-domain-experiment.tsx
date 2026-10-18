"use client";

import { RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LessonPanel, LessonShell, Readout } from "@/features/learning/components/shared/lesson-shell";
import { PredictionCard, type PredictionResult } from "@/features/learning/components/shared/prediction-card";
import { RevealGate } from "@/features/learning/components/shared/reveal-gate";
import { SignalPlot, type PlotPoint } from "@/features/learning/components/shared/signal-plot";
import { useLearningLabSeed } from "@/features/learning/hooks/use-learning-lab-seed";
import { createRng, hashText, randomChoice, randomRange } from "@/features/learning/model/lab-random";

type Scenario = {
  tau: number;
  gain: number;
  multiple: number;
  answerId: string;
  value: number;
};

export function TimeDomainExperiment() {
  const t = useTranslations("learningLabs.experiments.timeDomain");
  const common = useTranslations("learningLabs.common");
  const { seed, nextSeed } = useLearningLabSeed();
  const [selected, setSelected] = React.useState<string | null>(null);
  const [reason, setReason] = React.useState("");
  const [result, setResult] = React.useState<PredictionResult>(null);
  const [revealed, setRevealed] = React.useState(false);

  const scenario = seed ? buildScenario(seed) : null;
  const timeMax = scenario ? Math.max(5 * scenario.tau, (scenario.multiple + 1) * scenario.tau) : 1;

  React.useEffect(() => {
    setSelected(null);
    setReason("");
    setResult(null);
    setRevealed(false);
  }, [seed]);

  const options = [
    { id: "63", label: "63.2%" },
    { id: "86", label: "86.5%" },
    { id: "95", label: "95.0%" },
    { id: "99", label: "99.3%" },
  ];

  function handleSubmit() {
    if (!scenario || !selected || !seed) return;
    const correct = selected === scenario.answerId;
    setResult({ correct, code: correct ? `TIME-${hashText(`${seed}:${scenario.answerId}`)}` : "" });
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
              ? t("scenario", {
                  gain: scenario.gain.toFixed(1),
                  tau: scenario.tau.toFixed(2),
                  k: scenario.multiple,
                })
              : "…"}
          </p>
        </LessonPanel>

        <PredictionCard
          question={scenario ? t("question", { k: scenario.multiple }) : t("questionFallback")}
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

        <LessonPanel title={t("plot.title")} description={t("plot.description")}>
          <RevealGate revealed={revealed} label={common("hidden")}>
            {scenario ? (
              <SignalPlot
                xDomain={[0, timeMax]}
                yDomain={[0, scenario.gain * 1.2]}
                xLabel={t("plot.timeAxis")}
                yLabel="y(t)"
                series={[
                  {
                    id: "final",
                    label: t("plot.finalValue"),
                    points: [
                      [0, scenario.gain],
                      [timeMax, scenario.gain],
                    ],
                    color: "var(--chart-3)",
                    dashed: true,
                    width: 1.4,
                  },
                  {
                    id: "response",
                    label: t("plot.response"),
                    points: buildResponse(scenario, timeMax),
                    color: "var(--chart-1)",
                  },
                ]}
                verticalMarkers={[
                  {
                    x: scenario.multiple * scenario.tau,
                    color: "var(--chart-2)",
                    label: `${scenario.multiple}τ`,
                  },
                ]}
                markers={[
                  {
                    x: scenario.multiple * scenario.tau,
                    y: scenario.value,
                    color: "var(--chart-2)",
                  },
                ]}
              />
            ) : null}
          </RevealGate>
          {revealed && scenario ? (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Readout label={t("readouts.gain")} value={scenario.gain.toFixed(1)} />
              <Readout label={t("readouts.tau")} value={`${scenario.tau.toFixed(2)} s`} />
              <Readout
                label={t("readouts.valueAt", { k: scenario.multiple })}
                value={scenario.value.toFixed(3)}
                hint={t("readouts.valueAtHint")}
              />
              <Readout label={t("readouts.settling")} value={`${(5 * scenario.tau).toFixed(2)} s`} />
            </div>
          ) : null}
        </LessonPanel>

        <LessonPanel title={t("insight.title")}>
          <ul className="space-y-2 text-xs leading-5 text-muted-foreground">
            <li>{t("insight.tau")}</li>
            <li>{t("insight.multiples")}</li>
            <li>{t("insight.gain")}</li>
          </ul>
        </LessonPanel>
      </div>
    </LessonShell>
  );
}

function buildScenario(seed: string): Scenario {
  const rng = createRng(seed);
  const tau = randomRange(rng, 0.4, 1.8, 0.1);
  const gain = randomRange(rng, 1, 3, 0.1);
  const multiple = randomChoice(rng, [1, 2, 3, 5]);
  const answerId = multiple === 1 ? "63" : multiple === 2 ? "86" : multiple === 3 ? "95" : "99";
  return {
    tau,
    gain,
    multiple,
    answerId,
    value: gain * (1 - Math.exp(-multiple)),
  };
}

function buildResponse(scenario: Scenario, timeMax: number): PlotPoint[] {
  const points: PlotPoint[] = [];
  const samples = 900;
  for (let index = 0; index <= samples; index += 1) {
    const time = (timeMax * index) / samples;
    points.push([time, scenario.gain * (1 - Math.exp(-time / scenario.tau))]);
  }
  return points;
}
