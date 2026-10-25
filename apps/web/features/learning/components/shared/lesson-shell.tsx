"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type * as React from "react";

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
      <div className={cn("mx-auto w-full max-w-5xl px-5 pt-6 pb-16 md:px-10 md:pt-10", className)}>
        <Link
          href="/learn"
          className="inline-flex items-center gap-1.5 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
        >
          <ArrowLeft className="size-4" strokeWidth={1.6} aria-hidden />
          {t("back")}
        </Link>
        <header className="mt-6 mb-8 grid gap-6 border-b border-border pb-8 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] md:items-end">
          <div className="min-w-0">
            <h1 className="font-display text-3xl leading-[1.12] font-normal tracking-[-0.015em] text-foreground md:text-4xl">
              {title}
            </h1>
            {subtitle ? <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">{subtitle}</p> : null}
          </div>
          {formula ? (
            <div className="min-w-0 overflow-x-auto border-l-2 border-seal py-1 pl-4 text-foreground">
              <MathFormula display>{formula}</MathFormula>
            </div>
          ) : null}
        </header>
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
    <section className={cn("rounded-lg border border-border bg-card p-5 text-card-foreground md:p-6", className)}>
      <div className="mb-4">
        <h2 className="font-display text-xl font-normal text-foreground">{title}</h2>
        {description ? <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function Readout({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="border-l-2 border-border py-1 pl-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-lg font-medium tabular-nums text-foreground">{value}</p>
      {hint ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
