import type {
  AuditLogResponse,
  AuthEventResponse,
  ConversationEventResponse,
  CreateUserRequest,
  DeleteUserResponse,
  ImportOpenWebUIUsersRequest as ContractImportOpenWebUIUsersRequest,
  ImportOpenWebUIUsersResponse,
  PatchUserRequest,
  PaymentOrderResponse,
  ResetUserPasswordRequest,
  ResetUserPasswordResponse,
  RevokeUserSessionsResponse,
  SystemEventResponse,
  UpdateUserStatusRequest,
  UserDataResponse,
  UsageLogResponse,
} from "@deeix/api-contract";
import type { PagePayload } from "@/shared/api/common.types";
import type { UserDTO } from "@/shared/api/auth.types";

export type AdminUserStatus = "pending_activation" | "active" | "locked" | "suspended" | "deactivated";
export type AdminUserRole = "user" | "admin" | "superadmin";

export type CreateAdminUserRequest = CreateUserRequest;

export type UpdateAdminUserStatusRequest = Omit<UpdateUserStatusRequest, "status"> & {
  status: AdminUserStatus;
};

export type PatchAdminUserRequest = Omit<PatchUserRequest, "role" | "status"> & {
  role?: AdminUserRole;
  status?: AdminUserStatus;
};

export type ResetAdminUserPasswordRequest = ResetUserPasswordRequest;

export type ImportOpenWebUIUsersRequest = ContractImportOpenWebUIUsersRequest;

export type AdminUserData = Omit<Required<UserDataResponse>, "user"> & {
  user: UserDTO;
};

export type RevokeAdminUserSessionsData = Required<RevokeUserSessionsResponse>;

export type ResetAdminUserPasswordData = Required<ResetUserPasswordResponse>;

export type ResetAdminUserTwoFactorData = {
  reset: boolean;
};

export type DeleteAdminUserData = Required<DeleteUserResponse>;

export type ImportOpenWebUIUsersData = Omit<Required<ImportOpenWebUIUsersResponse>, "dedupeField" | "source"> & {
  source: "openwebui";
  dedupeField: "email";
};

export type AdminUserAuthEventDTO = Required<AuthEventResponse>;

export type AdminAuditLogDTO = Required<AuditLogResponse>;

export type AdminSystemEventDTO = Required<SystemEventResponse>;

export type AdminUsageLogDTO = Required<Omit<UsageLogResponse, "billingAt">>;

export type AdminPaymentOrderDTO = Omit<Required<PaymentOrderResponse>, "expiredAt" | "paidAt"> & {
  paidAt?: string | null;
  expiredAt?: string | null;
};

export type AdminConversationEventDTO = Omit<Required<ConversationEventResponse>, "endedAt"> & {
  endedAt?: string | null;
};

export type ListAdminUsersResult = PagePayload<UserDTO>;
export type ListAdminUserAuthEventsResult = PagePayload<AdminUserAuthEventDTO>;
export type ListAdminAuditLogsResult = PagePayload<AdminAuditLogDTO>;
export type ListAdminSystemEventsResult = PagePayload<AdminSystemEventDTO>;
export type ListAdminUsageLogsResult = PagePayload<AdminUsageLogDTO>;
export type ListAdminPaymentOrdersResult = PagePayload<AdminPaymentOrderDTO>;
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
