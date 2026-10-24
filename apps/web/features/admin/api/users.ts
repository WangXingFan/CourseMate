import { authedRequest } from "@/shared/api/authed-client";
import type {
  AdminUserData,
  AdminUserDTO,
  PatchAdminUserRequest,
  CreateAdminUserRequest,
  DeleteAdminUserData,
  ResetAdminUserPasswordData,
  ResetAdminUserPasswordRequest,
  ResetAdminUserTwoFactorData,
  RevokeAdminUserSessionsData,
  UpdateAdminUserStatusRequest,
  AdminRosterImportRequest,
  AdminRosterImportResult,
} from "@/features/admin/api/admin-types";
import type { PagePayload } from "@/shared/api/common-types";

import { normalizeAdminPagePayload, resolveAdminPage, type AdminListQueryOptions } from "./shared";

type ListAdminUsersOptions = AdminListQueryOptions & {
  identityProvider?: string;
};

export async function listAdminUsers(
  accessToken: string,
  options: ListAdminUsersOptions = {},
): Promise<PagePayload<AdminUserDTO>> {
  const { page, pageSize } = resolveAdminPage(options);
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  if (options.query?.trim()) {
    params.set("q", options.query.trim());
  }
  if (options.identityProvider?.trim()) {
    params.set("identity_provider", options.identityProvider.trim());
  }
  const data = await authedRequest<PagePayload<AdminUserDTO>>(
    `/api/v1/admin/users?${params.toString()}`,
    { accessToken },
    true,
  );

  return normalizeAdminPagePayload(data);
}

export async function createAdminUser(
  accessToken: string,
  payload: CreateAdminUserRequest,
): Promise<AdminUserData> {
  return authedRequest<AdminUserData>(
    "/api/v1/admin/users",
    {
      method: "POST",
      accessToken,
      body: payload,
    },
    true,
  );
}

export async function patchAdminUser(
  accessToken: string,
  userID: number,
  payload: PatchAdminUserRequest,
): Promise<AdminUserData> {
  return authedRequest<AdminUserData>(
    `/api/v1/admin/users/${userID}`,
    {
      method: "PATCH",
      accessToken,
      body: payload,
    },
    true,
  );
}

export async function updateAdminUserStatus(
  accessToken: string,
  userID: number,
  payload: UpdateAdminUserStatusRequest,
): Promise<AdminUserData> {
  return authedRequest<AdminUserData>(
    `/api/v1/admin/users/${userID}/status`,
    {
      method: "PATCH",
      accessToken,
      body: payload,
    },
    true,
  );
}

export async function resetAdminUserPassword(
  accessToken: string,
  userID: number,
  payload: ResetAdminUserPasswordRequest,
): Promise<ResetAdminUserPasswordData> {
  return authedRequest<ResetAdminUserPasswordData>(
    `/api/v1/admin/users/${userID}/reset-password`,
    {
      method: "POST",
      accessToken,
      body: payload,
    },
    true,
  );
}

export async function resetAdminUserTwoFactor(
  accessToken: string,
  userID: number,
): Promise<ResetAdminUserTwoFactorData> {
  return authedRequest<ResetAdminUserTwoFactorData>(
    `/api/v1/admin/users/${userID}/reset-2fa`,
    {
      method: "POST",
      accessToken,
    },
    true,
  );
}

export async function revokeAdminUserSessions(
  accessToken: string,
  userID: number,
): Promise<RevokeAdminUserSessionsData> {
  return authedRequest<RevokeAdminUserSessionsData>(
    `/api/v1/admin/users/${userID}/revoke-sessions`,
    {
      method: "POST",
      accessToken,
    },
    true,
  );
}

export async function deleteAdminUser(
  accessToken: string,
  userID: number,
): Promise<DeleteAdminUserData> {
  return authedRequest<DeleteAdminUserData>(
    `/api/v1/admin/users/${userID}`,
    {
      method: "DELETE",
      accessToken,
    },
    true,
  );
}

export async function importRosterUsers(
  accessToken: string,
  payload: AdminRosterImportRequest,
): Promise<AdminRosterImportResult> {
  const formData = new FormData();
  formData.append("file", payload.file);
  if (payload.dryRun) {
    formData.append("dryRun", "true");
  }
  return authedRequest<AdminRosterImportResult>(
    "/api/v1/admin/users/import/roster",
    {
      method: "POST",
      accessToken,
      body: formData,
    },
    true,
  );
}
