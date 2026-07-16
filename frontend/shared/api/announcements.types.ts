import type { AnnouncementResponse } from "@deeix/api-contract";

type RequiredAnnouncementResponse = Required<AnnouncementResponse>;

export type AnnouncementDTO = Omit<RequiredAnnouncementResponse, "closedAt" | "expiresAt" | "startsAt"> & {
  startsAt: string | null;
  expiresAt: string | null;
  closedAt: string | null;
};
