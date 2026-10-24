"use client";

import dynamic from "next/dynamic";
import type * as React from "react";

import { AuthGuard } from "@/shared/auth/auth-guard";

const ProjectLayout = dynamic(
  () => import("@/features/shell/components/sections/project-layout").then((mod) => mod.ProjectLayout),
  { ssr: false },
);

export function ProjectWorkspace({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <ProjectLayout>{children}</ProjectLayout>
    </AuthGuard>
  );
}
