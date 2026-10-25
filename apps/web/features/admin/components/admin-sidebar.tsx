"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import {
  ADMIN_SECTIONS,
  type AdminSection,
  DEFAULT_ADMIN_SECTION,
  resolveAdminSectionFromPath,
} from "@/features/admin/model/admin-sections";
import { cn } from "@/lib/utils";
import { isSectionAvailable, useCapabilities } from "@/shared/capabilities";

const ADMIN_SECTION_LABEL_KEYS: Record<AdminSection, string> = {
  users: "sections.accounts",
  upstreams: "sections.upstreams",
  models: "sections.models",
  "knowledge-bases": "sections.knowledgeBases",
};

export function AdminSidebar({
  basePath,
}: {
  basePath: string;
}) {
  const t = useTranslations("adminUsers");
  const pathname = usePathname();
  const activeSection = resolveAdminSectionFromPath(pathname, basePath)?.id ?? DEFAULT_ADMIN_SECTION;
  const { flags } = useCapabilities();
  const activeLinkRef = React.useRef<HTMLAnchorElement | null>(null);
  const visibleSections = React.useMemo(
    () => ADMIN_SECTIONS.filter((item) => isSectionAvailable(item, flags)),
    [flags],
  );
  const sectionLabel = React.useCallback(
    (id: AdminSection, fallback: string) => {
      return t(ADMIN_SECTION_LABEL_KEYS[id]) || fallback;
    },
    [t],
  );

  React.useEffect(() => {
    activeLinkRef.current?.scrollIntoView({
      block: "nearest",
      inline: "center",
    });
  }, [activeSection]);

  return (
    <aside className="w-full shrink-0 xl:max-w-64">
      <div className="space-y-3 xl:sticky xl:top-6 xl:space-y-5">
        <div className="flex h-9 items-center px-1 xl:h-10">
          <h1 className="font-display text-2xl font-normal tracking-[-0.01em] xl:text-[2rem]">{t("adminTitle")}</h1>
        </div>

        <nav
          aria-label={t("adminTitle")}
          className="flex gap-1.5 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none] [-ms-overflow-style:none] xl:grid xl:gap-1 xl:overflow-visible xl:pb-0 [&::-webkit-scrollbar]:hidden"
        >
          {visibleSections.map((item) => {
            const active = item.id === activeSection;

            return (
              <Link
                key={item.id}
                ref={active ? activeLinkRef : undefined}
                href={`${basePath}${item.href}`}
                prefetch={false}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-9 shrink-0 scroll-mx-3 items-center justify-between gap-2 whitespace-nowrap rounded-md px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/35 xl:h-10 xl:w-full xl:px-3.5",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground xl:shadow-[inset_2px_0_0_var(--primary)]"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:bg-sidebar-accent focus-visible:text-sidebar-accent-foreground",
                )}
              >
                <span className="truncate">{sectionLabel(item.id, item.label)}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
