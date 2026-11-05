"use client";

import { useTranslations } from "next-intl";
import * as React from "react";
import { toast } from "sonner";

import type { ClassroomDraft, ClassroomMobileView } from "@/features/classrooms/types/classrooms";
import { useLocalizedErrorMessage } from "@/i18n/use-localized-error";
import {
  addClassroomStudent,
  createClassroomStudentAccount,
  createClassroom,
  deleteClassroom,
  listClassroomStudents,
  listClassrooms,
  importClassroomStudentAccounts,
  removeClassroomStudent,
  updateClassroom,
} from "@/shared/api/classrooms";
import type { ClassroomDTO, ClassroomStudentDTO, StudentCredentialDTO, StudentImportResultDTO } from "@/shared/api/classroom-types";

const CLASSROOM_NAME_MAX_LENGTH = 80;
const CLASSROOM_DESCRIPTION_MAX_LENGTH = 255;

export function useClassroomPage(accessToken: string, canManage: boolean) {
  const t = useTranslations("classrooms");
  const resolveErrorMessage = useLocalizedErrorMessage();
  const [items, setItems] = React.useState<ClassroomDTO[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedID, setSelectedID] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [mobileView, setMobileView] = React.useState<ClassroomMobileView>("list");
  const [students, setStudents] = React.useState<ClassroomStudentDTO[]>([]);
  const [studentsLoading, setStudentsLoading] = React.useState(false);
  const [draft, setDraft] = React.useState<ClassroomDraft | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<ClassroomDTO | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [addStudentOpen, setAddStudentOpen] = React.useState(false);
  const [studentUsername, setStudentUsername] = React.useState("");
  const [addingStudent, setAddingStudent] = React.useState(false);
  const [removingStudentID, setRemovingStudentID] = React.useState("");
  const [createStudentOpen, setCreateStudentOpen] = React.useState(false);
  const [creatingStudent, setCreatingStudent] = React.useState(false);
  const [importStudentsOpen, setImportStudentsOpen] = React.useState(false);
  const [importingStudents, setImportingStudents] = React.useState(false);
  const [importStudentsResult, setImportStudentsResult] = React.useState<StudentImportResultDTO | null>(null);
  const [credentials, setCredentials] = React.useState<StudentCredentialDTO[]>([]);
  const [reloadVersion, setReloadVersion] = React.useState(0);

  const selected = React.useMemo(
    () => items.find((item) => item.id === selectedID) ?? null,
    [items, selectedID],
  );

  const visibleItems = React.useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return items;
    return items.filter((item) =>
      [item.name, item.description, item.teacherName].some((value) => value.toLowerCase().includes(keyword)),
    );
  }, [items, query]);

  React.useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const data = await listClassrooms(accessToken, controller.signal);
        if (cancelled) return;
        const nextItems = data.classrooms ?? [];
        setItems(nextItems);
        setSelectedID((current) =>
          current && nextItems.some((item) => item.id === current) ? current : (nextItems[0]?.id ?? ""),
        );
      } catch (error) {
        if (cancelled || controller.signal.aborted) return;
        toast.error(t("loadFailed"), { description: resolveErrorMessage(error) });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [accessToken, reloadVersion, resolveErrorMessage, t]);

  React.useEffect(() => {
    if (!selectedID) {
      setStudents([]);
      return;
    }
    const controller = new AbortController();
    let cancelled = false;
    setStudentsLoading(true);
    void (async () => {
      try {
        const data = await listClassroomStudents(accessToken, selectedID, controller.signal);
        if (!cancelled) setStudents(data.students ?? []);
      } catch (error) {
        if (cancelled || controller.signal.aborted) return;
        toast.error(t("studentsLoadFailed"), { description: resolveErrorMessage(error) });
      } finally {
        if (!cancelled) setStudentsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [accessToken, reloadVersion, resolveErrorMessage, selectedID, t]);

  const refresh = React.useCallback(() => {
    setReloadVersion((current) => current + 1);
  }, []);

  const openCreate = React.useCallback(() => {
    setDraft({ name: "", description: "" });
  }, []);

  const openEdit = React.useCallback((item: ClassroomDTO) => {
    setSelectedID(item.id);
    setDraft({ id: item.id, name: item.name, description: item.description });
  }, []);

  const closeEditor = React.useCallback(() => {
    if (!saving) setDraft(null);
  }, [saving]);

  const saveDraft = React.useCallback(async () => {
    if (!draft || saving) return;
    const name = draft.name.trim();
    const description = draft.description.trim();
    if (!name || name.length > CLASSROOM_NAME_MAX_LENGTH || description.length > CLASSROOM_DESCRIPTION_MAX_LENGTH) {
      toast.error(t("editor.invalid"));
      return;
    }
    setSaving(true);
    try {
      if (draft.id) {
        await updateClassroom(accessToken, draft.id, { name, description });
        toast.success(t("toast.updated"));
      } else {
        const data = await createClassroom(accessToken, { name, description });
        setSelectedID(data.classroom.id);
        setMobileView("detail");
        toast.success(t("toast.created"));
      }
      setDraft(null);
      refresh();
    } catch (error) {
      toast.error(t("toast.saveFailed"), { description: resolveErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  }, [accessToken, draft, refresh, resolveErrorMessage, saving, t]);

  const requestDelete = React.useCallback((item: ClassroomDTO) => {
    setDeleteTarget(item);
  }, []);

  const closeDelete = React.useCallback(() => {
    if (!deleting) setDeleteTarget(null);
  }, [deleting]);

  const confirmDelete = React.useCallback(async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await deleteClassroom(accessToken, deleteTarget.id);
      toast.success(t("toast.deleted"));
      setDeleteTarget(null);
      setSelectedID("");
      setMobileView("list");
      refresh();
    } catch (error) {
      toast.error(t("toast.deleteFailed"), { description: resolveErrorMessage(error) });
    } finally {
      setDeleting(false);
    }
  }, [accessToken, deleteTarget, deleting, refresh, resolveErrorMessage, t]);

  const openAddStudent = React.useCallback(() => {
    setStudentUsername("");
    setAddStudentOpen(true);
  }, []);

  const openCreateStudent = React.useCallback(() => {
    setCredentials([]);
    setImportStudentsResult(null);
    setCreateStudentOpen(true);
  }, []);

  const openImportStudents = React.useCallback(() => {
    setCredentials([]);
    setImportStudentsResult(null);
    setImportStudentsOpen(true);
  }, []);

  const createStudent = React.useCallback(async (input: { username: string; displayName: string; email: string }) => {
    if (!selected || creatingStudent) return;
    setCreatingStudent(true);
    try {
      const credential = await createClassroomStudentAccount(accessToken, selected.id, input);
      setCredentials([credential]);
      setImportStudentsResult(null);
      setCreateStudentOpen(false);
      toast.success(t("toast.accountCreated"));
      refresh();
    } catch (error) {
      toast.error(t("toast.accountCreateFailed"), { description: resolveErrorMessage(error) });
    } finally {
      setCreatingStudent(false);
    }
  }, [accessToken, creatingStudent, refresh, resolveErrorMessage, selected, t]);

  const importStudents = React.useCallback(async (roster: string | File) => {
    if (!selected || importingStudents) return;
    setImportingStudents(true);
    try {
      const result = await importClassroomStudentAccounts(accessToken, selected.id, roster);
      setImportStudentsResult(result);
      setCredentials(result.credentials);
      setImportStudentsOpen(false);
      toast.success(t("toast.rosterImported", { created: result.created, skipped: result.skipped, failed: result.failed }));
      refresh();
    } catch (error) {
      toast.error(t("toast.rosterImportFailed"), { description: resolveErrorMessage(error) });
    } finally {
      setImportingStudents(false);
    }
  }, [accessToken, importingStudents, refresh, resolveErrorMessage, selected, t]);

  const closeAddStudent = React.useCallback(() => {
    if (!addingStudent) setAddStudentOpen(false);
  }, [addingStudent]);

  const confirmAddStudent = React.useCallback(async () => {
    if (!selected || addingStudent) return;
    const username = studentUsername.trim();
    if (!username) return;
    setAddingStudent(true);
    try {
      await addClassroomStudent(accessToken, selected.id, { username });
      toast.success(t("toast.studentAdded"));
      setAddStudentOpen(false);
      setStudentUsername("");
      refresh();
    } catch (error) {
      toast.error(t("toast.studentAddFailed"), { description: resolveErrorMessage(error) });
    } finally {
      setAddingStudent(false);
    }
  }, [accessToken, addingStudent, refresh, resolveErrorMessage, selected, studentUsername, t]);

  const removeStudent = React.useCallback(
    async (studentID: string) => {
      if (!selected || removingStudentID) return;
      setRemovingStudentID(studentID);
      try {
        await removeClassroomStudent(accessToken, selected.id, studentID);
        toast.success(t("toast.studentRemoved"));
        refresh();
      } catch (error) {
        toast.error(t("toast.studentRemoveFailed"), { description: resolveErrorMessage(error) });
      } finally {
        setRemovingStudentID("");
      }
    },
    [accessToken, refresh, removingStudentID, resolveErrorMessage, selected, t],
  );

  const selectClassroom = React.useCallback((id: string) => {
    setSelectedID(id);
    setMobileView("detail");
  }, []);

  return {
    canManage,
    list: {
      items: visibleItems,
      total: items.length,
      loading,
      query,
      changeQuery: setQuery,
      selectedID,
      select: selectClassroom,
      create: openCreate,
      refresh,
    },
    detail: {
      selected,
      students,
      studentsLoading,
      mobileView,
      back: () => setMobileView("list"),
      edit: openEdit,
      remove: requestDelete,
      addStudent: openAddStudent,
      openCreateStudent,
      openImportStudents,
      removeStudent,
      removingStudentID,
    },
    editor: {
      draft,
      saving,
      change: setDraft,
      close: closeEditor,
      save: saveDraft,
    },
    addStudentDialog: {
      open: addStudentOpen,
      username: studentUsername,
      adding: addingStudent,
      changeUsername: setStudentUsername,
      close: closeAddStudent,
      confirm: confirmAddStudent,
    },
    createStudentDialog: {
      open: createStudentOpen,
      pending: creatingStudent,
      close: () => !creatingStudent && setCreateStudentOpen(false),
      submit: createStudent,
    },
    importStudentsDialog: {
      open: importStudentsOpen,
      pending: importingStudents,
      result: importStudentsResult,
      close: () => !importingStudents && setImportStudentsOpen(false),
      submit: importStudents,
    },
    credentialsDialog: {
      credentials,
      result: importStudentsResult,
      close: () => { setCredentials([]); setImportStudentsResult(null); },
    },
    deleteDialog: {
      target: deleteTarget,
      deleting,
      close: closeDelete,
      confirm: confirmDelete,
    },
  };
}

export type ClassroomPageModel = ReturnType<typeof useClassroomPage>;
