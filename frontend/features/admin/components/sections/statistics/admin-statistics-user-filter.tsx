"use client";

import * as React from "react";
import { Check, ChevronsUpDown, LoaderCircle, UserRound, UsersRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { listAdminUsers } from "@/features/admin/api";
import { resolveAdminErrorMessage } from "@/features/admin/utils/admin-error";
import { cn } from "@/lib/utils";
import type { UserDTO } from "@/shared/api/auth.types";
import { resolveAccessToken } from "@/shared/auth/resolve-access-token";

function userPrimaryLabel(user: UserDTO): string {
  return user.displayName.trim() || user.username.trim() || `#${user.id}`;
}

function userSecondaryLabel(user: UserDTO): string {
  const values = [user.username.trim(), user.email.trim(), `#${user.id}`].filter(Boolean);
  return values.join(" · ");
}

export function AdminStatisticsUserFilter({
  value,
  onChange,
  disabled = false,
}: {
  value: UserDTO | null;
  onChange: (user: UserDTO | null) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("adminStatistics.filters.userSelect");
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const [users, setUsers] = React.useState<UserDTO[]>([]);
  const [loading, setLoading] = React.useState(false);
  const requestSequenceRef = React.useRef(0);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  React.useEffect(() => {
    if (!open) return;
    const requestSequence = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestSequence;
    setLoading(true);
    void (async () => {
      try {
        const token = await resolveAccessToken();
        if (!token) return;
        const result = await listAdminUsers(token, {
          page: 1,
          pageSize: 20,
          query: debouncedQuery,
        });
        if (requestSequence === requestSequenceRef.current) {
          setUsers(result.results);
        }
      } catch (error) {
        if (requestSequence === requestSequenceRef.current) {
          toast.error(t("loadFailed"), { description: resolveAdminErrorMessage(error) });
        }
      } finally {
        if (requestSequence === requestSequenceRef.current) setLoading(false);
      }
    })();
  }, [debouncedQuery, open, t]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className="h-8 w-full min-w-0 justify-between border-input/40 bg-transparent px-2.5 text-xs font-normal shadow-none hover:bg-transparent dark:bg-input/30 dark:hover:bg-input/30"
        >
          <span className="flex min-w-0 items-center gap-2">
            {value ? <UserRound className="size-3.5 shrink-0 opacity-70" /> : <UsersRound className="size-3.5 shrink-0 opacity-70" />}
            <span className={cn("truncate", !value && "text-muted-foreground")}>
              {value ? userPrimaryLabel(value) : t("allUsers")}
            </span>
          </span>
          <ChevronsUpDown className="size-3 shrink-0 opacity-45" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[320px] p-0">
        <div className="relative border-b p-2">
          <Input
            type="search"
            name="admin-statistics-user-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("searchPlaceholder")}
            className="h-8 pr-8 text-xs"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            data-1p-ignore="true"
            data-form-type="other"
            autoFocus
          />
          {loading ? <LoaderCircle className="absolute right-4 top-4 size-3.5 animate-spin text-muted-foreground" /> : null}
        </div>
        <div className="max-h-[280px] overflow-y-auto p-1">
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-xs hover:bg-accent"
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
          >
            <UsersRound className="size-3.5 text-muted-foreground" />
            <span className="flex-1">{t("allUsers")}</span>
            {!value ? <Check className="size-3.5" /> : null}
          </button>
          {users.map((user) => (
            <button
              key={user.id}
              type="button"
              className="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left hover:bg-accent"
              onClick={() => {
                onChange(user);
                setOpen(false);
              }}
            >
              <UserRound className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium">{userPrimaryLabel(user)}</span>
                <span className="block truncate text-[11px] text-muted-foreground">{userSecondaryLabel(user)}</span>
              </span>
              {value?.id === user.id ? <Check className="size-3.5 shrink-0" /> : null}
            </button>
          ))}
          {!loading && users.length === 0 ? (
            <div className="px-3 py-7 text-center text-xs text-muted-foreground">{t("empty")}</div>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
