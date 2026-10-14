"use client";

import { WandSparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";

import { Blocks } from "@/components/animate-ui/icons/blocks";
import { InputGroupButton } from "@/components/ui/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// One "output" popover for everything that shapes how the reply is rendered.
export function ChatOutputOptions({
  placementPreference,
  disabled,
  htmlVisual,
}: {
  placementPreference: "top" | "bottom";
  disabled: boolean;
  htmlVisual?: { enabled: boolean; onChange: (enabled: boolean) => void };
}) {
  const t = useTranslations("chat.composer");
  const [open, setOpen] = React.useState(false);
  const [hovered, setHovered] = React.useState(false);
  const customised = Boolean(htmlVisual?.enabled);

  if (!htmlVisual) {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <InputGroupButton
              type="button"
              variant="ghost"
              size="icon-sm"
              className={cn(
                "size-7 rounded-md text-muted-foreground hover:text-foreground sm:size-8",
                customised && "bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary",
              )}
              disabled={disabled}
              aria-label={t("output")}
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
            >
              <Blocks size={20} strokeWidth={1.4} animate={hovered || customised ? "default" : undefined} />
            </InputGroupButton>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {t("output")}
        </TooltipContent>
      </Tooltip>

      <PopoverContent
        side={placementPreference}
        align="start"
        sideOffset={8}
        avoidCollisions={false}
        collisionPadding={8}
        className="flex max-h-[var(--radix-popover-content-available-height)] w-[min(19rem,calc(100vw-1rem))] flex-col p-1.5"
        onPointerDown={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <label className="flex h-7 shrink-0 cursor-pointer items-center justify-between gap-3 rounded-md px-1.5 text-xs text-foreground/80 transition-colors hover:bg-accent hover:text-accent-foreground">
          <span className="flex items-center gap-1.5">
            <WandSparkles className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={1.6} />
            <span className="font-medium">{t("htmlVisualPrompt")}</span>
          </span>
          <Switch size="sm" checked={htmlVisual.enabled} onCheckedChange={htmlVisual.onChange} />
        </label>
      </PopoverContent>
    </Popover>
  );
}
