export type RecentDeleteTarget = { ids: string[]; label: string } | null;
export type RecentBulkConfirmAction = "archive" | "unarchive";

export type RecentRowState = {
  publicID: string;
  hovered: boolean;
  selected: boolean;
  highlighted: boolean;
};
