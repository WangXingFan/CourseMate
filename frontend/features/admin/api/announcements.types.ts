import type {
  AnnouncementDataResponse,
  AnnouncementDeleteDataResponse,
  CreateAnnouncementRequest,
  PatchAnnouncementRequestDoc,
} from "@deeix/api-contract";
import type { PagePayload } from "@/shared/api/common.types";
import type { AnnouncementDTO } from "@/shared/api/announcements.types";

export type AdminAnnouncementDTO = AnnouncementDTO;

export type AdminAnnouncementPage = PagePayload<AdminAnnouncementDTO>;

export type CreateAdminAnnouncementRequest = Omit<CreateAnnouncementRequest, "expiresAt" | "startsAt"> & {
  startsAt?: string | null;
  expiresAt?: string | null;
};

export type UpdateAdminAnnouncementRequest = Omit<PatchAnnouncementRequestDoc, "expiresAt" | "startsAt"> & {
  startsAt?: string | null;
  expiresAt?: string | null;
};

export type AdminAnnouncementData = Omit<Required<AnnouncementDataResponse>, "announcement"> & {
  announcement: AdminAnnouncementDTO;
};

export type AdminAnnouncementDeleteData = Required<AnnouncementDeleteDataResponse>;
