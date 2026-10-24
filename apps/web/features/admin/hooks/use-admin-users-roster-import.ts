import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { importRosterUsers } from "@/features/admin/api";
import type { AdminRosterImportRequest, AdminRosterImportResult } from "@/features/admin/api/admin-types";
import { resolveAdminErrorMessage } from "@/features/admin/utils/admin-error";
import { resolveAccessToken } from "@/shared/auth/resolve-access-token";

/**
 * Roster CSV import flow. A dry run returns a preview the dialog renders; a real
 * import returns one-time credentials and reloads the first page of users. The
 * dialog stays open after import so the admin can download the credentials.
 */
export function useAdminUsersRosterImport({
  page,
  setPage,
  onLoadUsers,
}: {
  page: number;
  setPage: (value: number) => void;
  onLoadUsers: () => Promise<void>;
}) {
  const t = useTranslations("adminUsers");
  const [rosterImportOpen, setRosterImportOpen] = React.useState(false);
  const [rosterImportPending, setRosterImportPending] = React.useState(false);
  const [rosterImportResult, setRosterImportResult] = React.useState<AdminRosterImportResult | null>(null);

  async function handleRosterImport(payload: AdminRosterImportRequest): Promise<AdminRosterImportResult | null> {
    if (rosterImportPending) {
      return null;
    }
    setRosterImportPending(true);
    try {
      const token = await resolveAccessToken();
      if (!token) {
        toast.error(t("toast.sessionExpired"), { description: t("toast.signInAgain") });
        return null;
      }
      const result = await importRosterUsers(token, payload);
      setRosterImportResult(result);
      if (payload.dryRun) {
        toast.success(
          t("rosterImport.toastPreviewSucceeded", {
            ready: result.ready,
            skipped: result.skipped,
            invalid: result.invalid,
          }),
        );
        return result;
      }
      toast.success(t("rosterImport.toastSucceeded", { imported: result.imported, skipped: result.skipped }));
      if (page === 1) {
        await onLoadUsers();
      } else {
        setPage(1);
      }
      return result;
    } catch (error) {
      toast.error(t("rosterImport.toastFailed"), { description: resolveAdminErrorMessage(error) });
      return null;
    } finally {
      setRosterImportPending(false);
    }
  }

  return {
    rosterImportOpen,
    setRosterImportOpen,
    rosterImportPending,
    rosterImportResult,
    setRosterImportResult,
    handleRosterImport,
  };
}
