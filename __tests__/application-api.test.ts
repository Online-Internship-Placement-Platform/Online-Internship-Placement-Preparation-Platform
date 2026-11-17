// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  listStudentApplications: vi.fn(),
  getApplicationContext: vi.fn(),
  createStudentApplication: vi.fn(),
  isUniqueApplicationError: vi.fn(),
  listAdminApplications: vi.fn(),
  updateApplicationStatus: vi.fn(),
  isMissingApplicationError: vi.fn(),
  getApplicationResumeKey: vi.fn(),
  readResume: vi.fn(),
}));

vi.mock("@/lib/server-session", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("@/lib/private-resume-storage", () => ({ readResume: mocks.readResume }));
vi.mock("@/modules/applications/application-service", () => ({
  listStudentApplications: mocks.listStudentApplications,
  getApplicationContext: mocks.getApplicationContext,
  createStudentApplication: mocks.createStudentApplication,
  isUniqueApplicationError: mocks.isUniqueApplicationError,
  listAdminApplications: mocks.listAdminApplications,
  updateApplicationStatus: mocks.updateApplicationStatus,
  isMissingApplicationError: mocks.isMissingApplicationError,
  getApplicationResumeKey: mocks.getApplicationResumeKey,
}));

import { GET as getStudentApplications } from "@/app/api/student/applications/route";
import {
  GET as getApplicationContext,
  POST as submitApplication,
} from "@/app/api/internships/[internshipId]/applications/route";
import { GET as getAdminApplications } from "@/app/api/admin/applications/route";
import { PATCH as updateApplication } from "@/app/api/admin/applications/[applicationId]/route";
import { GET as getAdminResume } from "@/app/api/admin/applications/[applicationId]/resume/route";
import { GET as getStudentResume } from "@/app/api/student/applications/[applicationId]/resume/route";

const studentSession = { userId: 7, role: "student" };
const adminSession = { userId: 3, role: "admin" };
const params = (applicationId = "12") => ({ params: Promise.resolve({ applicationId }) });
const routeParams = (internshipId = "intern-1") => ({ params: Promise.resolve({ internshipId }) });

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/admin/applications/12", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function formRequest(resume?: File | string) {
  const data = new FormData();
  if (resume !== undefined) data.set("resume", resume);
  return new Request("http://localhost/api/internships/intern-1/applications", { method: "POST", body: data });
}

