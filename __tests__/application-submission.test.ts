import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getServerSession = vi.hoisted(() => vi.fn());
const internshipFindUnique = vi.hoisted(() => vi.fn());
const userFindUnique = vi.hoisted(() => vi.fn());
const applicationFindUnique = vi.hoisted(() => vi.fn());
const applicationCreate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/server-session", () => ({ getServerSession }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    internship: { findUnique: internshipFindUnique },
    user: { findUnique: userFindUnique },
    application: { findUnique: applicationFindUnique, create: applicationCreate },
  },
}));
vi.mock("@/lib/private-resume-storage", () => ({
  deleteResume: vi.fn(),
  storeResume: vi.fn(),
  validateResume: vi.fn(),
}));

import { POST } from "@/app/api/internships/[internshipId]/applications/route";

const studentId = 42;
const internshipId = "tc09-open-internship";
const now = new Date("2030-06-01T12:00:00.000Z");

describe("POST /api/internships/[internshipId]/applications", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    vi.clearAllMocks();

    getServerSession.mockResolvedValue({ userId: studentId, role: "student" });
    internshipFindUnique.mockResolvedValue({
      id: internshipId,
      company: "Example Co",
      role: "Frontend Intern",
      domain: "Software Development",
      applicationDeadline: new Date("2030-06-30T00:00:00.000Z"),
      published: true,
      acceptingApplications: true,
      minCgpa: 7.5,
      eligibleBranches: "Computer Science\nInformation Technology",
      requiredSkills: "React\nTypeScript",
    });
    userFindUnique.mockResolvedValue({
      id: studentId,
      role: "STUDENT",
      name: "Test Student",
      email: "student@example.test",
      studentProfile: {
        branch: "Computer Science",
        cgpa: 8.5,
        skills: ["React", "TypeScript"],
        yearOfStudy: "THIRD",
      },
    });
    applicationFindUnique.mockResolvedValue(null);
    applicationCreate.mockImplementation(async ({ data }) => ({
      id: 9001,
      status: data.status,
      appliedAt: now,
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("submits an eligible student's application with the initial Pending status", async () => {
    const formData = new FormData();
    const request = new Request(`http://localhost/api/internships/${internshipId}/applications`, {
      method: "POST",
      body: formData,
    });

    const response = await POST(request, { params: Promise.resolve({ internshipId }) });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(applicationCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: { studentId, internshipId, status: "Pending", resumeStorageKey: undefined },
    }));
    expect(body.application).toMatchObject({ id: 9001, status: "Pending" });
  });
});
