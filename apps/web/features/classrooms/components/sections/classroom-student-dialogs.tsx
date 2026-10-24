"use client";

import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SpinnerLabel } from "@/components/ui/spinner";
import type { StudentCredentialDTO, StudentImportResultDTO } from "@/shared/api/classroom-types";

type StudentFields = { username: string; displayName: string; email: string };

export function NewClassroomStudentDialog({
  open,
  pending,
  onClose,
  onSubmit,
}: {
  open: boolean;
  pending: boolean;
  onClose: () => void;
  onSubmit: (input: StudentFields) => Promise<void>;
}) {
  const t = useTranslations("classrooms.studentAccounts");
  const [fields, setFields] = React.useState<StudentFields>({ username: "", displayName: "", email: "" });

  React.useEffect(() => {
    if (open) setFields({ username: "", displayName: "", email: "" });
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !pending && onClose()}>
      <DialogContent className="gap-0 p-0 sm:max-w-[440px]">
        <DialogHeader className="px-4 py-4">
          <DialogTitle>{t("createTitle")}</DialogTitle>
          <DialogDescription>{t("createDescription")}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3 px-4 pb-2"
          onSubmit={(event) => {
            event.preventDefault();
            void onSubmit(fields);
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="new-student-username">{t("username")}</Label>
            <Input id="new-student-username" autoComplete="off" maxLength={16} required value={fields.username}
              placeholder={t("usernamePlaceholder")} disabled={pending}
              onChange={(event) => setFields({ ...fields, username: event.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-student-name">{t("displayName")}</Label>
            <Input id="new-student-name" maxLength={128} value={fields.displayName} placeholder={t("displayNamePlaceholder")}
              disabled={pending} onChange={(event) => setFields({ ...fields, displayName: event.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-student-email">{t("email")}</Label>
            <Input id="new-student-email" type="email" maxLength={128} value={fields.email} placeholder={t("emailPlaceholder")}
              disabled={pending} onChange={(event) => setFields({ ...fields, email: event.target.value })} />
          </div>
          <DialogFooter className="pb-3 pt-2">
            <Button type="button" variant="ghost" disabled={pending} onClick={onClose}>{t("cancel")}</Button>
            <Button type="submit" disabled={!fields.username.trim() || pending}>
              {pending ? <SpinnerLabel>{t("creating")}</SpinnerLabel> : t("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const CSV_TEMPLATE = "username,displayName,email\ns20260001,张三,\ns20260002,李四,student@example.edu\n";

function downloadCSV(filename: string, csv: string) {
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function quoteCSV(value: string) {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

export function ImportClassroomStudentsDialog({
  open,
  pending,
  result,
  onClose,
  onSubmit,
}: {
  open: boolean;
  pending: boolean;
  result: StudentImportResultDTO | null;
  onClose: () => void;
  onSubmit: (roster: string | File) => Promise<void>;
}) {
  const t = useTranslations("classrooms.studentAccounts");
  const [csv, setCSV] = React.useState("");
  const [rosterFile, setRosterFile] = React.useState<File | null>(null);
  const [readError, setReadError] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setCSV("");
      setRosterFile(null);
      setReadError("");
    }
  }, [open]);

  function selectFile(file: File | undefined) {
    if (!file) return;
    setRosterFile(null);
    if (!/\.(xlsx|csv)$/i.test(file.name)) {
      setReadError(t("unsupportedFile"));
      return;
    }
    if (file.size > 1_048_576) {
      setReadError(t("fileTooLarge"));
      return;
    }
    setReadError("");
    setCSV("");
    setRosterFile(file);
  }

  function exportCredentials() {
    if (!result?.credentials.length) return;
    const rows = ["username,displayName,initialPassword", ...result.credentials.map((item) =>
      [item.username, item.displayName, item.initialPassword].map(quoteCSV).join(","),
    )];
    downloadCSV("student-accounts-initial-passwords.csv", rows.join("\n"));
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !pending && onClose()}>
      <DialogContent className="gap-0 p-0 sm:max-w-[560px]">
        <DialogHeader className="px-4 py-4">
          <DialogTitle>{t("importTitle")}</DialogTitle>
          <DialogDescription>{t("importDescription")}</DialogDescription>
        </DialogHeader>
        {result ? (
          <div className="space-y-3 px-4 pb-4">
            <p role="status" className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs leading-5">
              {t("importResult", { total: result.total, created: result.created, skipped: result.skipped, failed: result.failed })}
            </p>
            <div className="max-h-52 overflow-y-auto rounded-md border border-border/60">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-muted/80 text-muted-foreground">
                  <tr><th className="px-3 py-2">{t("row")}</th><th className="px-3 py-2">{t("username")}</th><th className="px-3 py-2">{t("statusLabel")}</th></tr>
                </thead>
                <tbody>{result.rows.map((row) => (
                  <tr key={`${row.line}-${row.username}`} className="border-t border-border/40">
                    <td className="px-3 py-1.5 tabular-nums text-muted-foreground">{row.line}</td>
                    <td className="px-3 py-1.5">{row.username || "—"}</td>
                    <td className="px-3 py-1.5">{t(`status.${row.status}`)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] leading-5 text-muted-foreground">{t("passwordNote")}</p>
              {result.credentials.length > 0 && (
                <Button type="button" size="sm" className="shrink-0" onClick={exportCredentials}>
                  <Download className="size-3.5" />{t("downloadCredentials", { count: result.credentials.length })}
                </Button>
              )}
            </div>
            <DialogFooter><Button type="button" variant="ghost" onClick={onClose}>{t("close")}</Button></DialogFooter>
          </div>
        ) : (
          <form className="space-y-3 px-4 pb-4"
            onSubmit={(event) => { event.preventDefault(); if (rosterFile || csv.trim()) void onSubmit(rosterFile ?? csv); }}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button type="button" variant="outline" size="sm"
                onClick={() => downloadCSV("student-roster-template.csv", CSV_TEMPLATE)}>
                <Download className="size-3.5" />{t("downloadTemplate")}
              </Button>
              <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                <span className="sr-only">{t("chooseFile")}</span>
                <input type="file" accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" disabled={pending} className="max-w-52 text-xs file:mr-2 file:rounded-md file:border-0 file:bg-muted file:px-2 file:py-1 file:text-xs"
                  onChange={(event) => { selectFile(event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} />
              </label>
            </div>
            {rosterFile && <div className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2">
              <p className="min-w-0 break-all text-xs text-muted-foreground">{rosterFile.name}</p>
              <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => setRosterFile(null)}>{t("removeFile")}</Button>
            </div>}
            {readError && <p role="alert" className="text-xs text-destructive">{readError}</p>}
            {!rosterFile && <div className="space-y-1">
              <Label htmlFor="student-roster-csv">{t("csvLabel")}</Label>
              <Textarea id="student-roster-csv" required disabled={pending} value={csv} maxLength={2_000_000}
                className="min-h-40 resize-y font-mono text-[11px]" placeholder={t("csvPlaceholder")}
                onChange={(event) => { setCSV(event.target.value); setReadError(""); }} />
            </div>}
            <p className="text-[11px] leading-5 text-muted-foreground">{t("passwordNote")}</p>
            <DialogFooter>
              <Button type="button" variant="ghost" disabled={pending} onClick={onClose}>{t("cancel")}</Button>
              <Button type="submit" disabled={(!rosterFile && !csv.trim()) || pending || !!readError}>
                {pending ? <SpinnerLabel>{t("importing")}</SpinnerLabel> : t("import")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function ClassroomStudentCredentialsDialog({
  credentials,
  result,
  onClose,
}: {
  credentials: StudentCredentialDTO[];
  result: StudentImportResultDTO | null;
  onClose: () => void;
}) {
  const t = useTranslations("classrooms.studentAccounts");
  return (
    <Dialog open={credentials.length > 0 || result !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="gap-0 p-0 sm:max-w-[520px]">
        <DialogHeader className="px-4 py-4">
          <DialogTitle>{t("credentialsTitle")}</DialogTitle>
          <DialogDescription>{t("credentialsDescription")}</DialogDescription>
        </DialogHeader>
        {result && (
          <div className="space-y-2 px-4 pb-3">
            <p role="status" className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs leading-5">
              {t("importResult", { total: result.total, created: result.created, skipped: result.skipped, failed: result.failed })}
            </p>
            <div className="max-h-36 overflow-y-auto rounded-md border border-border/60">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-muted/80 text-muted-foreground"><tr>
                  <th className="px-3 py-2">{t("row")}</th><th className="px-3 py-2">{t("username")}</th><th className="px-3 py-2">{t("statusLabel")}</th>
                </tr></thead>
                <tbody>{result.rows.map((row) => <tr key={`${row.line}-${row.username}`} className="border-t border-border/40">
                  <td className="px-3 py-1.5 tabular-nums text-muted-foreground">{row.line}</td>
                  <td className="px-3 py-1.5">{row.username || "—"}</td>
                  <td className="px-3 py-1.5">{t(`status.${row.status}`)}</td>
                </tr>)}</tbody>
              </table>
            </div>
          </div>
        )}
        <div className="max-h-[55vh] overflow-auto px-4 pb-3">
          {credentials.length > 0 ? <div className="overflow-x-auto rounded-md border border-border/60">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/70 text-muted-foreground"><tr>
                <th className="px-3 py-2">{t("username")}</th><th className="px-3 py-2">{t("displayName")}</th><th className="px-3 py-2">{t("initialPassword")}</th>
              </tr></thead>
              <tbody>{credentials.map((item) => <tr key={item.username} className="border-t border-border/40">
                <td className="px-3 py-2 font-mono">{item.username}</td><td className="px-3 py-2">{item.displayName}</td><td className="px-3 py-2 font-mono">{item.initialPassword}</td>
              </tr>)}</tbody>
            </table>
          </div> : result && <p className="py-3 text-xs text-muted-foreground">{t("noNewCredentials")}</p>}
        </div>
        <DialogFooter className="px-4 pb-4">
          {credentials.length > 0 && <Button type="button" variant="outline" onClick={() => downloadCSV(
            "student-accounts-initial-passwords.csv",
            ["username,displayName,initialPassword", ...credentials.map((item) =>
              [item.username, item.displayName, item.initialPassword].map(quoteCSV).join(","),
            )].join("\n"),
          )}><Download className="size-3.5" />{t("downloadCredentials", { count: credentials.length })}</Button>}
          <Button type="button" onClick={onClose}>{t("close")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
