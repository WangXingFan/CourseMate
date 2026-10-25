import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type CenteredEmptyStateProps = {
  title: ReactNode;
  className?: string;
  children?: ReactNode;
};

export function CenteredEmptyState({ title, className, children }: CenteredEmptyStateProps) {
  return (
    <div className={cn("flex h-full min-h-0 items-center justify-center px-6", className)}>
      <div className="text-center">
        <p className="font-display text-xl text-foreground">{title}</p>
        {children}
      </div>
    </div>
  );
}
