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
  className,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  format: (value: number) => string;
  className?: string;
}) {
  const id = React.useId();

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm text-foreground/85">
          {label}
        </label>
        <output htmlFor={id} className="font-mono text-sm font-medium tabular-nums text-primary">
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
        className="h-1 w-full cursor-pointer appearance-none rounded-full bg-border accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:ring-offset-4 focus-visible:ring-offset-card"
      />
    </div>
  );
}
