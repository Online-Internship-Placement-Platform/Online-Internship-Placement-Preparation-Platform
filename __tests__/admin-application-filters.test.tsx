import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getServerSession = vi.hoisted(() => vi.fn());
const internshipFindMany = vi.hoisted(() => vi.fn());
const applicationFindMany = vi.hoisted(() => vi.fn());

vi.mock("@/lib/server-session", () => ({ getServerSession }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    internship: { findMany: internshipFindMany },
    application: { findMany: applicationFindMany },
  },
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

import AdminApplicationsView from "@/components/admin-applications-view";
import { GET } from "@/app/api/admin/applications/route";

const applicationRows = [
  {
    id: 201,
    status: "Pending",
    appliedAt: new Date("2030-05-20T10:00:00.000Z"),
    resumeStorageKey: null,
    student: { name: "Aarav Mehta", studentProfile: { skills: ["React", "TypeScript"] } },
    internship: { id: "int-001", company: "Northstar Labs", role: "Frontend Intern" },
  },
  {
    id: 202,
    status: "Shortlisted",
    appliedAt: new Date("2030-05-18T10:00:00.000Z"),
    resumeStorageKey: "resume-202",
    student: { name: "Ishita Shah", studentProfile: { skills: ["SQL"] } },
    internship: { id: "int-001", company: "Northstar Labs", role: "Frontend Intern" },
  },
  {
    id: 203,
    status: "Rejected",
    appliedAt: new Date("2030-05-16T10:00:00.000Z"),
    resumeStorageKey: null,
    student: { name: "Aarav Mehta", studentProfile: { skills: ["Python"] } },
    internship: { id: "int-002", company: "Aster Finance", role: "Data Analyst Intern" },
  },
  {
    id: 204,
    status: "Under review",
    appliedAt: new Date("2030-05-14T10:00:00.000Z"),
    resumeStorageKey: null,
    student: { name: "Maya Iyer", studentProfile: { skills: [] } },
    internship: { id: "int-002", company: "Aster Finance", role: "Data Analyst Intern" },
  },
];

const internshipOptions = [
  { id: "int-001", company: "Northstar Labs", role: "Frontend Intern" },
  { id: "int-002", company: "Aster Finance", role: "Data Analyst Intern" },
];

function queryRequest(query = "") {
  return new Request(`http://localhost/api/admin/applications${query ? `?${query}` : ""}`);
}

function filteredRows(search: URLSearchParams) {
  const studentName = search.get("studentName")?.toLocaleLowerCase() ?? "";
  const internshipId = search.get("internshipId") ?? "";
  const status = search.get("status") ?? "";
  return applicationRows.filter((application) =>
    (!studentName || application.student.name?.toLocaleLowerCase().includes(studentName)) &&
    (!internshipId || application.internship.id === internshipId) &&
    (!status || application.status === status),
  );
}

function renderAdminView() {
  const fetchMock = vi.fn(async (input: string | URL | Request) => {
    const url = new URL(String(input), "http://localhost");
    const rows = filteredRows(url.searchParams).map((application) => ({
      id: application.id,
      status: application.status,
      appliedAt: application.appliedAt.toISOString(),
      student: { name: application.student.name, skills: application.student.studentProfile.skills },
      internship: application.internship,
      resumeUrl: application.resumeStorageKey ? `/api/admin/applications/${application.id}/resume` : null,
    }));
    return { ok: true, json: async () => ({ applications: rows, internships: internshipOptions }) } as Response;
  });
  vi.stubGlobal("fetch", fetchMock);
  render(<AdminApplicationsView />);
  return fetchMock;
}

describe("GET /api/admin/applications filters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ userId: 12, role: "admin" });
    internshipFindMany.mockResolvedValue(internshipOptions);
    applicationFindMany.mockResolvedValue(applicationRows);
  });

  it("returns the available application records for an admin", async () => {
    const response = await GET(queryRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.applications).toHaveLength(4);
    expect(applicationFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
  });

  it("filters records by internship", async () => {
    applicationFindMany.mockResolvedValue([applicationRows[0], applicationRows[1]]);

    const response = await GET(queryRequest("internshipId=int-001"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(applicationFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { internshipId: "int-001" } }));
    expect(body.applications.map((application: { id: number }) => application.id)).toEqual([201, 202]);
  });

  it("filters records by student name", async () => {
    applicationFindMany.mockResolvedValue([applicationRows[1]]);

    const response = await GET(queryRequest("studentName=Ishita%20Shah"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(applicationFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { student: { is: { name: { contains: "Ishita Shah" } } } },
    }));
    expect(body.applications.map((application: { student: { name: string } }) => application.student.name)).toEqual(["Ishita Shah"]);
  });

  it("filters records by application status", async () => {
    applicationFindMany.mockResolvedValue([applicationRows[2]]);

    const response = await GET(queryRequest("status=Rejected"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(applicationFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: "Rejected" } }));
    expect(body.applications.map((application: { status: string }) => application.status)).toEqual(["Rejected"]);
  });

  it("combines internship, student-name, and status filters", async () => {
    applicationFindMany.mockResolvedValue([applicationRows[0]]);

    const response = await GET(queryRequest("internshipId=int-001&studentName=Aarav&status=Pending"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(applicationFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        internshipId: "int-001",
        status: "Pending",
        student: { is: { name: { contains: "Aarav" } } },
      },
    }));
    expect(body.applications.map((application: { id: number }) => application.id)).toEqual([201]);
  });
});

