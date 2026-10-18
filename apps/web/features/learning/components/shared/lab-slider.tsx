"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export function LabSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
  hint,
  className,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  format: (value: number) => string;
  hint?: string;
  className?: string;
}) {
  const id = React.useId();

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-xs text-muted-foreground">
          {label}
        </label>
        <output htmlFor={id} className="font-mono text-xs font-medium tabular-nums text-foreground">
          {format(value)}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
      />
      {hint ? <p className="text-[11px] leading-5 text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
