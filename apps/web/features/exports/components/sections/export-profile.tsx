"use client";

import { Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { EXPORT_PROFILE_FIELDS, type useExportProfile } from "@/features/exports/hooks/use-export-profile";

export function ExportProfile({ model: m, disabled }: { model: ReturnType<typeof useExportProfile>; disabled: boolean }) {
  const t = useTranslations("classrooms.exports.profile");
  return <section aria-labelledby="export-profile" className="border-t border-border pt-6">
    <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); void m.save(); }}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 id="export-profile" className="font-display text-2xl font-normal">{t("title")}</h2>
        <Button type="submit" variant="outline" disabled={disabled || m.loading || m.saving || !m.complete || !m.dirty}>
          {m.saving ? <Spinner className="size-4" /> : <Save aria-hidden className="size-4" strokeWidth={1.6} />}
          {t(m.saving ? "saving" : "save")}
        </Button>
      </div>
      <fieldset disabled={disabled || m.loading || m.saving || !m.draft} className="grid min-w-0 gap-5 sm:grid-cols-3">
        {EXPORT_PROFILE_FIELDS.map(({ key, maxLength }) => <label key={key} className="grid min-w-0 gap-2 text-sm">
          <span>{t(key)}</span>
          <Input required maxLength={maxLength} value={m.draft?.[key] ?? ""} onChange={(event) => m.update(key, event.target.value)} />
        </label>)}
      </fieldset>
      {m.error ? <div className="flex flex-wrap items-center gap-3">
        <p role="alert" className="text-sm text-destructive">{m.error}</p>
        {!m.draft && <Button type="button" variant="outline" disabled={disabled || m.loading} onClick={m.reload}>{t("retry")}</Button>}
      </div> : <p role="status" className="text-sm text-muted-foreground">{t(m.loading ? "loading" : m.saving ? "saving" : !m.complete ? "incomplete" : m.dirty ? "unsaved" : "saved")}</p>}
    </form>
  </section>;
}
