"use client";

import { ClassroomDetail } from "@/features/classrooms/components/sections/classroom-detail";
import {
  AddClassroomStudentDialog,
  ClassroomEditorDialog,
  DeleteClassroomDialog,
} from "@/features/classrooms/components/sections/classroom-dialogs";
import {
  ClassroomStudentCredentialsDialog,
  ImportClassroomStudentsDialog,
  NewClassroomStudentDialog,
} from "@/features/classrooms/components/sections/classroom-student-dialogs";
import { ClassroomSidebar } from "@/features/classrooms/components/sections/classroom-sidebar";
import { useClassroomPage } from "@/features/classrooms/hooks/use-classroom-page";

export function AppClassrooms({
  accessToken,
  canManage,
}: {
  accessToken: string;
  canManage: boolean;
}) {
  const page = useClassroomPage(accessToken, canManage);
  const { list, detail, editor, addStudentDialog, createStudentDialog, importStudentsDialog, credentialsDialog, deleteDialog } = page;

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 overflow-hidden">
      <ClassroomSidebar
        items={list.items}
        total={list.total}
        loading={list.loading}
        query={list.query}
        selectedID={list.selectedID}
        mobileView={detail.mobileView}
        canManage={canManage}
        onQueryChange={list.changeQuery}
        onSelect={list.select}
        onCreate={list.create}
        onRefresh={list.refresh}
      />
      <ClassroomDetail
        accessToken={accessToken}
        selected={detail.selected}
        students={detail.students}
        studentsLoading={detail.studentsLoading}
        mobileView={detail.mobileView}
        canManage={canManage}
        removingStudentID={detail.removingStudentID}
        onBack={detail.back}
        onEdit={detail.edit}
        onDelete={detail.remove}
        onAddStudent={detail.addStudent}
        onCreateStudent={detail.openCreateStudent}
        onImportStudents={detail.openImportStudents}
        onRemoveStudent={detail.removeStudent}
      />

      <ClassroomEditorDialog
        draft={editor.draft}
        saving={editor.saving}
        onDraftChange={editor.change}
        onClose={editor.close}
        onSave={editor.save}
      />
      <AddClassroomStudentDialog
        open={addStudentDialog.open}
        username={addStudentDialog.username}
        adding={addStudentDialog.adding}
        onUsernameChange={addStudentDialog.changeUsername}
        onClose={addStudentDialog.close}
        onConfirm={addStudentDialog.confirm}
      />
      <NewClassroomStudentDialog
        open={createStudentDialog.open}
        pending={createStudentDialog.pending}
        onClose={createStudentDialog.close}
        onSubmit={createStudentDialog.submit}
      />
      <ImportClassroomStudentsDialog
        open={importStudentsDialog.open}
        pending={importStudentsDialog.pending}
        result={importStudentsDialog.result}
        onClose={importStudentsDialog.close}
        onSubmit={importStudentsDialog.submit}
      />
      <ClassroomStudentCredentialsDialog
        credentials={credentialsDialog.credentials}
        result={credentialsDialog.result}
        onClose={credentialsDialog.close}
      />
      <DeleteClassroomDialog
        target={deleteDialog.target}
        deleting={deleteDialog.deleting}
        onClose={deleteDialog.close}
        onConfirm={deleteDialog.confirm}
      />
    </div>
  );
}
