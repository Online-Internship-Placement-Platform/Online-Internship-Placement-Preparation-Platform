import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getServerSession, userCount, internshipCount, applicationCount, findApplications, findInternships } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  userCount: vi.fn(),
  internshipCount: vi.fn(),
  applicationCount: vi.fn(),
  findApplications: vi.fn(),
  findInternships: vi.fn(),
}));

vi.mock("next/cache", () => ({ io: async () => undefined }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => { throw new Error(`redirect:${path}`); },
}));
vi.mock("@/lib/server-session", () => ({ getServerSession }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { count: userCount },
    internship: { count: internshipCount, findMany: findInternships },
    application: { count: applicationCount, findMany: findApplications },
  },
}));
vi.mock("@/components/app-shell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SectionHeading: ({ title, action }: { title: string; action?: React.ReactNode }) => <div><h2>{title}</h2>{action}</div>,
  StatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}));

import AdminDashboardView from "@/components/admin-dashboard-view";

describe("administrative dashboard", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    userCount.mockResolvedValue(2);
    internshipCount.mockResolvedValue(5);
    applicationCount.mockResolvedValue(1);
    findApplications.mockResolvedValue([{
      id: 1,
      studentId: 7,
      student: { name: "Aarav Mehta" },
      internship: { role: "Engineering Intern", company: "Example Labs" },
      appliedAt: new Date("2026-10-30T12:00:00Z"),
      status: "Pending",
    }]);
    findInternships.mockResolvedValue([{
      id: "internship-1",
      company: "Example Labs",
      role: "Engineering Intern",
      applicationDeadline: new Date("2026-11-10T00:00:00Z"),
    }]);
  });

  afterEach(cleanup);

  it.each(["admin", "super-admin"] as const)("loads database-backed dashboard data for %s", async (role) => {
    getServerSession.mockResolvedValue({ userId: 1, role });
    render(await AdminDashboardView({ role }));

    expect(screen.getByText("Total students").parentElement?.textContent).toContain("2");
    expect(screen.getByText("Active internships").parentElement?.textContent).toContain("5");
    expect(screen.getByText("Total applications").parentElement?.textContent).toContain("1");
    expect(screen.getByText("Pending decisions").parentElement?.textContent).toContain("1");
    expect(screen.getByText("Aarav Mehta")).toBeTruthy();
    expect(screen.getAllByText("Engineering Intern")).toHaveLength(2);
    expect(screen.getAllByText("Example Labs")).toHaveLength(2);
    expect(userCount).toHaveBeenCalledWith({ where: { role: "STUDENT" } });
    expect(applicationCount).toHaveBeenCalledTimes(2);
    expect(findApplications).toHaveBeenCalledWith(expect.objectContaining({
      orderBy: [{ appliedAt: "desc" }, { id: "desc" }],
      take: 5,
    }));
  });

  it("redirects users whose session role does not match the dashboard route", async () => {
    getServerSession.mockResolvedValue({ userId: 1, role: "student" });
    await expect(AdminDashboardView({ role: "admin" })).rejects.toThrow("redirect:/login");
    expect(userCount).not.toHaveBeenCalled();
  });

  it("shows empty states when the database has no applications or eligible deadlines", async () => {
    getServerSession.mockResolvedValue({ userId: 1, role: "admin" });
    userCount.mockResolvedValue(0);
    internshipCount.mockResolvedValue(0);
    applicationCount.mockResolvedValue(0);
    findApplications.mockResolvedValue([]);
    findInternships.mockResolvedValue([]);
    render(await AdminDashboardView({ role: "admin" }));

    for (const label of ["Total students", "Active internships", "Total applications", "Pending decisions"]) {
      expect(screen.getByText(label).parentElement?.textContent).toContain("0");
    }
    expect(screen.getByText("No applications have been submitted yet.")).toBeTruthy();
    expect(screen.getByText("No published internships have an upcoming application deadline.")).toBeTruthy();
  });
});
