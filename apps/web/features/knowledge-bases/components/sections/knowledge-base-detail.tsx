"use client";

import { ArrowLeft, BookOpen, DatabaseZap, Link2Off, Plus } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CenteredEmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import type {
  KnowledgeBaseMobileView,
  KnowledgeBaseMode,
} from "@/features/knowledge-bases/types/knowledge-bases";
import { cn } from "@/lib/utils";
import type { KnowledgeBaseDTO, KnowledgeBaseFileDTO } from "@/shared/api/knowledge-bases-types";
import {
  canManuallyVectorizeFile,
  formatBytes,
  isVectorIndexOutdated,
  resolveFileIcon,
  resolveFileRetrievalBadge,
} from "@/entities/file";

type KnowledgeBaseDetailProps = {
  mode: KnowledgeBaseMode;
  mobileView: KnowledgeBaseMobileView;
  selected: KnowledgeBaseDTO | null;
  files: KnowledgeBaseFileDTO[];
  filesTotal: number;
  loading: boolean;
  loadingMore: boolean;
  removingFileID: string;
  toggling: boolean;
  selectedFileIDs: string[];
  vectorizingFileIDs: string[];
  onBack: () => void;
  onAddFiles: () => void;
  onLoadMore: () => Promise<void>;
  onRemoveFile: (fileID: string) => Promise<void>;
  onToggleEnabled: (enabled: boolean) => Promise<void>;
  onPreviewFile: (file: KnowledgeBaseFileDTO) => void;
  onToggleFileSelection: (fileID: string, checked: boolean) => void;
  onSelectAllFiles: () => void;
  onRemoveSelectedFiles: () => void;
  onClearFileSelection: () => void;
  onVectorizeFile: (fileID: string) => Promise<void>;
  onVectorizeSelectedFiles: () => Promise<void>;
};

export function KnowledgeBaseDetail({
  mode,
  mobileView,
  selected,
  files,
  filesTotal,
  loading,
  loadingMore,
  removingFileID,
  toggling,
  selectedFileIDs,
  vectorizingFileIDs,
  onBack,
  onAddFiles,
  onLoadMore,
  onRemoveFile,
  onToggleEnabled,
  onPreviewFile,
  onToggleFileSelection,
  onSelectAllFiles,
  onRemoveSelectedFiles,
  onClearFileSelection,
  onVectorizeFile,
  onVectorizeSelectedFiles,
}: KnowledgeBaseDetailProps) {
  const t = useTranslations("knowledgeBases");

  return (
    <section
      className={cn(
        "relative min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:flex",
        mobileView === "detail" ? "flex" : "hidden",
      )}
    >
      {selected ? (
        <>
          <KnowledgeBaseDetailHeader
            mode={mode}
            selected={selected}
            toggling={toggling}
            onBack={onBack}
            onAddFiles={onAddFiles}
            onToggleEnabled={onToggleEnabled}
          />
          {loading || files.length > 0 ? (
            <KnowledgeBaseFileList
              mode={mode}
              selected={selected}
              files={files}
              filesTotal={filesTotal}
              loading={loading}
              loadingMore={loadingMore}
              removingFileID={removingFileID}
              selectedFileIDs={selectedFileIDs}
              vectorizingFileIDs={vectorizingFileIDs}
              onLoadMore={onLoadMore}
              onRemoveFile={onRemoveFile}
              onPreviewFile={onPreviewFile}
              onToggleFileSelection={onToggleFileSelection}
              onSelectAllFiles={onSelectAllFiles}
              onRemoveSelectedFiles={onRemoveSelectedFiles}
              onClearFileSelection={onClearFileSelection}
              onVectorizeFile={onVectorizeFile}
              onVectorizeSelectedFiles={onVectorizeSelectedFiles}
            />
          ) : (
            <div className="pointer-events-none absolute inset-0">
              <CenteredEmptyState
                title={t("noFiles")}
              />
            </div>
          )}
        </>
      ) : (
        <CenteredEmptyState title={t("selectHint")} />
      )}
    </section>
  );
}

type KnowledgeBaseDetailHeaderProps = Pick<
  KnowledgeBaseDetailProps,
  "mode" | "selected" | "toggling" | "onBack" | "onAddFiles" | "onToggleEnabled"
> & {
  selected: KnowledgeBaseDTO;
};

