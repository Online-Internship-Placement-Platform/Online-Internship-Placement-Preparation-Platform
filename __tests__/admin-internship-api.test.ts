// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(), createInternship: vi.fn(), listAdminInternships: vi.fn(),
  getAdminInternship: vi.fn(), updateInternship: vi.fn(), deleteInternship: vi.fn(), isMissingInternshipError: vi.fn(),
}));
vi.mock("@/lib/server-session", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("@/modules/internships/internship-service", () => ({
  createInternship: mocks.createInternship, listAdminInternships: mocks.listAdminInternships,
  getAdminInternship: mocks.getAdminInternship, updateInternship: mocks.updateInternship,
  deleteInternship: mocks.deleteInternship, isMissingInternshipError: mocks.isMissingInternshipError,
}));

import { GET as listInternships, POST as createInternship } from "@/app/api/admin/internships/route";
import { DELETE as deleteInternship, GET as getInternship, PATCH as updateInternship } from "@/app/api/admin/internships/[internshipId]/route";

const admin = { userId: 2, role: "admin" };
const student = { userId: 7, role: "student" };
const params = { params: Promise.resolve({ internshipId: "internship-1" }) };
const payload = {
  company: "Example Labs", role: "Engineer Intern", domain: "Software Development", stipendPerMonth: 20000,
  type: "hybrid", location: "Bengaluru", description: "Build software.", applicationDeadline: "2030-06-30",
  minCgpa: 7, eligibleBranches: "CS, IT", requiredSkills: "TypeScript, SQL", published: true, acceptingApplications: true,
};
const request = (url: string, body?: string) => new Request(url, {
  method: body === undefined ? "GET" : "POST", headers: { "Content-Type": "application/json" }, ...(body === undefined ? {} : { body }),
});
const jsonRequest = (url: string, method: string, body: unknown) => new Request(url, {
  method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getServerSession.mockResolvedValue(admin);
  mocks.isMissingInternshipError.mockReturnValue(false);
  mocks.listAdminInternships.mockResolvedValue([{ id: "internship-1" }]);
  mocks.createInternship.mockResolvedValue({ id: "internship-2" });
  mocks.getAdminInternship.mockResolvedValue({ id: "internship-1" });
  mocks.updateInternship.mockResolvedValue({ id: "internship-1" });
  mocks.deleteInternship.mockResolvedValue({ kind: "deleted" });
});

describe("admin internship API authorization and collection operations", () => {
  it("requires an admin for listing and creation", async () => {
    mocks.getServerSession.mockResolvedValueOnce(null);
    expect((await listInternships()).status).toBe(401);
    mocks.getServerSession.mockResolvedValueOnce(student);
    expect((await listInternships()).status).toBe(403);
    mocks.getServerSession.mockResolvedValueOnce(null);
    expect((await createInternship(request("http://localhost", JSON.stringify(payload)))).status).toBe(401);
    mocks.getServerSession.mockResolvedValueOnce(student);
    expect((await createInternship(request("http://localhost", JSON.stringify(payload)))).status).toBe(403);
  });

  it("lists internships with private caching and reports service errors", async () => {
    const response = await listInternships();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ internships: [{ id: "internship-1" }] });
    mocks.listAdminInternships.mockRejectedValueOnce(new Error("database unavailable"));
    const logger = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect((await listInternships()).status).toBe(503);
    expect(logger).toHaveBeenCalledOnce();
    logger.mockRestore();
  });

  it("validates create requests and handles successful and failed persistence", async () => {
    expect((await createInternship(request("http://localhost", "{"))).status).toBe(400);
    expect((await createInternship(jsonRequest("http://localhost", "POST", { ...payload, company: " " }))).status).toBe(400);
    const created = await createInternship(jsonRequest("http://localhost", "POST", payload));
    expect(created.status).toBe(201);
    expect(created.headers.get("Cache-Control")).toBe("private, no-store");
    expect(mocks.createInternship).toHaveBeenCalledWith(expect.objectContaining({ location: "Bengaluru", eligibleBranches: ["CS", "IT"] }));
    mocks.createInternship.mockRejectedValueOnce(new Error("database unavailable"));
    expect((await createInternship(jsonRequest("http://localhost", "POST", payload))).status).toBe(503);
  });
});

describe("admin internship record operations", () => {
  it("authorizes, returns missing records, and handles lookup failures", async () => {
    mocks.getServerSession.mockResolvedValueOnce(null);
    expect((await getInternship(new Request("http://localhost"), params)).status).toBe(401);
    mocks.getServerSession.mockResolvedValueOnce(student);
    expect((await getInternship(new Request("http://localhost"), params)).status).toBe(403);
    mocks.getAdminInternship.mockResolvedValueOnce(null);
    expect((await getInternship(new Request("http://localhost"), params)).status).toBe(404);
    const found = await getInternship(new Request("http://localhost"), params);
    expect(found.status).toBe(200);
    expect(found.headers.get("Cache-Control")).toBe("private, no-store");
    mocks.getAdminInternship.mockRejectedValueOnce(new Error("database unavailable"));
    expect((await getInternship(new Request("http://localhost"), params)).status).toBe(503);
  });

  it("validates patches, returns successful updates, and distinguishes missing rows from failures", async () => {
    expect((await updateInternship(request("http://localhost"), params)).status).toBe(400);
    expect((await updateInternship(jsonRequest("http://localhost", "PATCH", { ...payload, type: "invalid" }), params)).status).toBe(400);
    expect((await updateInternship(jsonRequest("http://localhost", "PATCH", payload), params)).status).toBe(200);
    mocks.updateInternship.mockRejectedValueOnce({ code: "P2025" });
    mocks.isMissingInternshipError.mockReturnValueOnce(true);
    expect((await updateInternship(jsonRequest("http://localhost", "PATCH", payload), params)).status).toBe(404);
    mocks.updateInternship.mockRejectedValueOnce(new Error("database unavailable"));
    expect((await updateInternship(jsonRequest("http://localhost", "PATCH", payload), params)).status).toBe(503);
  });

  it("handles delete authorization, conflict, success, missing record, and unexpected failure", async () => {
    mocks.getServerSession.mockResolvedValueOnce(null);
    expect((await deleteInternship(new Request("http://localhost"), params)).status).toBe(401);
    mocks.getServerSession.mockResolvedValueOnce(student);
    expect((await deleteInternship(new Request("http://localhost"), params)).status).toBe(403);
    mocks.deleteInternship.mockResolvedValueOnce({ kind: "has-applications" });
    expect((await deleteInternship(new Request("http://localhost"), params)).status).toBe(409);
    expect((await deleteInternship(new Request("http://localhost"), params)).status).toBe(200);
    mocks.deleteInternship.mockRejectedValueOnce({ code: "P2025" });
    mocks.isMissingInternshipError.mockReturnValueOnce(true);
    expect((await deleteInternship(new Request("http://localhost"), params)).status).toBe(404);
    mocks.deleteInternship.mockRejectedValueOnce(new Error("database unavailable"));
    expect((await deleteInternship(new Request("http://localhost"), params)).status).toBe(503);
  });
});