describe("AdminApplicationsView filters", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows all available applications with their student and internship details", async () => {
    renderAdminView();

    const frontendRow = await screen.findByRole("row", { name: /Aarav Mehta.*Frontend Intern.*Pending/ });
    expect(within(frontendRow).getByText("Northstar Labs")).toBeDefined();
    expect(within(frontendRow).getByText("React")).toBeDefined();
    expect(await screen.findByText("Ishita Shah")).toBeDefined();
    expect(screen.getAllByText("Data Analyst Intern")).toHaveLength(2);
    expect(screen.getAllByRole("row")).toHaveLength(5);
  });

  it("displays only matching applications after choosing an internship", async () => {
    const fetchMock = renderAdminView();

    fireEvent.change(await screen.findByLabelText("Internship"), { target: { value: "int-001" } });

    expect(await screen.findByText("Ishita Shah")).toBeDefined();
    await waitFor(() => expect(screen.queryByText("Data Analyst Intern")).toBeNull());
    expect(fetchMock).toHaveBeenLastCalledWith(expect.stringContaining("internshipId=int-001"), expect.any(Object));
    expect(screen.getAllByRole("row")).toHaveLength(3);
  });

  it("displays only matching applications after searching by student name", async () => {
    const fetchMock = renderAdminView();

    fireEvent.change(await screen.findByLabelText("Student name"), { target: { value: "Ishita" } });

    expect(await screen.findByText("Ishita Shah")).toBeDefined();
    await waitFor(() => expect(screen.queryByText("Aarav Mehta")).toBeNull());
    expect(fetchMock).toHaveBeenLastCalledWith(expect.stringContaining("studentName=Ishita"), expect.any(Object));
    expect(screen.getAllByRole("row")).toHaveLength(2);
  });

  it("displays only matching applications after choosing a status", async () => {
    const fetchMock = renderAdminView();

    fireEvent.change(await screen.findByLabelText("Status"), { target: { value: "Rejected" } });

    expect(await screen.findByText("Aarav Mehta")).toBeDefined();
    await waitFor(() => expect(screen.queryByText("Maya Iyer")).toBeNull());
    expect(fetchMock).toHaveBeenLastCalledWith(expect.stringContaining("status=Rejected"), expect.any(Object));
    expect(screen.getAllByRole("row")).toHaveLength(2);
  });

  it("applies all three filters together", async () => {
    const fetchMock = renderAdminView();

    fireEvent.change(await screen.findByLabelText("Internship"), { target: { value: "int-001" } });
    await screen.findByText("Ishita Shah");
    fireEvent.change(screen.getByLabelText("Student name"), { target: { value: "Aarav" } });
    await waitFor(() => expect(screen.getAllByRole("row")).toHaveLength(2));
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "Pending" } });

    const matchingRow = await screen.findByRole("row", { name: /Aarav Mehta.*Frontend Intern.*Pending/ });
    expect(within(matchingRow).getByText("Northstar Labs")).toBeDefined();
    await waitFor(() => expect(screen.getAllByRole("row")).toHaveLength(2));
    expect(fetchMock).toHaveBeenLastCalledWith(expect.stringContaining("studentName=Aarav&internshipId=int-001&status=Pending"), expect.any(Object));
    expect(screen.queryByText("Ishita Shah")).toBeNull();
  });

  it("shows the no-match state when filters return no applications", async () => {
    renderAdminView();

    fireEvent.change(await screen.findByLabelText("Student name"), { target: { value: "No Matching Student" } });

    expect(await screen.findByText("No applications match these filters.")).toBeDefined();
    expect(screen.queryByRole("table")).toBeNull();
  });
});
