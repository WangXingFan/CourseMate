"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogHeightTransition,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { SpinnerLabel } from "@/components/ui/spinner";
import type {
  AdminRosterImportCredential,
  AdminRosterImportRequest,
  AdminRosterImportResult,
  AdminRosterImportRowStatus,
} from "@/features/admin/api/admin-types";

type RosterImportPhase = "select" | "previewed" | "imported";

type UserRosterImportDialogProps = {
  open: boolean;
  pending: boolean;
  result: AdminRosterImportResult | null;
  onOpenChange: (open: boolean) => void;
  onPreviewReset: () => void;
  onSubmit: (payload: AdminRosterImportRequest) => Promise<AdminRosterImportResult | null>;
};

// Header order is fixed, and template rows keep displayName inside the platform
// 3-16 character rule so a freshly downloaded file always validates.
const ROSTER_TEMPLATE =
  "username,displayName,email\ns20260001,Student01,\ns20260002,Student02,student02@example.edu\n";

const ROSTER_STATUS_TONE: Record<AdminRosterImportRowStatus, string> = {
  ready: "text-foreground",
  imported: "text-primary dark:text-primary",
  skipped_existing: "text-primary dark:text-primary",
  duplicate_in_file: "text-primary dark:text-primary",
  invalid: "text-destructive",
  conflict: "text-primary dark:text-primary",
  failed: "text-destructive",
};

// Prefix formula-leading cells so spreadsheet apps cannot execute them.
function csvCell(value: string): string {
  const text = value.trim();
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  if (/[",\n\r]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

function downloadTextFile(fileName: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function buildCredentialCsv(credentials: AdminRosterImportCredential[]): string {
  const header = ["username", "displayName", "initialPassword"].join(",");
  const rows = credentials.map((item) =>
    [csvCell(item.username), csvCell(item.displayName), csvCell(item.initialPassword)].join(","),
  );
  return `${[header, ...rows].join("\n")}\n`;
}

export function UserRosterImportDialog({
  open,
  pending,
  result,
  onOpenChange,
  onPreviewReset,
  onSubmit,
}: UserRosterImportDialogProps) {
  const t = useTranslations("adminUsers.rosterImport");
  const [file, setFile] = React.useState<File | null>(null);
  const [phase, setPhase] = React.useState<RosterImportPhase>("select");
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      return;
    }
    setFile(null);
    setPhase("select");
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, [open]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    setPhase("select");
    onPreviewReset();
  }

  async function handlePreview() {
    if (!file || pending) {
      return;
    }
    const preview = await onSubmit({ file, dryRun: true });
    if (preview) {
      setPhase("previewed");
    }
  }

  async function handleImport() {
    if (!file || pending) {
      return;
    }
    const imported = await onSubmit({ file, dryRun: false });
    if (imported) {
      setPhase("imported");
    }
  }

  const imported = phase === "imported";
  const credentials = result?.credentials ?? [];
  const issueRows = React.useMemo(
    () => (result?.rows ?? []).filter((row) => row.status !== "ready" && row.status !== "imported"),
    [result],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] gap-0 overflow-hidden p-0 sm:max-w-[600px]">
        <DialogHeightTransition contentClassName="max-h-[min(86vh,760px)]">
          <DialogHeader className="shrink-0 px-4 py-4">
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-2">
              <div className="flex items-center justify-between gap-3 rounded-md bg-muted/45 px-3 py-2">
                <div className="min-w-0 space-y-0.5">
                  <div className="text-xs font-medium text-foreground">{t("templateTitle")}</div>
                  <div className="text-xs text-muted-foreground">{t("templateDescription")}</div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-9 shrink-0 gap-1 px-2 text-sm"
                  onClick={() => downloadTextFile("student-roster-template.csv", ROSTER_TEMPLATE)}
                >
                  <Download className="size-3.5 stroke-1" />
                  {t("downloadTemplate")}
                </Button>
              </div>

              <div className="space-y-1">
                <Label htmlFor="roster-file" className="text-sm font-normal text-muted-foreground">
                  {t("fileLabel")}
                </Label>
                <input
                  id="roster-file"
                  ref={inputRef}
                  type="file"
                  accept=".csv,text/csv"
                  disabled={pending || imported}
                  onChange={handleFileChange}
                  className="block w-full cursor-pointer rounded-md border border-input bg-transparent px-3 py-2 text-xs text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-2 file:py-1 file:text-xs file:text-foreground"
                />
                {file ? <p className="text-sm text-muted-foreground">{t("selectedFile", { name: file.name })}</p> : null}
              </div>

              {result ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 rounded-md bg-muted/45 p-3 text-xs text-muted-foreground">
                    <span>{t("summary.total", { count: result.total })}</span>
                    <span>
                      {t(imported ? "summary.imported" : "summary.ready", {
                        count: imported ? result.imported : result.ready,
                      })}
                    </span>
                    <span>{t("summary.skipped", { count: result.skipped })}</span>
                    <span>{t("summary.invalid", { count: result.invalid })}</span>
                    <span>{t("summary.failed", { count: result.failed })}</span>
                  </div>

                  {issueRows.length > 0 ? (
                    <ul className="max-h-52 space-y-1 overflow-y-auto rounded-md border border-border/60 p-2">
                      {issueRows.map((row) => (
                        <li key={`${row.line}-${row.username}`} className="flex items-start gap-2 text-sm">
                          <span className="w-8 shrink-0 text-right tabular-nums text-muted-foreground">{row.line}</span>
                          <span className="min-w-0 flex-1 truncate text-foreground">{row.username || "-"}</span>
                          <span className={`shrink-0 ${ROSTER_STATUS_TONE[row.status]}`}>{t(`status.${row.status}`)}</span>
                          <span className="min-w-0 flex-1 truncate text-muted-foreground">{row.message || "-"}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {result.truncated ? (
                    <p className="text-sm text-primary dark:text-primary">{t("truncated")}</p>
                  ) : null}

                  {imported && credentials.length > 0 ? (
                    <div className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-muted/30 px-3 py-2">
                      <div className="min-w-0 space-y-0.5">
                        <div className="text-xs font-medium text-foreground">
                          {t("credentialsTitle", { count: credentials.length })}
                        </div>
                        <div className="text-xs text-muted-foreground">{t("credentialsDescription")}</div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-9 shrink-0 gap-1 px-2 text-sm"
                        onClick={() =>
                          downloadTextFile("student-initial-passwords.csv", buildCredentialCsv(credentials))
                        }
                      >
                        <Download className="size-3.5 stroke-1" />
                        {t("downloadCredentials")}
                      </Button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <DialogFooter className="shrink-0 px-4 py-3">
              <Button type="button" variant="ghost" disabled={pending} onClick={() => onOpenChange(false)}>
                {t(imported ? "done" : "cancel")}
              </Button>
              {imported ? null : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pending || !file || phase === "previewed"}
                    onClick={() => void handlePreview()}
                  >
                    {pending && phase === "select" ? <SpinnerLabel>{t("previewing")}</SpinnerLabel> : t("preview")}
                  </Button>
                  <Button
                    type="button"
                    disabled={pending || !file || phase !== "previewed"}
                    onClick={() => void handleImport()}
                  >
                    {pending && phase === "previewed" ? <SpinnerLabel>{t("importing")}</SpinnerLabel> : t("submit")}
                  </Button>
                </>
              )}
            </DialogFooter>
          </div>
        </DialogHeightTransition>
      </DialogContent>
    </Dialog>
  );
}
