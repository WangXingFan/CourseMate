"use client";

import katex from "katex";
import * as React from "react";

import { cn } from "@/lib/utils";

export function MathFormula({
  children,
  display = false,
  className,
}: {
  children: string;
  display?: boolean;
  className?: string;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;
    try {
      katex.render(children, element, {
        displayMode: display,
        throwOnError: false,
        strict: false,
      });
    } catch {
      element.textContent = children;
    }
  }, [children, display]);

  return (
    <span
      ref={ref}
      className={cn(
        display ? "block overflow-x-auto py-1 text-center text-[15px]" : "inline-block align-middle",
        className,
      )}
    />
  );
}
