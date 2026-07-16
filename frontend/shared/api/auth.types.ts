import type {
  ActiveSessionListResponse,
  ActiveSessionResponse,
  AuthUserIdentityProviderSummaryResponse,
  AuthUserResponse,
  DeleteAccountRequest,
  EmailRegistrationStartResponse,
  EmailVerificationStartResponse,
  IdentityProviderResponse,
  LoginOptionsResponse,
  LoginResponse,
  LogoutResponse,
  PasswordResetCompleteResponse,
  PasswordResetStartResponse,
  PatchMeRequest,
  UpdateCurrentSessionLocationRequest,
} from "@deeix/api-contract";

export type UserIdentityProviderSummaryDTO = Required<AuthUserIdentityProviderSummaryResponse>;

export type UserDTO = Omit<
  Required<AuthUserResponse>,
  | "emailBootstrapUsedAt"
  | "emailVerifiedAt"
  | "identityProviders"
  | "lastActiveAt"
  | "lastLoginAt"
  | "onboardingCompletedAt"
  | "passwordSetAt"
  | "phoneVerifiedAt"
  | "subscriptionExpiresAt"
  | "subscriptionPlanID"
  | "usernameChangedAt"
> & {
  onboardingCompletedAt: string | null;
  emailVerifiedAt: string | null;
  emailBootstrapUsedAt: string | null;
  phoneVerifiedAt: string | null;
  usernameChangedAt: string | null;
  passwordSetAt: string | null;
  lastLoginAt: string | null;
  lastActiveAt: string | null;
  subscriptionPlanID: number | null;
  subscriptionExpiresAt: string | null;
  billingAccountCurrency: string;
  billingBalanceNanousd: number;
  billingBalanceUSD: number;
  billingAccountStatus: string;
  identityProviders: UserIdentityProviderSummaryDTO[];
};

export type LoginData = Omit<Required<LoginResponse>, "twoFactorChallengeToken" | "user" | "verificationMethods"> & {
  user: UserDTO;
  twoFactorChallengeToken?: string;
  verificationMethods?: SecurityVerificationMethod[];
};

export type TwoFactorStatusData = {
  available: boolean;
  totpEnabled: boolean;
  required: boolean;
  recoveryCount: number;
  enabledAt: string | null;
};

export type TwoFactorSetupStartData = {
  secret: string;
  otpauthURL: string;
  expiresAt: string;
};

export type TwoFactorRecoveryCodesData = {
  recoveryCodes: string[];
  status: TwoFactorStatusData;
};

export type TwoFactorDisableData = {
  disabled: boolean;
};

export type SecurityVerificationMethod = "none" | "two_factor" | "email";

export type EmailRegistrationStartData = Required<EmailRegistrationStartResponse> & {
  debugCode?: string;
};

export type PasswordResetStartData = Required<PasswordResetStartResponse>;

export type PasswordResetCompleteData = Required<PasswordResetCompleteResponse>;

export type PasswordChangeVerificationStartData = Omit<Required<EmailVerificationStartResponse>, "availableMethods" | "verificationMethod"> & {
  verificationMethod: SecurityVerificationMethod;
  availableMethods: SecurityVerificationMethod[];
  debugCode?: string;
};

export type LoginPageSettings = {
  defaultNextPath: string;
};

export type IdentityProviderDTO = Omit<Required<IdentityProviderResponse>, "logoURL" | "type"> & {
  type: "oidc" | "oauth2";
  logoURL?: string;
  defaultRole: "user" | "admin" | "superadmin";
};

export type UserIdentityDTO = {
  id: number;
  providerID: number;
  providerType: "oidc" | "oauth2" | string;
  providerName: string;
  providerSlug: string;
  providerLogoURL?: string;
  providerDisplayName: string;
  email: string;
  emailVerified: boolean;
  linkedAt: string;
  lastLoginAt: string | null;
};

export type UserIdentityListData = {
  results: UserIdentityDTO[];
};

export type UserIdentityData = {
  identity: UserIdentityDTO;
};

export type LoginOptionsData = Omit<Required<LoginOptionsResponse>, "providers"> & {
  providers: IdentityProviderDTO[];
};

export type MeData = {
  user: UserDTO;
};

export type PatchMePayload = PatchMeRequest;

export type PatchUsernamePayload = {
  username: string;
};

export type ChangePasswordPayload = {
  currentPassword?: string;
  newPassword: string;
  verificationMethod?: SecurityVerificationMethod;
  code?: string;
};

export type ChangePasswordData = {
  changed: boolean;
};

export type CompleteOnboardingPayload = {
  newPassword?: string;
};

export type EmailVerificationStartData = Omit<Required<EmailVerificationStartResponse>, "availableMethods" | "verificationMethod"> & {
  verificationMethod: SecurityVerificationMethod;
  availableMethods: SecurityVerificationMethod[];
  debugCode?: string;
};

export type EmailBootstrapCompletePayload = {
  email: string;
  code: string;
};

export type EmailChangeCompletePayload = {
  email: string;
  currentVerificationMethod?: SecurityVerificationMethod;
  currentCode: string;
  newCode: string;
};

export type DeleteAccountPayload = Omit<DeleteAccountRequest, "verificationMethod"> & {
  verificationMethod: SecurityVerificationMethod;
};

export type LogoutData = Required<LogoutResponse>;

export type ActiveSessionDTO = Omit<
  Required<ActiveSessionResponse>,
  | "ipLatitude"
  | "ipLongitude"
  | "lastSeenAt"
  | "preciseAccuracyMeters"
  | "preciseLatitude"
  | "preciseLocatedAt"
  | "preciseLongitude"
> & {
  ipLatitude: number | null;
  ipLongitude: number | null;
  preciseLatitude: number | null;
  preciseLongitude: number | null;
  preciseAccuracyMeters: number | null;
  preciseLocatedAt: string | null;
  lastSeenAt: string | null;
};

export type ActiveSessionListData = Omit<Required<ActiveSessionListResponse>, "results"> & {
  results: ActiveSessionDTO[];
};

export type UpdateCurrentSessionLocationPayload = UpdateCurrentSessionLocationRequest;
