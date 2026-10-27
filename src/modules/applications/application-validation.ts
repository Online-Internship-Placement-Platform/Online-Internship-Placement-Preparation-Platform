import { APPLICATION_STATUSES, type ApplicationStatus } from "@/lib/placement-data";

export type AdminApplicationFilters = {
  internshipId: string;
  studentName: string;
  status: ApplicationStatus | "";
};

export function parseApplicationId(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function parseApplicationStatus(value: unknown): ApplicationStatus | null {
  if (typeof value !== "string") return null;
  const status = value.trim();
  return APPLICATION_STATUSES.find((candidate) => candidate === status) ?? null;
}

export function parseAdminApplicationFilters(searchParams: URLSearchParams):
  | { filters: AdminApplicationFilters }
  | { error: string } {
  const internshipId = searchParams.get("internshipId")?.trim() ?? "";
  const studentName = searchParams.get("studentName")?.trim() ?? "";
  const requestedStatus = searchParams.get("status")?.trim() ?? "";
  const parsedStatus = parseApplicationStatus(requestedStatus);

  if (studentName.length > 100) return { error: "Student name search must be 100 characters or fewer." };
  if (requestedStatus && !parsedStatus) {
    return { error: "Choose a valid application status." };
  }

  return {
    filters: {
      internshipId,
      studentName,
      status: parsedStatus ?? "",
    },
  };
}