describe("student application APIs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isUniqueApplicationError.mockReturnValue(false);
    mocks.isMissingApplicationError.mockReturnValue(false);
  });

  it("protects the student application list and reports service failures", async () => {
    mocks.getServerSession.mockResolvedValueOnce(null);
    expect((await getStudentApplications()).status).toBe(401);
    mocks.getServerSession.mockResolvedValueOnce(adminSession);
    expect((await getStudentApplications()).status).toBe(403);

    mocks.getServerSession.mockResolvedValue(studentSession);
    mocks.listStudentApplications.mockResolvedValue([{ id: 1 }]);
    const response = await getStudentApplications();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(mocks.listStudentApplications).toHaveBeenCalledWith(7);

    mocks.listStudentApplications.mockRejectedValue(new Error("database unavailable"));
    expect((await getStudentApplications()).status).toBe(503);
  });

  it("checks application availability for authentication, account, publication, and eligibility states", async () => {
    mocks.getServerSession.mockResolvedValueOnce(null);
    expect((await getApplicationContext(new Request("http://localhost"), routeParams())).status).toBe(401);
    mocks.getServerSession.mockResolvedValueOnce(adminSession);
    expect((await getApplicationContext(new Request("http://localhost"), routeParams())).status).toBe(403);

    mocks.getServerSession.mockResolvedValue(studentSession);
    mocks.getApplicationContext.mockResolvedValueOnce({ kind: "internship-not-found" });
    expect((await getApplicationContext(new Request("http://localhost"), routeParams())).status).toBe(404);
    mocks.getApplicationContext.mockResolvedValueOnce({ kind: "student-not-found" });
    expect((await getApplicationContext(new Request("http://localhost"), routeParams())).status).toBe(403);
    mocks.getApplicationContext.mockResolvedValueOnce({ kind: "available", internship: { published: false } });
    expect((await getApplicationContext(new Request("http://localhost"), routeParams())).status).toBe(404);

    const available = {
      kind: "available",
      internship: {
        id: "intern-1", company: "Example Co", role: "Intern", domain: "Software", stipendPerMonth: 0,
        type: "remote", location: null, description: "Role", applicationDeadline: new Date("2030-06-30T12:00:00Z"),
        minCgpa: 7, eligibleBranches: "CS\nIT", requiredSkills: "React\nTypeScript", published: true,
        acceptingApplications: true,
      },
      student: { name: "Sam", email: "sam@example.test", studentProfile: { branch: "CS", cgpa: 8 } },
      application: null,
      eligibility: { eligible: true, status: "eligible", reasons: [] },
      eligibilityChecks: [{ criterion: "CGPA", eligible: true, determinate: true, reasons: [] }],
    };
    mocks.getApplicationContext.mockResolvedValueOnce(available);
    const open = await getApplicationContext(new Request("http://localhost"), routeParams());
    expect(open.status).toBe(200);
    expect((await open.json()).canApply).toBe(true);

    mocks.getApplicationContext.mockResolvedValueOnce({
      ...available,
      student: { ...available.student, studentProfile: null },
    });
    const noProfile = await getApplicationContext(new Request("http://localhost"), routeParams());
    expect(await noProfile.json()).toMatchObject({ student: { branch: null, cgpa: null } });

    mocks.getApplicationContext.mockResolvedValueOnce({
      ...available,
      application: { id: 22, status: "Pending" },
      eligibility: { eligible: false, status: "ineligible", reasons: ["Not eligible"] },
    });
    const duplicate = await getApplicationContext(new Request("http://localhost"), routeParams());
    expect((await duplicate.json())).toMatchObject({ canApply: false, alreadyApplied: true, applicationStatus: "Pending" });

    mocks.getApplicationContext.mockResolvedValueOnce({ ...available, internship: { ...available.internship, acceptingApplications: false } });
    expect((await (await getApplicationContext(new Request("http://localhost"), routeParams())).json()).isOpen).toBe(false);
    mocks.getApplicationContext.mockRejectedValueOnce(new Error("database unavailable"));
    expect((await getApplicationContext(new Request("http://localhost"), routeParams())).status).toBe(503);
  });

  it("submits applications with optional resumes and maps validation, eligibility, duplicate, and error results", async () => {
    mocks.getServerSession.mockResolvedValueOnce(null);
    expect((await submitApplication(formRequest(), routeParams())).status).toBe(401);
    mocks.getServerSession.mockResolvedValueOnce(adminSession);
    expect((await submitApplication(formRequest(), routeParams())).status).toBe(403);

    mocks.getServerSession.mockResolvedValue(studentSession);
    expect((await submitApplication(formRequest("not-a-file"), routeParams())).status).toBe(400);

    mocks.createStudentApplication.mockResolvedValueOnce({ kind: "internship-not-found" });
    expect((await submitApplication(formRequest(), routeParams())).status).toBe(404);
    mocks.createStudentApplication.mockResolvedValueOnce({ kind: "student-not-found" });
    expect((await submitApplication(formRequest(), routeParams())).status).toBe(403);
    mocks.createStudentApplication.mockResolvedValueOnce({ kind: "already-applied" });
    expect((await submitApplication(formRequest(), routeParams())).status).toBe(409);
    mocks.createStudentApplication.mockResolvedValueOnce({ kind: "applications-closed" });
    expect((await submitApplication(formRequest(), routeParams())).status).toBe(400);
    mocks.createStudentApplication.mockResolvedValueOnce({ kind: "ineligible", reason: "CGPA too low." });
    expect(await (await submitApplication(formRequest(), routeParams())).json()).toEqual({ error: "CGPA too low." });
    mocks.createStudentApplication.mockResolvedValueOnce({ kind: "invalid-resume", error: "Invalid PDF." });
    expect(await (await submitApplication(formRequest(), routeParams())).json()).toEqual({ error: "Invalid PDF." });

    mocks.createStudentApplication.mockResolvedValueOnce({ kind: "created", application: { id: 15, status: "Pending" } });
    const created = await submitApplication(formRequest(), routeParams());
    expect(created.status).toBe(201);
    expect(created.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await created.json()).toEqual({ application: { id: 15, status: "Pending" }, resumeUrl: "/api/student/applications/15/resume" });

    const resume = new File(["%PDF-test"], "resume.pdf", { type: "application/pdf" });
    mocks.createStudentApplication.mockResolvedValueOnce({ kind: "created", application: { id: 16, status: "Pending" } });
    expect((await submitApplication(formRequest(resume), routeParams())).status).toBe(201);
    expect(mocks.createStudentApplication).toHaveBeenLastCalledWith(7, "intern-1", expect.objectContaining({ name: "resume.pdf" }));

    const uniqueError = new Error("duplicate");
    mocks.createStudentApplication.mockRejectedValueOnce(uniqueError);
    mocks.isUniqueApplicationError.mockReturnValueOnce(true);
    expect((await submitApplication(formRequest(), routeParams())).status).toBe(409);
    mocks.createStudentApplication.mockRejectedValueOnce(new Error("database unavailable"));
    expect((await submitApplication(formRequest(), routeParams())).status).toBe(503);
  });
});

