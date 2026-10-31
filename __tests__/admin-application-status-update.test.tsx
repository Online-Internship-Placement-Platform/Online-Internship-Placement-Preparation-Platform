import type { ReactNode } from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { APPLICATION_STATUSES } from "@/lib/placement-data";

const getServerSession = vi.hoisted(() => vi.fn());
const applicationUpdate = vi.hoisted(() => vi.fn());
const applicationFindMany = vi.hoisted(() => vi.fn());

vi.mock("@/lib/server-session", () => ({ getServerSession }));
vi.mock("@/lib/prisma", () => ({
  prisma: { application: { update: applicationUpdate, findMany: applicationFindMany } },
}));
vi.mock("@/lib/private-resume-storage", () => ({
  deleteResume: vi.fn(),
  storeResume: vi.fn(),
  validateResume: vi.fn(),
}));
vi.mock("@/components/app-shell", () => ({
  AppShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
  StatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}));
vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

import { PATCH } from "@/app/api/admin/applications/[applicationId]/route";
import { GET as getStudentApplications } from "@/app/api/student/applications/route";
import ApplicationsView from "@/components/applications-view";

const adminId = 12;
const studentId = 73;
const application = {
  id: 501,
  status: "Pending",
  appliedAt: new Date("2030-05-20T10:00:00.000Z"),
  resumeStorageKey: null as string | null,
  internship: {
    id: "tc13-internship",
    company: "Example Co",
    role: "Software Intern",
    applicationDeadline: new Date("2030-06-30T00:00:00.000Z"),
    published: true,
    acceptingApplications: true,
  },
};

function patchRequest(status: unknown, id = application.id) {
  return new Request(`http://localhost/api/admin/applications/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
}

function setupPrismaMocks() {
  applicationUpdate.mockImplementation(async ({ where, data }: { where: { id: number }; data: { status: string } }) => {
    if (where.id !== application.id) throw { code: "P2025" };
    application.status = data.status;
    return { id: application.id, status: application.status };
  });
  applicationFindMany.mockImplementation(async ({ where }: { where: { studentId: number } }) => (
    where.studentId === studentId
      ? [{ ...application, internship: { ...application.internship } }]
      : []
  ));
}

describe("PATCH /api/admin/applications/[applicationId] status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    application.status = "Pending";
    getServerSession.mockResolvedValue({ userId: adminId, role: "admin" });
    setupPrismaMocks();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it.each(APPLICATION_STATUSES)("updates an application to the supported status %s", async (status) => {
    application.status = status === "Pending" ? "Shortlisted" : "Pending";

    const response = await PATCH(patchRequest(status), {
      params: Promise.resolve({ applicationId: String(application.id) }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(applicationUpdate).toHaveBeenCalledWith({
      where: { id: application.id },
      data: { status },
      select: { id: true, status: true },
    });
    expect(body.application).toEqual({ id: application.id, status });
    expect(application.status).toBe(status);
  });

  it("rejects Selected because it is not a supported application status", async () => {
    const response = await PATCH(patchRequest("Selected"), {
      params: Promise.resolve({ applicationId: String(application.id) }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Choose a valid application status." });
    expect(applicationUpdate).not.toHaveBeenCalled();
  });

  it("returns not found when the application does not exist", async () => {
    const response = await PATCH(patchRequest("Rejected", 999), {
      params: Promise.resolve({ applicationId: "999" }),
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Application not found." });
    expect(applicationUpdate).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 999 } }));
  });

  it("returns the saved status in the student's application tracker", async () => {
    const updateResponse = await PATCH(patchRequest("Shortlisted"), {
      params: Promise.resolve({ applicationId: String(application.id) }),
    });
    expect(updateResponse.status).toBe(200);

    getServerSession.mockResolvedValue({ userId: studentId, role: "student" });
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2030-06-01T12:00:00.000Z"));
    const trackerResponse = await getStudentApplications();
    const trackerBody = await trackerResponse.json();
    expect(trackerResponse.status).toBe(200);
    expect(applicationFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { studentId } }));
    expect(trackerBody.applications[0].status).toBe("Shortlisted");

    vi.useRealTimers();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => trackerBody } as Response));
    render(<ApplicationsView />);

    const applicationHistory = await screen.findByRole("region", { name: "Application history" });
    expect(within(applicationHistory).getByText("Shortlisted", { exact: true })).toBeDefined();
  });
});
