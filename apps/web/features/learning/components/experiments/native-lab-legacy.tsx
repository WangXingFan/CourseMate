"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { createVirtualLabEngine as createFirstEngine } from "@/public/vendor/signal-lab/legacy-v1.mjs";
import { createVirtualLabEngine as createSecondEngine } from "@/public/vendor/signal-lab/legacy-v1.1.mjs";
import type { LabDocument, LabTaskRecord, VirtualLabEngine } from "@/public/vendor/signal-lab/core.mjs";
import { labMeasurementText, labParameterText } from "@/features/learning/model/virtual-lab-native";
import { NativeLabPlot } from "./native-lab-plot";

function LegacyFigures({ engine, id, figures, report }: { engine: VirtualLabEngine; id: string; figures: LabTaskRecord["figures"]; report: boolean }) {
  const t = useTranslations("learning.virtualLab.native");
  const [opened, setOpened] = useState(false);
  if (!figures.length) return null;
  return <details open={report || undefined} onToggle={(event) => setOpened(event.currentTarget.open)}><summary className="cursor-pointer text-sm">{t("measurements")}</summary>{(report || opened) && figures.map((figure, index) => <div key={`${figure.time}-${index}`} className="space-y-3 py-4"><h4>{t("trialNumber", { number: index + 1 })} · {new Date(figure.time).toLocaleString()}</h4><p className="text-sm">{labParameterText(engine, id, figure.params)}</p>{engine.scene(id, figure.params, figure.answers).plots.map((plot) => <NativeLabPlot key={plot.key} engine={engine} taskID={id} plot={plot} />)}</div>)}</details>;
}

function Archive({ archive, courseID, report }: { archive: LabDocument["legacyArchive"]; courseID: string; report: boolean }) {
  const t = useTranslations("learning.virtualLab.native");
  const [opened, setOpened] = useState(false);
  const legacy = useMemo(() => {
    if (!archive) return null;
    const previous = archive.appVersion === "1.1.0" ? createSecondEngine() : createFirstEngine();
    Object.assign(previous.records.data.tasks, archive.tasks);
    return previous;
  }, [archive]);
  if (!legacy || !archive) return null;
  return <details open={report || undefined} onToggle={(event) => setOpened(event.currentTarget.open)} className="space-y-4 border-t border-border pt-4" data-legacy-lab>
    <summary className="cursor-pointer text-sm">{t("legacyRecords")} · v{archive.appVersion}</summary>
    {(report || opened) && Object.entries(archive.tasks).filter(([id]) => id.startsWith(`${courseID}-`)).map(([id, record]) => <section key={id} className="space-y-4 border-t border-border py-4">
      <h2 className="font-display text-xl">{id} {legacy.tasks[id].title}</h2>
      <p className="text-sm leading-7">{labParameterText(legacy, id, record.params)}</p>
      <p className="break-words font-mono text-sm">{Object.entries(record.answers).map(([key, value]) => `${key}=${value || "—"}`).join("；")}</p>
      <h3>{t("prediction")}</h3><p className="whitespace-pre-wrap text-sm leading-7">{record.prediction || "—"}</p>
      {record.predictionDraft !== (record.revisions.at(-1)?.text ?? record.prediction) && <><h3>{t("draft")}</h3><p className="whitespace-pre-wrap text-sm leading-7">{record.predictionDraft}</p></>}
      {record.revisions.map((revision, index) => <div key={`${revision.time}-${index}`}><h4>{t("revision", { number: index + 1 })} · {new Date(revision.time).toLocaleString()}</h4><p className="whitespace-pre-wrap text-sm leading-7">{revision.text}</p></div>)}
      <h3>{t("derivation")}</h3><p className="whitespace-pre-wrap text-sm leading-7">{record.derivation || "—"}</p>
      <h3>{t("analysis")}</h3><p className="whitespace-pre-wrap text-sm leading-7">{record.analysis || "—"}</p>
      {record.trials.map((trial, index) => <div key={`${trial.time}-${index}`} className="space-y-2 border-t border-border py-3 text-sm leading-6" data-legacy-trial><h4>{t("trialNumber", { number: index + 1 })} · {new Date(trial.time).toLocaleString()}</h4><p>{labParameterText(legacy, id, trial.params)}</p><p className="break-words font-mono">{Object.entries(trial.answers).map(([key, value]) => `${key}=${value || "—"}`).join("；")}</p><p className="break-words font-mono">{labMeasurementText(trial.measurements)}</p></div>)}
      <p className="text-sm">{record.completion.confirmed ? t("confirmed") : t("notConfirmed")}</p>
      <LegacyFigures engine={legacy} id={id} figures={record.figures} report={report} />
    </section>)}
  </details>;
}

export function NativeLabLegacy({ engine, courseID, report = false }: { engine: VirtualLabEngine; courseID: string; report?: boolean }) {
  return <><Archive archive={engine.records.data.legacyArchive} courseID={courseID} report={report} /><Archive archive={engine.records.data.phaseTwoArchive} courseID={courseID} report={report} /></>;
}
