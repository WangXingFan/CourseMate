"use client";

import { LockKeyhole } from "lucide-react";
import type * as React from "react";

import { cn } from "@/lib/utils";

export function RevealGate({
  revealed,
  label,
  children,
  className,
}: {
  revealed: boolean;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  if (revealed) return <>{children}</>;

  return (
    <div
      className={cn(
        "flex min-h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/70 bg-muted/15 px-4 py-8 text-center",
        className,
      )}
    >
      <LockKeyhole className="size-4 text-muted-foreground" strokeWidth={1.6} />
      <p className="max-w-sm text-[11px] leading-5 text-muted-foreground">{label}</p>
    </div>
  );
}
