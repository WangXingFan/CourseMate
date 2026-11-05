import type {
  AttendanceCreateRequest,
  AttendanceCorrectionRequest,
  AttendanceListResponse,
  AttendanceSessionResponse,
  AttendanceReportResponse,
  AttendanceRecordResponse,
  AttendanceStudentListResponse,
  AttendanceMutationResponse,
} from "@deeix/api-contract";
import { authedRequest } from "@/shared/api/authed-client";
import { pathParam } from "@/shared/api/http-client";

export function listAttendance(accessToken: string, classroomID: string, signal?: AbortSignal) {
  return authedRequest<AttendanceListResponse>(
    `/api/v1/classrooms/${pathParam(classroomID)}/attendance`,
    { accessToken, signal },
    true,
  );
}
export function createAttendance(accessToken: string, classroomID: string, body: AttendanceCreateRequest) {
  return authedRequest<AttendanceSessionResponse>(
    `/api/v1/classrooms/${pathParam(classroomID)}/attendance`,
    { accessToken, method: "POST", body },
    true,
  );
}
export function getAttendanceReport(accessToken: string, id: string, signal?: AbortSignal) {
  return authedRequest<AttendanceReportResponse>(
    `/api/v1/attendance/${pathParam(id)}`,
    { accessToken, signal },
    true,
  );
}
export function closeAttendance(accessToken: string, id: string) {
  return authedRequest<AttendanceMutationResponse>(
    `/api/v1/attendance/${pathParam(id)}/close`,
    { accessToken, method: "POST" },
    true,
  );
}
export function correctAttendance(
  accessToken: string,
  id: string,
  studentID: string,
  body: AttendanceCorrectionRequest,
) {
  return authedRequest<AttendanceRecordResponse>(
    `/api/v1/attendance/${pathParam(id)}/students/${pathParam(studentID)}`,
    { accessToken, method: "PUT", body },
    true,
  );
}
export function listStudentAttendance(accessToken: string, signal?: AbortSignal) {
  return authedRequest<AttendanceStudentListResponse>(
    "/api/v1/student/attendance",
    { accessToken, signal },
    true,
  );
}
export function checkInAttendance(accessToken: string, id: string, code: string) {
  return authedRequest<AttendanceRecordResponse>(
    `/api/v1/student/attendance/${pathParam(id)}/check-in`,
    { accessToken, method: "POST", body: { code } },
    true,
  );
}
