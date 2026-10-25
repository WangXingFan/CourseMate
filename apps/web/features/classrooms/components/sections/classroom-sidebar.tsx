"use client";

import { GraduationCap, Plus, RefreshCw, Search, Users } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CenteredEmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import type { ClassroomDTO } from "@/shared/api/classroom-types";

type ClassroomSidebarProps = {
  items: ClassroomDTO[];
  total: number;
  loading: boolean;
  query: string;
  selectedID: string;
  mobileView: "list" | "detail";
  canManage: boolean;
  onQueryChange: (value: string) => void;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onRefresh: () => void;
};

export function ClassroomSidebar({
  items,
  total,
  loading,
  query,
  selectedID,
  mobileView,
  canManage,
  onQueryChange,
  onSelect,
  onCreate,
  onRefresh,
}: ClassroomSidebarProps) {
  const t = useTranslations("classrooms");

  return (
    <aside
      className={cn(
        "h-full min-h-0 min-w-0 shrink-0 flex-col overflow-hidden border-border/45 bg-transparent md:flex md:w-72 md:border-r lg:w-80",
        mobileView === "list" ? "flex" : "hidden",
      )}
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col px-3 md:px-2">
        <header className="min-w-0 overflow-hidden pt-2">
          <div className="flex h-12 min-w-0 items-center gap-2 px-2">
            <h1 className="min-w-0 flex-1 truncate font-display text-2xl font-normal text-foreground">{t("title")}</h1>
            <Badge variant="secondary" className="h-5 rounded-md px-1.5 text-2xs font-normal">
              {total}
            </Badge>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={onRefresh}
              aria-label={t("refresh")}
              title={t("refresh")}
            >
              <RefreshCw className="size-3.5 stroke-1" />
            </Button>
            {canManage ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={onCreate}
                aria-label={t("create")}
                title={t("create")}
              >
                <Plus className="size-4 stroke-1" />
              </Button>
            ) : null}
          </div>

          <div className="px-2 py-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder={t("searchPlaceholder")}
                className="h-9 pl-9 text-sm"
                aria-label={t("searchPlaceholder")}
              />
            </div>
          </div>
        </header>

        {loading && items.length === 0 ? (
          <div className="flex min-h-0 flex-1 items-center justify-center pb-6 text-muted-foreground">
            <Spinner className="size-4" />
          </div>
        ) : items.length > 0 ? (
          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden pr-1 pb-4">
            <div className="space-y-0.5 px-1">
              {items.map((item) => {
                const selected = item.id === selectedID;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelect(item.id)}
                    aria-current={selected ? "true" : undefined}
                    className={cn(
                      "w-full rounded-md px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/40",
                      selected ? "bg-accent shadow-[inset_2px_0_0_var(--primary)]" : "hover:bg-muted",
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-primary">
                        <GraduationCap className="size-3.5" strokeWidth={1.6} />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                        {item.name}
                      </span>
                      <span className="flex shrink-0 items-center gap-1 text-2xs text-muted-foreground">
                        <Users className="size-3" strokeWidth={1.6} />
                        {item.studentCount}
                      </span>
                    </div>
                    <p className="mt-1 truncate pl-8 text-xs text-muted-foreground">
                      {item.description || t("studentCount", { count: item.studentCount })}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <CenteredEmptyState
            className="pointer-events-none flex-1 px-4 pb-6"
            title={query.trim() ? t("searchEmpty") : t("empty")}
            description={
              query.trim()
                ? t("searchEmptyDescription")
                : canManage
                  ? t("emptyDescription")
                  : t("emptyDescriptionReadOnly")
            }
          />
        )}
      </div>
    </aside>
  );
}
