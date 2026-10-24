"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type * as React from "react";

import { Button } from "@/components/ui/button";
import { MathFormula } from "@/features/learning/components/shared/math-formula";
import { cn } from "@/lib/utils";

export function LessonShell({
  title,
  subtitle,
  formula,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  formula?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const t = useTranslations("learning.common");

  return (
    <div className="h-full min-h-0 w-full overflow-y-auto bg-background [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className={cn("mx-auto w-full max-w-5xl px-4 py-5 md:px-6 md:py-7", className)}>
        <div className="mb-5 flex items-start gap-3">
          <Button asChild variant="ghost" size="icon-sm" className="mt-0.5 shrink-0">
            <Link href="/learn" aria-label={t("back")}>
              <ArrowLeft className="size-4" strokeWidth={1.6} />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight text-foreground md:text-xl">{title}</h1>
            </div>
            {subtitle && <p className="mt-1 text-xs leading-5 text-muted-foreground">{subtitle}</p>}
            {formula ? (
              <div className="mt-3 rounded-lg border border-border/60 bg-muted/25 px-3 py-2">
                <MathFormula display>{formula}</MathFormula>
              </div>
            ) : null}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

export function LessonPanel({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-border/60 bg-card p-4 text-card-foreground shadow-sm", className)}>
      <div className="mb-3">
        <h2 className="text-[13px] font-medium text-foreground">{title}</h2>
        {description ? <p className="mt-0.5 text-[11px] leading-5 text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function Readout({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-mono text-sm font-medium tabular-nums text-foreground">{value}</p>
      {hint ? <p className="mt-0.5 text-[10px] leading-4 text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
