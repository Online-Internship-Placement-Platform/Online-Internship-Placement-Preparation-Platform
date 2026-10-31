// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const { getServerSession, userFindUnique, studentProfileUpdate, internshipFindUnique, applicationFindUnique, applicationFindMany, applicationFindFirst, applicationUpdate, readResume } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  userFindUnique: vi.fn(),
  studentProfileUpdate: vi.fn(),
  internshipFindUnique: vi.fn(),
  applicationFindUnique: vi.fn(),
  applicationFindMany: vi.fn(),
  applicationFindFirst: vi.fn(),
  applicationUpdate: vi.fn(),
  readResume: vi.fn(),
}));

vi.mock("@/lib/server-session", () => ({ getServerSession }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: userFindUnique },
    studentProfile: { update: studentProfileUpdate },
    internship: { findUnique: internshipFindUnique },
    application: {
      findUnique: applicationFindUnique,
      findMany: applicationFindMany,
      findFirst: applicationFindFirst,
      update: applicationUpdate,
    },
  },
}));
vi.mock("@/lib/private-resume-storage", () => ({
  readResume,
  deleteResume: vi.fn(),
  storeResume: vi.fn(),
  validateResume: vi.fn(),
}));

import { GET as getStudentApplications } from "@/app/api/student/applications/route";
import { GET as getProfile, PATCH as updateProfile } from "@/app/api/profile/route";
import { GET as getApplicationAvailability } from "@/app/api/internships/[internshipId]/applications/route";
import { GET as getApplicationResume } from "@/app/api/student/applications/[applicationId]/resume/route";
import { PATCH as updateApplication } from "@/app/api/admin/applications/[applicationId]/route";

const studentA = { id: 101, name: "Student A", email: "student-a@example.test" };
const studentB = { id: 202, name: "Student B", email: "student-b@example.test" };
const applicationA = {
  id: 401,
  studentId: studentA.id,
  status: "Pending",
  appliedAt: new Date("2030-05-20T10:00:00.000Z"),
  resumeStorageKey: "student-a-resume",
  internship: {
    id: "intern-a", company: "Northstar Labs", role: "Frontend Intern",
    applicationDeadline: new Date("2030-06-30T00:00:00.000Z"),
    published: true, acceptingApplications: true,
  },
};
const applicationB = {
  id: 402,
  studentId: studentB.id,
  status: "Shortlisted",
  appliedAt: new Date("2030-05-19T10:00:00.000Z"),
  resumeStorageKey: "student-b-private-resume",
  internship: {
    id: "intern-b", company: "Aster Finance", role: "Data Analyst Intern",
    applicationDeadline: new Date("2030-06-30T00:00:00.000Z"),
    published: true, acceptingApplications: true,
  },
};

describe("student data access isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ userId: studentA.id, role: "student" });
    applicationFindMany.mockImplementation(async ({ where }: { where: { studentId: number } }) => (
      where.studentId === studentA.id ? [applicationA] : [applicationB]
    ));
    userFindUnique.mockResolvedValue({
      id: studentA.id,
      name: studentA.name,
      email: studentA.email,
      role: "STUDENT",
      studentProfile: { branch: "Computer Science", cgpa: 8.5, yearOfStudy: "THIRD", skills: ["React"], resumeFileName: null },
    });
    internshipFindUnique.mockResolvedValue({
      id: "intern-a",
      company: "Northstar Labs",
      role: "Frontend Intern",
      domain: "Software Development",
      applicationDeadline: new Date("2030-06-30T00:00:00.000Z"),
      published: true,
      acceptingApplications: true,
      minCgpa: 7.5,
      eligibleBranches: "Computer Science",
      requiredSkills: "React",
    });
    applicationFindUnique.mockResolvedValue({ id: applicationA.id, status: applicationA.status });
    studentProfileUpdate.mockResolvedValue({
      branch: "Computer Science",
      cgpa: 8.5,
      yearOfStudy: "THIRD",
      skills: ["React"],
      resumeFileName: null,
    });
    applicationFindFirst.mockImplementation(async ({ where }: { where: { id: number; studentId?: number } }) => (
      where.id === applicationA.id && where.studentId === studentA.id
        ? { resumeStorageKey: applicationA.resumeStorageKey }
        : null
    ));
    readResume.mockResolvedValue(new Uint8Array([37, 80, 68, 70]));
  });

  it("returns only Student A's applications using the authenticated session ID", async () => {
    const response = await getStudentApplications();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(applicationFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { studentId: studentA.id } }));
    expect(body.applications.map((item: { id: number }) => item.id)).toEqual([applicationA.id]);
    expect(JSON.stringify(body)).not.toContain(studentB.name);
    expect(JSON.stringify(body)).not.toContain("student-b-private-resume");
  });

  it("reads Student A's profile by the authenticated session ID", async () => {
    const response = await getProfile();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(userFindUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: studentA.id } }));
    expect(body.profile).toMatchObject({ id: studentA.id, name: studentA.name, email: studentA.email });
    expect(body.profile.id).not.toBe(studentB.id);
  });

  it("ignores a supplied Student B ID when checking application availability", async () => {
    const response = await getApplicationAvailability(
      new Request("http://localhost/api/internships/intern-a/applications?studentId=202"),
      { params: Promise.resolve({ internshipId: "intern-a" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(userFindUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: studentA.id } }));
    expect(applicationFindUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { studentId_internshipId: { studentId: studentA.id, internshipId: "intern-a" } },
    }));
    expect(body.alreadyApplied).toBe(true);
    expect(body.applicationStatus).toBe("Pending");
    expect(JSON.stringify(body)).not.toContain(studentB.email);
  });

  it("ignores a supplied Student B ID when Student A updates their profile", async () => {
    const response = await updateProfile(new Request("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: studentB.id, cgpa: 9.1, skills: ["TypeScript"] }),
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(userFindUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: studentA.id } }));
    expect(studentProfileUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: studentA.id },
      data: { cgpa: 9.1, skills: ["TypeScript"] },
    }));
    expect(studentProfileUpdate).not.toHaveBeenCalledWith(expect.objectContaining({ where: { userId: studentB.id } }));
    expect(body.profile.id).toBe(studentA.id);
  });

  it("denies Student A access to Student B's application resume", async () => {
    const response = await getApplicationResume(
      new Request(`http://localhost/api/student/applications/${applicationB.id}/resume`),
      { params: Promise.resolve({ applicationId: String(applicationB.id) }) },
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Resume not found." });
    expect(applicationFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: applicationB.id, studentId: studentA.id },
    }));
    expect(readResume).not.toHaveBeenCalled();
  });

  it("allows Student A to access their own application resume", async () => {
    const response = await getApplicationResume(
      new Request(`http://localhost/api/student/applications/${applicationA.id}/resume`),
      { params: Promise.resolve({ applicationId: String(applicationA.id) }) },
    );

    expect(response.status).toBe(200);
    expect(applicationFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: applicationA.id, studentId: studentA.id },
    }));
    expect(readResume).toHaveBeenCalledWith(applicationA.resumeStorageKey);
    expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([37, 80, 68, 70]);
  });

  it("denies Student A from modifying Student B's application status", async () => {
    const response = await updateApplication(new Request(`http://localhost/api/admin/applications/${applicationB.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Rejected" }),
    }), { params: Promise.resolve({ applicationId: String(applicationB.id) }) });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Only administrators can update application status." });
    expect(applicationUpdate).not.toHaveBeenCalled();
  });
});
