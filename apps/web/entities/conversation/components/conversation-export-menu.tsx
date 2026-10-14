"use client";

import * as React from "react";
import { Camera, Download, MousePointerClick } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuItemIcon,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type ConversationExportActionsProps = {
  exportLabel: string;
  onExport?: () => void | Promise<void>;
  screenshotLatestLabel?: string;
  screenshotSelectLabel?: string;
  onScreenshotLatest?: () => void;
  onScreenshotSelect?: () => void;
};

type ConversationExportMenuItemsProps = ConversationExportActionsProps & {
  onCloseMenu?: () => void;
};

export function ConversationExportMenuItems({
  exportLabel,
  onExport,
  screenshotLatestLabel,
  screenshotSelectLabel,
  onScreenshotLatest,
  onScreenshotSelect,
  onCloseMenu,
}: ConversationExportMenuItemsProps) {
  const hasScreenshot = Boolean(onScreenshotLatest || onScreenshotSelect);
  return (
    <>
      <DropdownMenuItem
        disabled={!onExport}
        onSelect={(event) => {
          event.preventDefault();
          if (!onExport) {
            return;
          }
          onCloseMenu?.();
          void onExport();
        }}
      >
        <DropdownMenuItemIcon icon={Download} className="text-current" />
        {exportLabel}
      </DropdownMenuItem>
      {hasScreenshot ? (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={!onScreenshotSelect}
            onSelect={(event) => {
              event.preventDefault();
              if (!onScreenshotSelect) {
                return;
              }
              onCloseMenu?.();
              onScreenshotSelect();
            }}
          >
            <DropdownMenuItemIcon icon={MousePointerClick} className="text-current" />
            {screenshotSelectLabel}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!onScreenshotLatest}
            onSelect={(event) => {
              event.preventDefault();
              if (!onScreenshotLatest) {
                return;
              }
              onCloseMenu?.();
              onScreenshotLatest();
            }}
          >
            <DropdownMenuItemIcon icon={Camera} className="text-current" />
            {screenshotLatestLabel}
          </DropdownMenuItem>
        </>
      ) : null}
    </>
  );
}

type ConversationExportIconDropdownProps = {
  label: string;
  className?: string;
} & ConversationExportActionsProps;

export function ConversationExportIconDropdown({
  label,
  exportLabel,
  className,
  onExport,
  screenshotLatestLabel,
  screenshotSelectLabel,
  onScreenshotLatest,
  onScreenshotSelect,
}: ConversationExportIconDropdownProps) {
  const [open, setOpen] = React.useState(false);
  const hasAction = Boolean(onExport || onScreenshotLatest || onScreenshotSelect);

  return (
    <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "size-8 shrink-0 rounded-lg text-muted-foreground shadow-none hover:bg-muted hover:text-foreground",
            className,
          )}
          disabled={!hasAction}
          aria-label={label}
          title={label}
        >
          <Download className="size-4 stroke-[1.8]" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="min-w-40">
        <ConversationExportMenuItems
          exportLabel={exportLabel}
          onExport={onExport}
          screenshotLatestLabel={screenshotLatestLabel}
          screenshotSelectLabel={screenshotSelectLabel}
          onScreenshotLatest={onScreenshotLatest}
          onScreenshotSelect={onScreenshotSelect}
          onCloseMenu={() => setOpen(false)}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ConversationExportSubmenu({
  label,
  exportLabel,
  onExport,
  screenshotLatestLabel,
  screenshotSelectLabel,
  onScreenshotLatest,
  onScreenshotSelect,
  onCloseMenu,
}: { label: string } & ConversationExportMenuItemsProps) {
  const hasAction = Boolean(onExport || onScreenshotLatest || onScreenshotSelect);
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger disabled={!hasAction}>
        <DropdownMenuItemIcon icon={Download} className="text-current" />
        {label}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="min-w-40 p-1.5">
        <ConversationExportMenuItems
          exportLabel={exportLabel}
          onExport={onExport}
          screenshotLatestLabel={screenshotLatestLabel}
          screenshotSelectLabel={screenshotSelectLabel}
          onScreenshotLatest={onScreenshotLatest}
          onScreenshotSelect={onScreenshotSelect}
          onCloseMenu={onCloseMenu}
        />
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
