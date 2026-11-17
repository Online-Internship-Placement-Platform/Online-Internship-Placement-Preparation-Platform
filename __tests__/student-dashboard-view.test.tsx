import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connection: vi.fn(), getServerSession: vi.fn(), findUser: vi.fn(), findApplications: vi.fn(), findInternships: vi.fn(),
}));
vi.mock("next/server", () => ({ connection: mocks.connection }));
vi.mock("next/link", () => ({ default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a> }));
vi.mock("@/lib/server-session", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  user: { findUnique: mocks.findUser }, application: { findMany: mocks.findApplications }, internship: { findMany: mocks.findInternships },
} }));
vi.mock("@/components/app-shell", () => ({
  AppShell: ({ children, title }: { children: React.ReactNode; title: string }) => <main><h1>{title}</h1>{children}</main>,
  SectionHeading: ({ title }: { title: string }) => <h2>{title}</h2>,
  StatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}));

import StudentDashboard from "@/components/dashboard-view";

const student = {
  id: 7, role: "STUDENT", name: "Jordan Taylor", email: "jordan@example.test",
  studentProfile: { branch: "CS", cgpa: 8.2, yearOfStudy: 3, skills: ["TypeScript", null, 3] },
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.connection.mockResolvedValue(undefined);
  mocks.getServerSession.mockResolvedValue({ userId: 7, role: "student" });
  mocks.findUser.mockResolvedValue(student);
  mocks.findApplications.mockResolvedValue([
    { id: 1, status: "Shortlisted", appliedAt: new Date("2026-10-30T12:00:00Z"), internship: { role: "Engineer Intern", company: "Example Labs" } },
    { id: 2, status: "Pending", appliedAt: new Date("2026-10-29T12:00:00Z"), internship: { role: "Data Intern", company: "Data Co" } },
  ]);
  mocks.findInternships.mockResolvedValue([
    { id: "intern-1", role: "Engineer Intern", company: "Example Labs", applicationDeadline: new Date("2026-11-10T00:00:00Z"), requiredSkills: "TypeScript, SQL, ," },
  ]);
});
afterEach(cleanup);

describe("student dashboard", () => {
  it("shows profile completion, recent applications, deadlines, and skill chips", async () => {
    render(await StudentDashboard());
    expect(screen.getByRole("heading", { name: "Good morning, Jordan" })).toBeTruthy();
    expect(screen.getByText("Profile completion").closest("a")?.textContent).toContain("100%");
    expect(screen.getByText("1 shortlisted")).toBeTruthy();
    expect(screen.getAllByText("Engineer Intern")).toHaveLength(2);
    expect(screen.getByText("TypeScript")).toBeTruthy();
    expect(screen.getByText("SQL")).toBeTruthy();
    expect(mocks.findUser).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 7 } }));
  });

  it("shows an authentication alert for a missing or mismatched student session", async () => {
    mocks.getServerSession.mockResolvedValueOnce(null);
    const noSession = await StudentDashboard();
    render(noSession);
    expect(screen.getByRole("alert").textContent).toContain("student session could not be verified");
    cleanup();
    mocks.getServerSession.mockResolvedValueOnce({ userId: 3, role: "admin" });
    render(await StudentDashboard());
    expect(screen.getByRole("alert").textContent).toContain("student session could not be verified");
    expect(mocks.findUser).not.toHaveBeenCalled();
  });

  it("handles database failure and missing or mismatched student records", async () => {
    const logger = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.findApplications.mockRejectedValueOnce(new Error("database unavailable"));
    render(await StudentDashboard());
    expect(screen.getByRole("alert").textContent).toContain("temporarily unavailable");
    expect(logger).toHaveBeenCalledOnce();
    cleanup();

    mocks.findUser.mockResolvedValueOnce(null);
    render(await StudentDashboard());
    expect(screen.getByRole("alert").textContent).toContain("temporarily unavailable");
    cleanup();

    mocks.findUser.mockResolvedValueOnce({ ...student, role: "ADMIN" });
    render(await StudentDashboard());
    expect(screen.getByRole("alert").textContent).toContain("temporarily unavailable");
    cleanup();

    mocks.findUser.mockResolvedValueOnce({ ...student, studentProfile: null });
    render(await StudentDashboard());
    expect(screen.getByRole("alert").textContent).toContain("temporarily unavailable");
    logger.mockRestore();
  });

  it("uses incomplete-profile and empty-list states when optional data is absent", async () => {
    mocks.findUser.mockResolvedValue({ ...student, name: "   ", studentProfile: { branch: "", cgpa: null, yearOfStudy: null, skills: "invalid" } });
    mocks.findApplications.mockResolvedValue([]);
    mocks.findInternships.mockResolvedValue([]);
    render(await StudentDashboard());
    expect(screen.getByRole("heading", { name: "Good morning, there" })).toBeTruthy();
    expect(screen.getByText("4 fields to complete")).toBeTruthy();
    expect(screen.getByText("You have not applied to any internships yet.")).toBeTruthy();
    expect(screen.getByText("There are no published internships with upcoming deadlines.")).toBeTruthy();
  });
});