describe("administrative application APIs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isUniqueApplicationError.mockReturnValue(false);
    mocks.isMissingApplicationError.mockReturnValue(false);
  });

  it("authorizes application listing, validates filters, and maps lookup/database errors", async () => {
    mocks.getServerSession.mockResolvedValueOnce(null);
    expect((await getAdminApplications(new Request("http://localhost/api/admin/applications"))).status).toBe(401);
    mocks.getServerSession.mockResolvedValueOnce(studentSession);
    expect((await getAdminApplications(new Request("http://localhost/api/admin/applications"))).status).toBe(403);

    mocks.getServerSession.mockResolvedValue(adminSession);
    expect((await getAdminApplications(new Request("http://localhost/api/admin/applications?status=nope"))).status).toBe(400);
    expect((await getAdminApplications(new Request(`http://localhost/api/admin/applications?studentName=${"x".repeat(101)}`))).status).toBe(400);
    mocks.listAdminApplications.mockResolvedValueOnce(null);
    expect((await getAdminApplications(new Request("http://localhost/api/admin/applications?internshipId=missing"))).status).toBe(400);
    mocks.listAdminApplications.mockResolvedValueOnce({ applications: [], internships: [] });
    const response = await getAdminApplications(new Request("http://localhost/api/admin/applications?status=Pending"));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(mocks.listAdminApplications).toHaveBeenCalledWith({ internshipId: "", studentName: "", status: "Pending" });
    mocks.listAdminApplications.mockRejectedValueOnce(new Error("database unavailable"));
    expect((await getAdminApplications(new Request("http://localhost/api/admin/applications"))).status).toBe(503);
  });

  it("validates application status updates and handles missing records and database failures", async () => {
    mocks.getServerSession.mockResolvedValueOnce(null);
    expect((await updateApplication(jsonRequest({ status: "Selected" }), params())).status).toBe(401);
    mocks.getServerSession.mockResolvedValueOnce(studentSession);
    expect((await updateApplication(jsonRequest({ status: "Selected" }), params())).status).toBe(403);
    mocks.getServerSession.mockResolvedValue(adminSession);

    expect((await updateApplication(jsonRequest({ status: "Selected" }), params("0"))).status).toBe(400);
    const badJson = new Request("http://localhost/api/admin/applications/12", { method: "PATCH", body: "{" });
    expect((await updateApplication(badJson, params())).status).toBe(400);
    expect((await updateApplication(jsonRequest({}), params())).status).toBe(400);
    expect((await updateApplication(jsonRequest({ status: "unknown" }), params())).status).toBe(400);

    mocks.updateApplicationStatus.mockResolvedValueOnce({ id: 12, status: "Shortlisted" });
    expect((await updateApplication(jsonRequest({ status: "Shortlisted" }), params())).status).toBe(200);
    mocks.updateApplicationStatus.mockRejectedValueOnce({ code: "P2025" });
    mocks.isMissingApplicationError.mockReturnValueOnce(true);
    expect((await updateApplication(jsonRequest({ status: "Rejected" }), params())).status).toBe(404);
    mocks.updateApplicationStatus.mockRejectedValueOnce(new Error("database unavailable"));
    expect((await updateApplication(jsonRequest({ status: "Rejected" }), params())).status).toBe(503);
  });
});

