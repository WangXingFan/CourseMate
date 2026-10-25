"use client";

import { ArrowLeft, BarChart3, FileUp, GraduationCap, Pencil, Trash2, UserPlus, UserRoundPlus, Users, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CenteredEmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { ClassroomActivitiesSection } from "@/features/classrooms/components/sections/classroom-activities";
import type { ClassroomDetailTab } from "@/features/classrooms/types/classrooms";
import { cn } from "@/lib/utils";
import type { ClassroomDTO, ClassroomStudentDTO } from "@/shared/api/classroom-types";

type ClassroomDetailProps = {
  accessToken: string;
  selected: ClassroomDTO | null;
  students: ClassroomStudentDTO[];
  studentsLoading: boolean;
  mobileView: "list" | "detail";
  canManage: boolean;
  removingStudentID: string;
  onBack: () => void;
  onEdit: (item: ClassroomDTO) => void;
  onDelete: (item: ClassroomDTO) => void;
  onAddStudent: () => void;
  onCreateStudent: () => void;
  onImportStudents: () => void;
  onRemoveStudent: (studentID: string) => Promise<void>;
};

export function ClassroomDetail({
  accessToken,
  selected,
  students,
  studentsLoading,
  mobileView,
  canManage,
  removingStudentID,
  onBack,
  onEdit,
  onDelete,
  onAddStudent,
  onCreateStudent,
  onImportStudents,
  onRemoveStudent,
}: ClassroomDetailProps) {
  const t = useTranslations("classrooms");
  const activitiesT = useTranslations("classrooms.activities");
  const locale = useLocale();
  const [tab, setTab] = React.useState<ClassroomDetailTab>("students");

  return (
    <section
      className={cn(
        "relative min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:flex",
        mobileView === "detail" ? "flex" : "hidden",
      )}
    >
      {selected ? (
        <>
          <header className="flex min-w-0 shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-5 md:px-8">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="-ml-1 size-8 shrink-0 rounded-md text-muted-foreground md:hidden"
                onClick={onBack}
                aria-label={t("back")}
              >
                <ArrowLeft className="size-4" strokeWidth={1.6} />
              </Button>
              <div className="hidden size-11 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary md:flex">
                <GraduationCap className="size-5" strokeWidth={1.5} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-1.5">
                  <h2 className="truncate font-display text-2xl font-normal leading-tight text-foreground">{selected.name}</h2>
                  {!canManage ? (
                    <Badge variant="outline" className="h-5 rounded-md px-1.5 text-2xs font-normal">
                      {t("readOnly")}
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {selected.description || t("studentCount", { count: selected.studentCount })}
                </p>
              </div>
            </div>
            {canManage ? (
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3"
                  onClick={() => onEdit(selected)}
                >
                  <Pencil className="size-4" strokeWidth={1.6} />
                  <span className="hidden sm:inline">{t("edit")}</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => onDelete(selected)}
                >
                  <Trash2 className="size-4" strokeWidth={1.6} />
                  <span className="hidden sm:inline">{t("delete")}</span>
                </Button>
              </div>
            ) : null}
          </header>

          <div className="flex min-w-0 shrink-0 flex-wrap items-center gap-x-6 gap-y-1 px-4 py-3 text-sm text-muted-foreground md:px-8">
            <span>{t("teacher")}: {selected.teacherName || "-"}</span>
            <span>{t("studentCount", { count: selected.studentCount })}</span>
            <span>{t("createdAt", { date: formatDate(selected.createdAt, locale) })}</span>
          </div>

          {canManage ? (
            <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border px-4 md:px-8">
              <div className="flex items-center gap-0.5">
                <TabButton active={tab === "students"} onClick={() => setTab("students")}>
                  <Users className="size-4" strokeWidth={1.6} />
                  {activitiesT("tabStudents")}
                </TabButton>
                <TabButton active={tab === "activities"} onClick={() => setTab("activities")}>
                  <BarChart3 className="size-4" strokeWidth={1.6} />
                  {activitiesT("tabActivities")}
                </TabButton>
              </div>
              {tab === "students" ? (
                <div className="flex items-center gap-1">
                  <Button type="button" variant="outline" size="sm" className="h-8 px-3" onClick={onAddStudent}>
                    <UserPlus className="size-4" strokeWidth={1.6} />
                    <span className="hidden sm:inline">{t("addStudent")}</span>
                  </Button>
                  <Button type="button" size="sm" className="h-8 px-3" onClick={onCreateStudent}>
                    <UserRoundPlus className="size-4" strokeWidth={1.6} />
                    <span className="hidden sm:inline">{t("createStudent")}</span>
                  </Button>
                  <Button type="button" variant="ghost" size="icon-sm" className="size-8" onClick={onImportStudents} aria-label={t("importStudents")} title={t("importStudents")}>
                    <FileUp className="size-4" strokeWidth={1.6} />
                  </Button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border px-4 md:px-8">
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Users className="size-4" strokeWidth={1.6} />
                {t("students")}
              </span>
            </div>
          )}

          {canManage && tab === "activities" ? (
            <ClassroomActivitiesSection accessToken={accessToken} classroomID={selected.id} />
          ) : studentsLoading && students.length === 0 ? (
            <div className="flex min-h-0 flex-1 items-center justify-center text-muted-foreground">
              <Spinner className="size-4" />
            </div>
          ) : students.length > 0 ? (
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-8">
              <div className="space-y-0.5">
                {students.map((student) => (
                  <StudentRow
                    key={student.id}
                    student={student}
                    canManage={canManage}
                    removing={removingStudentID === student.id}
                    onRemove={onRemoveStudent}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="pointer-events-none absolute inset-x-0 top-28 bottom-0">
              <CenteredEmptyState
                title={t("noStudents")}
                description={canManage ? t("noStudentsDescription") : undefined}
              />
            </div>
          )}
        </>
      ) : (
        <CenteredEmptyState title={t("selectHint")} description={t("selectHintDescription")} />
      )}
    </section>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex h-8 items-center gap-1.5 rounded-md px-2 text-sm font-medium transition-colors",
        active ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function StudentRow({
  student,
  canManage,
  removing,
  onRemove,
}: {
  student: ClassroomStudentDTO;
  canManage: boolean;
  removing: boolean;
  onRemove: (studentID: string) => Promise<void>;
}) {
  const t = useTranslations("classrooms");
  const name = student.displayName.trim() || student.username.trim() || t("studentFallback");

  return (
    <div className="group flex min-h-10 items-center gap-2.5 rounded-md px-2 py-1 transition-colors hover:bg-muted/40">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-medium text-background">
        {name.charAt(0).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-foreground">{name}</p>
        <p className="truncate text-xs text-muted-foreground">@{student.username}</p>
      </div>
      {canManage ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-8 shrink-0 text-muted-foreground opacity-100 hover:bg-destructive/10 hover:text-destructive md:opacity-0 md:group-hover:opacity-100"
          disabled={removing}
          onClick={() => void onRemove(student.id)}
          aria-label={t("removeStudentAria", { name })}
          title={t("removeStudent")}
        >
          {removing ? <Spinner className="size-3" /> : <X className="size-4" strokeWidth={1.6} />}
        </Button>
      ) : null}
    </div>
  );
}

function formatDate(value: string, locale: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}
