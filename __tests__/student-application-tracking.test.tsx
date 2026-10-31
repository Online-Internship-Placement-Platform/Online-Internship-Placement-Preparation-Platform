import type { ReactNode } from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getServerSession = vi.hoisted(() => vi.fn());
const applicationFindMany = vi.hoisted(() => vi.fn());

vi.mock("@/lib/server-session", () => ({ getServerSession }));
vi.mock("@/lib/prisma", () => ({ prisma: { application: { findMany: applicationFindMany } } }));
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

import ApplicationsView from "@/components/applications-view";
import { GET } from "@/app/api/student/applications/route";

const studentId = 73;
const now = new Date("2030-06-01T12:00:00.000Z");

const trackingRows = [
  {
    id: 101,
    status: "Pending",
    appliedAt: new Date("2030-05-20T10:00:00.000Z"),
    resumeStorageKey: null,
    internship: {
      id: "internship-pending", company: "Northstar Labs", role: "Frontend Intern",
      applicationDeadline: new Date("2030-06-30T00:00:00.000Z"), published: true, acceptingApplications: true,
    },
  },
  {
    id: 102,
    status: "Shortlisted",
    appliedAt: new Date("2030-05-18T10:00:00.000Z"),
    resumeStorageKey: "resume-102",
    internship: {
      id: "internship-shortlisted", company: "Aster Finance", role: "Data Analyst Intern",
      applicationDeadline: new Date("2030-06-05T00:00:00.000Z"), published: true, acceptingApplications: true,
    },
  },
  {
    id: 103,
    status: "Rejected",
    appliedAt: new Date("2030-05-16T10:00:00.000Z"),
    resumeStorageKey: null,
    internship: {
      id: "internship-rejected", company: "Studio Kora", role: "Product Design Intern",
      applicationDeadline: new Date("2030-05-31T00:00:00.000Z"), published: true, acceptingApplications: true,
    },
  },
  {
    id: 104,
    status: "Under review",
    appliedAt: new Date("2030-05-14T10:00:00.000Z"),
    resumeStorageKey: null,
    internship: {
      id: "internship-review", company: "Cloudline Systems", role: "Backend Developer Intern",
      applicationDeadline: new Date("2030-06-10T00:00:00.000Z"), published: true, acceptingApplications: false,
    },
  },
];

const displayApplications = [
  { id: 101, status: "Pending", appliedAt: "2030-05-20T10:00:00.000Z", resumeUrl: null, deadlineStatus: "Open", deadlineMessage: "29 days left", internship: { id: "internship-pending", company: "Northstar Labs", role: "Frontend Intern", applicationDeadline: "2030-06-30" } },
  { id: 102, status: "Shortlisted", appliedAt: "2030-05-18T10:00:00.000Z", resumeUrl: "/resume/102", deadlineStatus: "Closing soon", deadlineMessage: "4 days left", internship: { id: "internship-shortlisted", company: "Aster Finance", role: "Data Analyst Intern", applicationDeadline: "2030-06-05" } },
  { id: 103, status: "Rejected", appliedAt: "2030-05-16T10:00:00.000Z", resumeUrl: null, deadlineStatus: "Closed", deadlineMessage: "Deadline passed", internship: { id: "internship-rejected", company: "Studio Kora", role: "Product Design Intern", applicationDeadline: "2030-05-31" } },
  { id: 104, status: "Under review", appliedAt: "2030-05-14T10:00:00.000Z", resumeUrl: null, deadlineStatus: "Closed", deadlineMessage: "Applications closed", internship: { id: "internship-review", company: "Cloudline Systems", role: "Backend Developer Intern", applicationDeadline: "2030-06-10" } },
];

function formatDeadline(date: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

describe("GET /api/student/applications", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ userId: studentId, role: "student" });
    applicationFindMany.mockResolvedValue(trackingRows);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("loads only the signed-in student's applications with their statuses and deadline details", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(applicationFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { studentId } }));
    expect(body.applications).toHaveLength(4);
    expect(body.applications).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 101, status: "Pending", deadlineStatus: "Open", deadlineMessage: "29 days left", internship: expect.objectContaining({ applicationDeadline: "2030-06-30" }) }),
      expect.objectContaining({ id: 102, status: "Shortlisted", deadlineStatus: "Closing soon", deadlineMessage: "4 days left", internship: expect.objectContaining({ applicationDeadline: "2030-06-05" }) }),
      expect.objectContaining({ id: 103, status: "Rejected", deadlineStatus: "Closed", deadlineMessage: "Deadline passed", internship: expect.objectContaining({ applicationDeadline: "2030-05-31" }) }),
      expect.objectContaining({ id: 104, status: "Under review", deadlineStatus: "Closed", deadlineMessage: "Applications closed", internship: expect.objectContaining({ applicationDeadline: "2030-06-10" }) }),
    ]));
  });

  it("returns no applications for a student with an empty application history", async () => {
    applicationFindMany.mockResolvedValue([]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ applications: [] });
    expect(applicationFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { studentId } }));
  });
});

describe("ApplicationsView", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows each application's current status and formatted internship deadline", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ applications: displayApplications }),
    } as Response);

    render(<ApplicationsView />);

    for (const application of displayApplications) {
      const row = await screen.findByRole("row", { name: new RegExp(application.internship.role) });
      expect(within(row).getByText(application.status, { exact: true })).toBeDefined();
      expect(within(row).getByText(application.deadlineStatus, { exact: true })).toBeDefined();
      expect(within(row).getByText(new RegExp(`${formatDeadline(application.internship.applicationDeadline)}.*${application.deadlineMessage}`))).toBeDefined();
      expect(within(row).getByText(application.internship.company)).toBeDefined();
    }
  });

  it("shows the empty state when the student has no applications", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ applications: [] }),
    } as Response);

    render(<ApplicationsView />);

    expect(await screen.findByRole("link", { name: "Browse internships" })).toBeDefined();
    expect(screen.queryByRole("table")).toBeNull();
  });
});