function KnowledgeBaseDetailHeader({
  mode,
  selected,
  toggling,
  onBack,
  onAddFiles,
  onToggleEnabled,
}: KnowledgeBaseDetailHeaderProps) {
  const t = useTranslations("knowledgeBases");

  return (
    <header className="flex min-w-0 shrink-0 flex-wrap items-center justify-between gap-4 border-b border-border px-4 py-6 md:px-8 md:pb-8">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="-ml-1 size-8 shrink-0 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
          onClick={onBack}
          aria-label={t("back")}
        >
          <ArrowLeft className="size-4" strokeWidth={1.6} />
        </Button>
        <div className="hidden size-7 shrink-0 items-center justify-center md:flex">
          <BookOpen className="size-5 text-muted-foreground" strokeWidth={1.5} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <h2 className="truncate font-display text-2xl font-normal text-foreground md:text-3xl">{selected.name}</h2>
            <Badge variant="secondary" className="h-5 rounded-md px-1.5 text-xs font-normal">
              {selected.scope === "builtin" ? t("builtin") : t("personal")}
            </Badge>
          </div>
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
            {selected.description || t("files", { count: selected.fileCount })}
          </p>
        </div>
      </div>
      {mode === "admin" || selected.scope === "user" ? (
        <div className="flex shrink-0 items-center gap-1">
          {mode === "admin" ? (
            <label className="mr-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <span className="hidden lg:inline">
                {selected.enabled ? t("enabled") : t("disabled")}
              </span>
              <Switch
                size="sm"
                checked={selected.enabled}
                disabled={toggling}
                onCheckedChange={(checked) => void onToggleEnabled(checked)}
                aria-label={t("availability")}
              />
            </label>
          ) : null}
          <Button
            type="button"
            size="sm"
            className="ml-0 h-9 px-2 sm:ml-1"
            onClick={onAddFiles}
            aria-label={t("addFiles")}
          >
            <Plus className="size-3.5" strokeWidth={1.6} />
            <span className="hidden sm:inline">{t("confirmAdd")}</span>
          </Button>
        </div>
      ) : null}
    </header>
  );
}

type KnowledgeBaseFileListProps = Pick<
  KnowledgeBaseDetailProps,
  | "mode"
  | "selected"
  | "files"
  | "filesTotal"
  | "loading"
  | "loadingMore"
  | "removingFileID"
  | "selectedFileIDs"
  | "vectorizingFileIDs"
  | "onLoadMore"
  | "onRemoveFile"
  | "onPreviewFile"
  | "onToggleFileSelection"
  | "onSelectAllFiles"
  | "onRemoveSelectedFiles"
  | "onClearFileSelection"
  | "onVectorizeFile"
  | "onVectorizeSelectedFiles"
> & {
  selected: KnowledgeBaseDTO;
};

