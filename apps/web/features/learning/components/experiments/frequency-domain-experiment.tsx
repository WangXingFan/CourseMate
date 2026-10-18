"use client";

import { RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LessonPanel, LessonShell, Readout } from "@/features/learning/components/shared/lesson-shell";
import { PredictionCard, type PredictionOption, type PredictionResult } from "@/features/learning/components/shared/prediction-card";
import { RevealGate } from "@/features/learning/components/shared/reveal-gate";
import { SignalPlot, type PlotPoint } from "@/features/learning/components/shared/signal-plot";
import { useLearningLabSeed } from "@/features/learning/hooks/use-learning-lab-seed";
import { createRng, hashText, randomRange } from "@/features/learning/model/lab-random";

type QuestionType = "zero" | "dc";

type Scenario = {
  width: number;
  amplitude: number;
  questionType: QuestionType;
  options: PredictionOption[];
  answerId: string;
};

export function FrequencyDomainExperiment() {
  const t = useTranslations("learningLabs.experiments.frequencyDomain");
  const common = useTranslations("learningLabs.common");
  const { seed, nextSeed } = useLearningLabSeed();
  const [selected, setSelected] = React.useState<string | null>(null);
  const [reason, setReason] = React.useState("");
  const [result, setResult] = React.useState<PredictionResult>(null);
  const [revealed, setRevealed] = React.useState(false);

  const scenario = seed ? buildScenario(seed) : null;

  React.useEffect(() => {
    setSelected(null);
    setReason("");
    setResult(null);
    setRevealed(false);
  }, [seed]);

  function handleSubmit() {
    if (!scenario || !selected || !seed) return;
    const correct = selected === scenario.answerId;
    setResult({ correct, code: correct ? `FREQ-${hashText(`${seed}:${scenario.answerId}`)}` : "" });
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
              ? t("scenario", { a: scenario.amplitude.toFixed(1), tau: scenario.width.toFixed(2) })
              : "…"}
          </p>
        </LessonPanel>

        <PredictionCard
          question={scenario?.questionType === "dc" ? t("question.dc") : t("question.zero")}
          options={scenario?.options ?? []}
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

        <LessonPanel title={t("plot.timeTitle")} description={t("plot.timeDescription")}>
          <RevealGate revealed={revealed} label={common("hidden")}>
            {scenario ? (
              <SignalPlot
                xDomain={[-3, 3]}
                yDomain={[-0.2, scenario.amplitude * 1.3]}
                xLabel={t("plot.timeAxis")}
                yLabel="x(t)"
                series={[
                  {
                    id: "pulse",
                    label: t("plot.pulse"),
                    points: buildPulse(scenario),
                    color: "var(--chart-1)",
                    fill: true,
                  },
                ]}
                xTicks={[-3, -2, -1, 0, 1, 2, 3]}
                legend={false}
              />
            ) : null}
          </RevealGate>
        </LessonPanel>

        <LessonPanel title={t("plot.spectrumTitle")} description={t("plot.spectrumDescription")}>
          <RevealGate revealed={revealed} label={common("hidden")}>
            {scenario ? (
              <SignalPlot
                xDomain={[0, 4]}
                yDomain={[0, scenario.amplitude * scenario.width * 1.15]}
                xLabel={t("plot.freqAxis")}
                yLabel="|X(f)|"
                series={[
                  {
                    id: "spectrum",
                    label: t("plot.spectrum"),
                    points: buildSpectrum(scenario),
                    color: "var(--chart-3)",
                  },
                ]}
                verticalMarkers={[{ x: 1 / scenario.width, color: "var(--chart-2)", label: t("plot.firstZero") }]}
                legend={false}
              />
            ) : null}
          </RevealGate>
          {revealed && scenario ? (
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Readout label={t("readouts.dc")} value={(scenario.amplitude * scenario.width).toFixed(2)} />
              <Readout label={t("readouts.firstZero")} value={`${(1 / scenario.width).toFixed(2)} Hz`} />
              <Readout label={t("readouts.mainLobe")} value={`${(2 / scenario.width).toFixed(2)} Hz`} />
            </div>
          ) : null}
        </LessonPanel>

        <LessonPanel title={t("insight.title")}>
          <ul className="space-y-2 text-xs leading-5 text-muted-foreground">
            <li>{t("insight.sinc")}</li>
            <li>{t("insight.inverse")}</li>
            <li>{t("insight.dc")}</li>
          </ul>
        </LessonPanel>
      </div>
    </LessonShell>
  );
}

function buildScenario(seed: string): Scenario {
  const rng = createRng(seed);
  const width = randomRange(rng, 0.4, 1.6, 0.1);
  const amplitude = randomRange(rng, 1, 2.5, 0.1);
  const questionType: QuestionType = rng() < 0.5 ? "zero" : "dc";
  const dc = amplitude * width;

  const correctLabel = questionType === "zero" ? `${(1 / width).toFixed(2)} Hz` : dc.toFixed(2);
  const wrongLabels =
    questionType === "zero"
      ? [`${(2 / width).toFixed(2)} Hz`, `${(1 / (2 * width)).toFixed(2)} Hz`, `${width.toFixed(2)} Hz`]
      : [`${(amplitude / width).toFixed(2)}`, `${(dc / 2).toFixed(2)}`, `${(2 * dc).toFixed(2)}`];

  const entries = shuffle(rng, [
    { label: correctLabel, correct: true },
    ...wrongLabels.map((label) => ({ label, correct: false })),
  ]);
  const ids = ["a", "b", "c", "d"];
  const options = entries.map((entry, index) => ({ id: ids[index], label: entry.label }));
  const correctIndex = entries.findIndex((entry) => entry.correct);

  return {
    width,
    amplitude,
    questionType,
    options,
    answerId: ids[correctIndex],
  };
}

function shuffle<T>(rng: () => number, values: readonly T[]): T[] {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

function buildPulse(scenario: Scenario): PlotPoint[] {
  const half = scenario.width / 2;
  return [
    [-3, 0],
    [-half, 0],
    [-half, scenario.amplitude],
    [half, scenario.amplitude],
    [half, 0],
    [3, 0],
  ];
}

function buildSpectrum(scenario: Scenario): PlotPoint[] {
  const points: PlotPoint[] = [];
  const samples = 900;
  for (let index = 0; index <= samples; index += 1) {
    const frequency = (4 * index) / samples;
    const value = scenario.amplitude * scenario.width * sinc(frequency * scenario.width);
    points.push([frequency, Math.abs(value)]);
  }
  return points;
}

function sinc(value: number): number {
  if (Math.abs(value) < 1e-9) return 1;
  return Math.sin(Math.PI * value) / (Math.PI * value);
}
