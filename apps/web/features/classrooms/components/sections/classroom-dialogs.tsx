"use client";

import { useTranslations } from "next-intl";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeightTransition,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner, SpinnerLabel } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type { ClassroomDraft } from "@/features/classrooms/types/classrooms";
import type { ClassroomDTO } from "@/shared/api/classroom-types";

export function ClassroomEditorDialog({
  draft,
  saving,
  onDraftChange,
  onClose,
  onSave,
}: {
  draft: ClassroomDraft | null;
  saving: boolean;
  onDraftChange: (draft: ClassroomDraft) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const t = useTranslations("classrooms");

  return (
    <Dialog open={draft !== null} onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent aria-describedby={undefined} className="w-[calc(100vw-2rem)] gap-0 overflow-hidden p-0 sm:max-w-[520px]">
        <DialogHeightTransition contentClassName="max-h-[min(86vh,720px)]">
          <DialogHeader className="shrink-0 px-4 py-4">
            <DialogTitle>{draft?.id ? t("editor.editTitle") : t("editor.createTitle")}</DialogTitle>
          </DialogHeader>
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={(event) => {
              event.preventDefault();
              onSave();
            }}
          >
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-2">
              <div className="space-y-1">
                <label className="text-xs font-normal text-muted-foreground" htmlFor="classroom-name">
                  {t("editor.name")}
                </label>
                <Input
                  id="classroom-name"
                  autoFocus
                  maxLength={80}
                  value={draft?.name ?? ""}
                  placeholder={t("editor.namePlaceholder")}
                  disabled={saving}
                  required
                  onChange={(event) => draft && onDraftChange({ ...draft, name: event.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-normal text-muted-foreground" htmlFor="classroom-description">
                  {t("editor.descriptionLabel")}
                </label>
                <Textarea
                  id="classroom-description"
                  maxLength={255}
                  className="min-h-20 resize-none"
                  value={draft?.description ?? ""}
                  placeholder={t("editor.descriptionPlaceholder")}
                  disabled={saving}
                  onChange={(event) => draft && onDraftChange({ ...draft, description: event.target.value })}
                />
              </div>
            </div>
            <DialogFooter className="shrink-0 px-4 py-3">
              <Button type="button" variant="ghost" disabled={saving} onClick={onClose}>
                {t("editor.cancel")}
              </Button>
              <Button type="submit" disabled={!draft?.name.trim() || saving}>
                {saving ? <SpinnerLabel>{t("editor.saving")}</SpinnerLabel> : t("editor.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogHeightTransition>
      </DialogContent>
    </Dialog>
  );
}

export function AddClassroomStudentDialog({
  open,
  username,
  adding,
  onUsernameChange,
  onClose,
  onConfirm,
}: {
  open: boolean;
  username: string;
  adding: boolean;
  onUsernameChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const t = useTranslations("classrooms");

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && !adding && onClose()}>
      <DialogContent aria-describedby={undefined} className="w-[calc(100vw-2rem)] gap-0 overflow-hidden p-0 sm:max-w-[460px]">
        <DialogHeightTransition contentClassName="max-h-[min(86vh,560px)]">
          <DialogHeader className="shrink-0 px-4 py-4">
            <DialogTitle>{t("addStudentDialog.title")}</DialogTitle>
          </DialogHeader>
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={(event) => {
              event.preventDefault();
              onConfirm();
            }}
          >
            <div className="space-y-1 px-4 py-2">
              <label className="text-xs font-normal text-muted-foreground" htmlFor="classroom-student-username">
                {t("addStudentDialog.username")}
              </label>
              <Input
                id="classroom-student-username"
                autoFocus
                autoComplete="off"
                value={username}
                placeholder={t("addStudentDialog.usernamePlaceholder")}
                disabled={adding}
                required
                onChange={(event) => onUsernameChange(event.target.value)}
              />
            </div>
            <DialogFooter className="shrink-0 px-4 py-3">
              <Button type="button" variant="ghost" disabled={adding} onClick={onClose}>
                {t("addStudentDialog.cancel")}
              </Button>
              <Button type="submit" disabled={!username.trim() || adding}>
                {adding ? <SpinnerLabel>{t("addStudentDialog.adding")}</SpinnerLabel> : t("addStudentDialog.confirm")}
              </Button>
            </DialogFooter>
          </form>
        </DialogHeightTransition>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteClassroomDialog({
  target,
  deleting,
  onClose,
  onConfirm,
}: {
  target: ClassroomDTO | null;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const t = useTranslations("classrooms");

  return (
    <AlertDialog open={target !== null} onOpenChange={(open) => !open && !deleting && onClose()}>
      <AlertDialogContent size="compact">
        <AlertDialogHeader>
          <AlertDialogTitle>{t("deleteDialog.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("deleteDialog.description", { name: target?.name ?? "" })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>{t("deleteDialog.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleting}
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
          >
            {deleting ? <Spinner className="size-3.5" /> : null}
            {t("deleteDialog.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
