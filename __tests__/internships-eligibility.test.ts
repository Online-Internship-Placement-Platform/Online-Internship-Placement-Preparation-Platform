import { beforeEach, describe, expect, it, vi } from "vitest";

const getServerSession = vi.hoisted(() => vi.fn());
const listStudentInternshipEligibility = vi.hoisted(() => vi.fn());

vi.mock("@/lib/server-session", () => ({ getServerSession }));
vi.mock("@/modules/applications/application-service", () => ({ listStudentInternshipEligibility }));

import { GET } from "@/app/api/internships/route";

describe("GET /api/internships", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses the authenticated student ID and returns only eligibility-safe profile fields", async () => {
    getServerSession.mockResolvedValue({ userId: 42, role: "student" });
    listStudentInternshipEligibility.mockResolvedValue({
      kind: "available",
      profile: { branch: "Computer Science", cgpa: 8.4, yearOfStudy: "THIRD", skills: ["React"], complete: true },
      profileComplete: true,
      internships: [{ id: "intern-1", eligibility: { eligible: true, status: "eligible", reasons: [] } }],
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(listStudentInternshipEligibility).toHaveBeenCalledWith(42);
    const body = await response.json();
    expect(body.profile).toEqual({
      branch: "Computer Science", cgpa: 8.4, yearOfStudy: "THIRD", skills: ["React"], complete: true,
    });
    expect(JSON.stringify(body)).not.toContain("email");
    expect(JSON.stringify(body)).not.toContain("passwordHash");
  });

  it("rejects a failed profile/listing request with a useful error", async () => {
    getServerSession.mockResolvedValue({ userId: 42, role: "student" });
    listStudentInternshipEligibility.mockRejectedValue(new Error("database unavailable"));

    const response = await GET();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Internships are temporarily unavailable. Please try again." });
  });

  it("does not allow a client to select another student's identity", async () => {
    getServerSession.mockResolvedValue({ userId: 42, role: "student" });
    listStudentInternshipEligibility.mockResolvedValue({ kind: "available", profile: null, profileComplete: false, internships: [] });

    await GET();

    expect(listStudentInternshipEligibility).toHaveBeenCalledWith(42);
    expect(listStudentInternshipEligibility).toHaveBeenCalledTimes(1);
  });
});