function KnowledgeBaseFileList({
  mode,
  selected,
  files,
  filesTotal,
  loading,
  loadingMore,
  removingFileID,
  selectedFileIDs,
  vectorizingFileIDs,
  onLoadMore,
  onRemoveFile,
  onPreviewFile,
  onToggleFileSelection,
  onSelectAllFiles,
  onRemoveSelectedFiles,
  onClearFileSelection,
  onVectorizeFile,
  onVectorizeSelectedFiles,
}: KnowledgeBaseFileListProps) {
  const t = useTranslations("knowledgeBases");
  const tStatus = useTranslations("files.status");
  const editable = mode === "admin" || selected.scope === "user";
  const selectedFileIDSet = new Set(selectedFileIDs);
  const vectorizingFileIDSet = new Set(vectorizingFileIDs);
  const vectorizingFiles = vectorizingFileIDs.length > 0;
  const busy = vectorizingFiles || Boolean(removingFileID);
  const selectedVectorizableCount = files.filter((file) => selectedFileIDSet.has(file.fileID) && canManuallyVectorizeFile(file)).length;
  const allFilesSelected = files.length > 0 && files.every((file) => selectedFileIDSet.has(file.fileID));

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {editable && !loading && files.length > 0 ? (
        <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-border px-3 py-2 text-sm md:px-5">
          <label className="flex shrink-0 items-center gap-2">
            <Checkbox
              checked={allFilesSelected ? true : selectedFileIDs.length > 0 ? "indeterminate" : false}
              disabled={busy || loadingMore}
              onCheckedChange={(checked) => checked ? onSelectAllFiles() : onClearFileSelection()}
              aria-label={t(files.length < filesTotal ? "selectLoadedFiles" : "selectAllFiles")}
            />
            {t(files.length < filesTotal ? "selectLoadedFiles" : "selectAllFiles")}
          </label>
          <span className="ml-auto whitespace-nowrap text-muted-foreground sm:ml-0 sm:flex-1">{t("selected", { count: selectedFileIDs.length })}</span>
          {selectedFileIDs.length > 0 ? <div className="flex w-full flex-wrap items-center justify-end gap-1 sm:ml-auto sm:w-auto">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 px-2 text-sm"
            disabled={busy}
            onClick={onClearFileSelection}
          >
            {t("cancel")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 gap-1 px-2 text-sm"
            disabled={selectedVectorizableCount === 0 || busy}
            onClick={() => void onVectorizeSelectedFiles()}
          >
            {vectorizingFiles ? <Spinner className="size-3.5" /> : <DatabaseZap className="size-3.5" strokeWidth={1.5} />}
            {t("vectorize")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 gap-1 px-2 text-sm text-destructive hover:text-destructive"
            disabled={busy || loadingMore}
            onClick={onRemoveSelectedFiles}
          >
            {removingFileID ? <Spinner className="size-4" /> : <Link2Off className="size-4" strokeWidth={1.5} />}
            {t("removeSelectedFiles")}
          </Button>
          </div> : null}
        </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 md:px-5">
      {loading ? (
        <div className="flex h-full items-center justify-center text-muted-foreground">
          <Spinner className="size-4" />
        </div>
      ) : (
        <div className="w-full">
          <div className="space-y-0">
            {files.map((file) => {
              const FileIcon = resolveFileIcon(file);
              const statusLabel = resolveFileRetrievalBadge(
                file,
                (key, values) => tStatus(key, values),
              ).label;
              const vectorizable = canManuallyVectorizeFile(file);
              const outdatedIndex = isVectorIndexOutdated(file);
              const checked = selectedFileIDSet.has(file.fileID);
              return (
                <div key={file.fileID} className={cn("group relative min-h-16 border-b border-border/60 last:border-b-0", checked && "bg-accent shadow-[inset_2px_0_0_var(--primary)]")}>
                  {editable ? (
                    <Checkbox
                      checked={checked}
                      className="absolute left-3 top-1/2 z-10 -translate-y-1/2"
                      disabled={busy}
                      onClick={(event) => event.stopPropagation()}
                      onCheckedChange={(value) => onToggleFileSelection(file.fileID, value === true)}
                      aria-label={t("selectFile", { name: file.fileName })}
                    />
                  ) : null}
                  <button
                    type="button"
                    className={cn(
                      "flex min-h-16 w-full items-center gap-3 rounded-md px-2 py-3 text-left transition-colors hover:bg-muted/45 focus-visible:bg-muted/45 focus-visible:outline-none",
                      editable && "pl-11 pr-18",
                    )}
                    onClick={() => onPreviewFile(file)}
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center text-muted-foreground">
                      <FileIcon className="size-4" strokeWidth={1.5} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className="block truncate text-sm font-normal text-foreground"
                        title={file.fileName}
                      >
                        {file.fileName}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground sm:hidden">
                        {formatBytes(file.sizeBytes)} · {statusLabel}
                      </span>
                    </span>
                    <span className="hidden w-20 shrink-0 text-right text-xs text-muted-foreground sm:block">
                      {formatBytes(file.sizeBytes)}
                    </span>
                    <span
                      className="hidden w-20 shrink-0 truncate text-right text-xs text-muted-foreground sm:block"
                      title={statusLabel}
                    >
                      {statusLabel}
                    </span>
                  </button>
                  {editable ? (
                    <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
                      {vectorizable ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground/70 hover:bg-muted hover:text-foreground"
                          disabled={busy}
                          onClick={(event) => {
                            event.stopPropagation();
                            void onVectorizeFile(file.fileID);
                          }}
                          aria-label={t(outdatedIndex ? "updateVectorIndexFile" : "vectorizeFile", { name: file.fileName })}
                          title={t(outdatedIndex ? "updateVectorIndex" : "vectorize")}
                        >
                          {vectorizingFileIDSet.has(file.fileID) ? <Spinner className="size-3.5" /> : <DatabaseZap className="size-3.5" strokeWidth={1.5} />}
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground/70 hover:bg-muted hover:text-foreground"
                        disabled={busy || loadingMore}
                        onClick={(event) => {
                          event.stopPropagation();
                          void onRemoveFile(file.fileID);
                        }}
                        aria-label={t("removeFile")}
                        title={t("removeFile")}
                      >
                        {removingFileID === file.fileID ? (
                          <Spinner className="size-3.5" />
                        ) : (
                          <Link2Off className="size-3.5" strokeWidth={1.5} />
                        )}
                      </Button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
          {files.length < filesTotal ? (
            <div className="flex justify-center pt-3">
              <Button
                variant="ghost"
                size="sm"
                disabled={loadingMore || busy}
                onClick={() => void onLoadMore()}
              >
                {loadingMore ? <Spinner className="size-3.5" /> : null}
                {t("loadMore")}
              </Button>
            </div>
          ) : null}
        </div>
      )}
      </div>
    </div>
  );
}
