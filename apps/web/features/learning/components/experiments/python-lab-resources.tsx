"use client";

import { Code2, Copy, Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PYTHON_LAB_ROOT, PYTHON_LAB_STARTERS, PYTHON_LABS } from "@/features/learning/model/python-labs";
import { writeClipboardText } from "@/shared/lib/clipboard";

function ResourceLinks({ stem }: { stem: string }) {
  const t = useTranslations("learning.virtualLab.python");
  return <div className="flex flex-wrap gap-2">
    <Button asChild size="sm" variant="outline"><a href={`${PYTHON_LAB_ROOT}/${stem}.ipynb`} download><Download aria-hidden className="size-4" />{t("notebook")}</a></Button>
    <Button asChild size="sm" variant="outline"><a href={`${PYTHON_LAB_ROOT}/${stem}.py`} download><Download aria-hidden className="size-4" />{t("script")}</a></Button>
  </div>;
}

export function PythonLabResources({ taskID }: { taskID?: string }) {
  const t = useTranslations("learning.virtualLab.python");
  const [copyStatus, setCopyStatus] = useState<{ taskID: string; failed: boolean } | null>(null);
  const lab = PYTHON_LABS.find((item) => item.id === taskID?.slice(0, 2));
  const starter = taskID ? PYTHON_LAB_STARTERS[taskID] : undefined;
  const actions = <div className="flex flex-wrap gap-2">
    <Button asChild size="sm"><a href={`${PYTHON_LAB_ROOT}/coursemate-signal-python.zip`} download><Download aria-hidden className="size-4" />{t("bundle")}</a></Button>
    <Button asChild size="sm" variant="outline"><a href={`${PYTHON_LAB_ROOT}/README.md`} download>{t("instructions")}</a></Button>
  </div>;
  if (taskID && lab && starter) return <details data-python-task={taskID} className="min-w-0 rounded-lg border border-border/60 bg-card p-4 sm:p-5">
    <summary className="cursor-pointer font-display text-lg font-normal">{t("taskTitle", { task: taskID })}</summary>
    <div className="mt-5 space-y-5 text-sm leading-7">
      <p>{t(`tasks.${taskID}`)}</p>
      <ol className="list-decimal space-y-2 pl-5"><li>{t("taskSetup")}</li><li>{t("taskCompare")}</li><li>{t("taskEvidence")}</li></ol>
      <ResourceLinks stem={lab.stem} />
      <div className="min-w-0 rounded-lg border border-border/60">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-4 py-2">
          <h3 className="font-medium">{t("starter")}</h3>
          <Button size="sm" variant="ghost" onClick={async () => {
            try { await writeClipboardText(starter); setCopyStatus({ taskID, failed: false }); }
            catch { setCopyStatus({ taskID, failed: true }); }
          }}><Copy aria-hidden className="size-4" />{t("copy")}</Button>
        </div>
        <pre role="region" aria-label={t("starter")} className="overflow-x-auto p-4 font-mono text-sm leading-6"><code>{starter}</code></pre>
      </div>
      {copyStatus?.taskID === taskID && <p role={copyStatus.failed ? "alert" : "status"}>{t(copyStatus.failed ? "copyFailed" : "copied")}</p>}
      {actions}
    </div>
  </details>;
  return <section data-python-resources className="min-w-0 rounded-lg border border-border/60 bg-card p-5 sm:p-6">
    <h2 className="flex items-center gap-3 font-display text-2xl font-normal"><Code2 aria-hidden className="size-5" />{t("title")}</h2>
    <ol className="mt-5 divide-y divide-border/60">{PYTHON_LABS.map((item, index) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
      <div className="flex items-center gap-3"><span className="font-mono text-sm text-muted-foreground">0{index + 1}</span><h3 className="font-display text-lg font-normal">{t(`labs.${item.id}`)}</h3></div>
      <ResourceLinks stem={item.stem} />
    </li>)}</ol>
    <div className="mt-4">{actions}</div>
    <details className="mt-5 border-t border-border/60 pt-5 text-sm leading-7">
      <summary className="cursor-pointer font-medium">{t("howToRun")}</summary>
      <ol className="mt-3 list-decimal space-y-3 pl-5"><li>{t("local")}</li><li>{t("online")}</li><li>{t("submission")}</li></ol>
    </details>
  </section>;
}
