"use client";

import { Code2, Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { buildPythonLabStarter, PYTHON_LAB_ROOT, PYTHON_LABS } from "@/features/learning/model/python-labs";
import type { VirtualLabEngine } from "@/public/vendor/signal-lab/core.mjs";
import { PythonLabRunner } from "./python-lab-runner";

export function NativeLabPython({ engine, taskID }: { engine: VirtualLabEngine; taskID: string }) {
  const t = useTranslations("learning.virtualLab.python");
  const f = useTranslations("learning.virtualLab.flow");
  const [opened, setOpened] = useState(false);
  const record = engine.records.data.tasks[taskID];
  const lab = PYTHON_LABS.find((item) => item.id === taskID.slice(0, 2));
  const starter = buildPythonLabStarter(taskID, record.params);
  const saveCode = (code: string) => {
    if (record !== engine.records.data.tasks[taskID]) return;
    record.python.code = code;
    engine.records.save();
  };
  return <details className="min-w-0" data-python-task={taskID} onToggle={(event) => {
    if (event.currentTarget.open && !opened) {
      if (!record.python.code && !record.python.result) saveCode(starter);
      setOpened(true);
    }
  }}>
    <summary className="cursor-pointer text-sm"><Code2 aria-hidden className="mr-2 inline size-4" />{f("python")}</summary>
    {opened && <div className="mt-5 space-y-5">
      <p className="text-sm leading-7">{f(`tasks.${taskID}.${taskID === "L1-1" && record.params.mode === "impulse" ? "pythonExercisePulse" : "pythonExercise"}`)}</p>
      <PythonLabRunner taskID={taskID} source={record.python.code} onSourceChange={saveCode} starter={starter} params={record.params} result={record.python.result} engine={engine} onResult={(result) => {
        if (record !== engine.records.data.tasks[taskID]) return;
        record.python.result = result;
        engine.records.save();
      }} />
      {lab && <div className="flex flex-wrap gap-2 border-t border-border pt-4"><Button asChild size="sm" variant="outline"><a href={`${PYTHON_LAB_ROOT}/${lab.stem}.py`} download><Download aria-hidden className="size-4" />{t("script")}</a></Button><Button asChild size="sm" variant="outline"><a href={`${PYTHON_LAB_ROOT}/${lab.stem}.ipynb`} download><Download aria-hidden className="size-4" />{t("notebook")}</a></Button></div>}
    </div>}
  </details>;
}
