import type {
  AdminUserResponse,
  AuditLogResponse,
  AuthEventResponse,
  ConversationEventResponse,
  CreateUserRequest,
  DeleteUserResponse,
  ImportRosterUsersCredentialResponse,
  ImportRosterUsersResponse,
  ImportRosterUsersRowResponse,
  PatchUserRequest,
  ResetUserPasswordRequest,
  ResetUserPasswordResponse,
  RevokeUserSessionsResponse,
  UpdateUserStatusRequest,
  UserDataResponse,
} from "@deeix/api-contract";
import type { PagePayload } from "@/shared/api/common-types";
import type { ADMIN_USER_ROLES, ADMIN_USER_STATUSES } from "@/features/admin/model/admin-unions";

export type AdminUserStatus = (typeof ADMIN_USER_STATUSES)[number];
export type AdminUserRole = (typeof ADMIN_USER_ROLES)[number];

export type AdminUserDTO = AdminUserResponse;

export type CreateAdminUserRequest = CreateUserRequest;

export type UpdateAdminUserStatusRequest = Omit<UpdateUserStatusRequest, "status"> & {
  status: AdminUserStatus;
};

export type PatchAdminUserRequest = Omit<PatchUserRequest, "role" | "status"> & {
  role?: AdminUserRole;
  status?: AdminUserStatus;
};

export type ResetAdminUserPasswordRequest = ResetUserPasswordRequest;

// Client-side roster import payload: the CSV file plus an optional preview flag.
export type AdminRosterImportRequest = {
  file: File;
  dryRun?: boolean;
};

export type AdminUserData = Omit<UserDataResponse, "user"> & {
  user: AdminUserDTO;
};

export type RevokeAdminUserSessionsData = RevokeUserSessionsResponse;

export type ResetAdminUserPasswordData = ResetUserPasswordResponse;

export type ResetAdminUserTwoFactorData = {
  reset: boolean;
};

export type DeleteAdminUserData = DeleteUserResponse;

export type AdminRosterImportRowStatus =
  | "ready"
  | "imported"
  | "skipped_existing"
  | "duplicate_in_file"
  | "invalid"
  | "conflict"
  | "failed";

export type AdminRosterImportRow = Omit<ImportRosterUsersRowResponse, "status"> & {
  status: AdminRosterImportRowStatus;
};

export type AdminRosterImportCredential = ImportRosterUsersCredentialResponse;

// Contracts report credentials as optional, so a successful import of zero rows
// is indistinguishable from a preview; callers keep the phase they requested.
export type AdminRosterImportResult = Omit<ImportRosterUsersResponse, "rows"> & {
  rows: AdminRosterImportRow[];
};

export type AdminUserAuthEventDTO = AuthEventResponse;

export type AdminAuditLogDTO = AuditLogResponse;

export type AdminConversationEventDTO = ConversationEventResponse;

export type ListAdminUsersResult = PagePayload<AdminUserDTO>;
export type ListAdminUserAuthEventsResult = PagePayload<AdminUserAuthEventDTO>;
export type ListAdminAuditLogsResult = PagePayload<AdminAuditLogDTO>;
export type ListAdminConversationEventsResult = PagePayload<AdminConversationEventDTO>;

export type TikaRuntimeStatus =
  | "running"
  | "stopped"
  | "unhealthy"
  | "failed"
  | "unavailable"
  | "unconfigured"
  | "created"
  | "exited"
  | "paused"
  | "restarting";

export type AdminServiceRuntimeView = {
  source: "external" | "managed";
  baseURL: string;
  containerName: string;
  image: string;
  network: string;
  status: TikaRuntimeStatus | string;
  reachable: boolean;
  message: string;
};

export type AdminTikaRuntimeView = AdminServiceRuntimeView;
export type AdminDoclingRuntimeView = AdminServiceRuntimeView;
export type AdminTesseractRuntimeView = AdminServiceRuntimeView;
export type AdminRapidOCRRuntimeView = AdminServiceRuntimeView;
export type AdminMinerURuntimeView = AdminServiceRuntimeView;
export type AdminEmbeddingRuntimeView = AdminServiceRuntimeView;