describe("application resume APIs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("restricts administrative resume access and returns private PDF responses", async () => {
    mocks.getServerSession.mockResolvedValueOnce(null);
    expect((await getAdminResume(new Request("http://localhost"), params())).status).toBe(401);
    mocks.getServerSession.mockResolvedValueOnce(studentSession);
    expect((await getAdminResume(new Request("http://localhost"), params())).status).toBe(403);
    mocks.getServerSession.mockResolvedValue(adminSession);
    expect((await getAdminResume(new Request("http://localhost"), params("bad"))).status).toBe(404);
    mocks.getApplicationResumeKey.mockResolvedValueOnce(null);
    expect((await getAdminResume(new Request("http://localhost"), params())).status).toBe(404);
    mocks.getApplicationResumeKey.mockResolvedValueOnce({ resumeStorageKey: "key" });
    mocks.readResume.mockResolvedValueOnce(new Uint8Array([37, 80, 68, 70]));
    const response = await getAdminResume(new Request("http://localhost"), params());
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Disposition")).toContain("resume-12.pdf");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(mocks.getApplicationResumeKey).toHaveBeenLastCalledWith(12, 3, true);
    mocks.getApplicationResumeKey.mockRejectedValueOnce(new Error("storage unavailable"));
    expect((await getAdminResume(new Request("http://localhost"), params())).status).toBe(404);
  });

  it("enforces student resume ownership while allowing administrative access", async () => {
    mocks.getServerSession.mockResolvedValueOnce(null);
    expect((await getStudentResume(new Request("http://localhost"), params())).status).toBe(401);
    mocks.getServerSession.mockResolvedValueOnce({ userId: 5, role: "admin" });
    mocks.getApplicationResumeKey.mockResolvedValueOnce({ resumeStorageKey: "key" });
    mocks.readResume.mockResolvedValueOnce(new Uint8Array([37, 80, 68, 70]));
    expect((await getStudentResume(new Request("http://localhost"), params())).status).toBe(200);
    expect(mocks.getApplicationResumeKey).toHaveBeenLastCalledWith(12, 5, true);

    mocks.getServerSession.mockResolvedValueOnce({ userId: 7, role: "student" });
    expect((await getStudentResume(new Request("http://localhost"), params("-1"))).status).toBe(404);
    mocks.getServerSession.mockResolvedValueOnce({ userId: 7, role: "student" });
    mocks.getApplicationResumeKey.mockResolvedValueOnce(null);
    expect((await getStudentResume(new Request("http://localhost"), params())).status).toBe(404);
    expect(mocks.getApplicationResumeKey).toHaveBeenLastCalledWith(12, 7, false);
    mocks.getServerSession.mockResolvedValueOnce({ userId: 7, role: "guest" });
    expect((await getStudentResume(new Request("http://localhost"), params())).status).toBe(404);
    mocks.getServerSession.mockResolvedValueOnce({ userId: 7, role: "student" });
    mocks.getApplicationResumeKey.mockResolvedValueOnce({ resumeStorageKey: "key" });
    mocks.readResume.mockRejectedValueOnce(new Error("storage unavailable"));
    expect((await getStudentResume(new Request("http://localhost"), params())).status).toBe(404);
  });
});
