"use client";

import { Code2, Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PYTHON_LAB_ROOT, PYTHON_LAB_STARTERS, PYTHON_LABS } from "@/features/learning/model/python-labs";
import type { LabPythonRun } from "@/public/vendor/signal-lab/core.mjs";
import { PythonLabRunner } from "./python-lab-runner";

const TASKS = PYTHON_LABS.flatMap((lab) => [1, 2, 3, 4].map((task) => `${lab.id}-${task}`));

export function PythonLabResources() {
  const t = useTranslations("learning.virtualLab.python");
  const [taskID, setTaskID] = useState(TASKS[0]);
  const [source, setSource] = useState(PYTHON_LAB_STARTERS[TASKS[0]]);
  const [result, setResult] = useState<LabPythonRun | null>(null);
  const selectedLab = PYTHON_LABS.find((item) => item.id === taskID.slice(0, 2)) ?? PYTHON_LABS[0];
  return <div className="h-full min-h-0 w-full overflow-y-auto bg-background" data-python-resources>
    <div className="mx-auto w-full max-w-5xl space-y-7 px-5 pt-6 pb-16 md:px-10 md:pt-10">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
        <h1 className="flex min-w-0 items-center gap-3 font-display text-2xl font-normal sm:text-3xl"><Code2 aria-hidden className="size-6 shrink-0" />{t("title")}</h1>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline"><a href={`${PYTHON_LAB_ROOT}/${selectedLab.stem}.ipynb`} download><Download aria-hidden className="size-4" />{t("notebook")}</a></Button>
          <Button asChild size="sm" variant="outline"><a href={`${PYTHON_LAB_ROOT}/${selectedLab.stem}.py`} download><Download aria-hidden className="size-4" />{t("script")}</a></Button>
          <Button asChild size="sm" variant="outline"><a href={`${PYTHON_LAB_ROOT}/coursemate-signal-python.zip`} download><Download aria-hidden className="size-4" />{t("bundle")}</a></Button>
        </div>
      </header>
      <label htmlFor="python-task" className="grid gap-2 text-sm font-medium">{t("task")}
        <select id="python-task" value={taskID} onChange={(event) => { const id = event.target.value; setTaskID(id); setSource(PYTHON_LAB_STARTERS[id]); setResult(null); }} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
          {TASKS.map((id) => <option key={id} value={id}>{id} · {t(`labs.${id.slice(0, 2)}`)}</option>)}
        </select>
      </label>
      <PythonLabRunner key={taskID} taskID={taskID} source={source} onSourceChange={setSource} starter={PYTHON_LAB_STARTERS[taskID]} params={{}} result={result} onResult={setResult} />
      <section aria-label={t("downloads")} className="flex flex-wrap gap-2 border-t border-border pt-5"><Button asChild size="sm" variant="outline"><a href={`${PYTHON_LAB_ROOT}/README.md`} download><Download aria-hidden className="size-4" />{t("instructions")}</a></Button></section>
    </div>
  </div>;
}
