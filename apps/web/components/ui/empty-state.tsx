import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type CenteredEmptyStateProps = {
  title: ReactNode;
  description?: ReactNode;
  className?: string;
};

export function CenteredEmptyState({ title, description, className }: CenteredEmptyStateProps) {
  return (
    <div className={cn("flex h-full min-h-0 items-center justify-center px-6", className)}>
      <div className="text-center">
        <p className="font-display text-xl text-foreground">{title}</p>
        {description ? <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p> : null}
      </div>
    </div>
  );
}
