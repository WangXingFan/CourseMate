import type { ClassroomExportRequest } from "@deeix/api-contract";
import { authedFetch } from "@/shared/api/authed-client";
import { pathParam } from "@/shared/api/http-client";

export type { ClassroomExportRequest };

export async function exportClassroom(accessToken: string, id: string, options: ClassroomExportRequest, signal?: AbortSignal): Promise<Blob> {
  const response = await authedFetch(`/api/v1/classrooms/${pathParam(id)}/exports`, {
    accessToken, method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(options), signal,
  });
  return response.blob();
}
