import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  internshipFindUnique: vi.fn(),
  internshipFindMany: vi.fn(),
  applicationFindUnique: vi.fn(),
  applicationFindMany: vi.fn(),
  applicationFindFirst: vi.fn(),
  applicationCreate: vi.fn(),
  applicationUpdate: vi.fn(),
  validateResume: vi.fn(),
  storeResume: vi.fn(),
  deleteResume: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: db.userFindUnique },
    internship: { findUnique: db.internshipFindUnique, findMany: db.internshipFindMany },
    application: {
      findUnique: db.applicationFindUnique,
      findMany: db.applicationFindMany,
      findFirst: db.applicationFindFirst,
      create: db.applicationCreate,
      update: db.applicationUpdate,
    },
  },
}));

vi.mock("@/lib/private-resume-storage", () => ({
  validateResume: db.validateResume,
  storeResume: db.storeResume,
  deleteResume: db.deleteResume,
}));

import {
  createStudentApplication,
  getApplicationContext,
  getApplicationResumeKey,
  isMissingApplicationError,
  isUniqueApplicationError,
  listAdminApplications,
  listStudentApplications,
  listStudentInternshipEligibility,
  updateApplicationStatus,
} from "@/modules/applications/application-service";
function futureDate(days = 30) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12));
}

function student(overrides: Record<string, unknown> = {}) {
  return {
    id: 7,
    role: "STUDENT",
    name: "Sam Student",
    email: "sam@example.test",
    studentProfile: { branch: "Computer Science", cgpa: 8.4, yearOfStudy: "THIRD" },
    ...overrides,
  };
}

function internship(overrides: Record<string, unknown> = {}) {
  return {
    id: "intern-1",
    company: "Example Co",
    role: "Software Intern",
    domain: "Software Development",
    stipendPerMonth: 0,
    type: "remote",
    location: null,
    description: "Build useful software.",
    applicationDeadline: futureDate(),
    published: true,
    acceptingApplications: true,
    minCgpa: 7,
    eligibleBranches: "Computer Science\nInformation Technology",
    requiredSkills: "React\nTypeScript",
    ...overrides,
  };
}

function configureAvailableContext(options: {
  listing?: Record<string, unknown> | null;
  user?: Record<string, unknown> | null;
  application?: Record<string, unknown> | null;
} = {}) {
  db.internshipFindUnique.mockResolvedValue(options.listing === undefined ? internship() : options.listing);
  db.userFindUnique.mockResolvedValue(options.user === undefined ? student() : options.user);
  db.applicationFindUnique.mockResolvedValue(options.application ?? null);
}

describe("application service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.validateResume.mockResolvedValue(null);
    db.storeResume.mockResolvedValue("stored/resume-key");
    db.deleteResume.mockResolvedValue(undefined);
  });

  it("distinguishes missing internships, missing students, and available contexts", async () => {
    configureAvailableContext({ listing: null });
    expect(await getApplicationContext("missing", 7)).toEqual({ kind: "internship-not-found" });

    configureAvailableContext({ user: null });
    expect(await getApplicationContext("intern-1", 7)).toEqual({ kind: "student-not-found" });

    configureAvailableContext({ user: student({ role: "ADMIN" }) });
    expect(await getApplicationContext("intern-1", 7)).toEqual({ kind: "student-not-found" });

    configureAvailableContext({ application: { id: 4, status: "Pending" } });
    const result = await getApplicationContext("intern-1", 7);
    expect(result.kind).toBe("available");
    if (result.kind === "available") {
      expect(result.application).toEqual({ id: 4, status: "Pending" });
      expect(result.eligibility.eligible).toBe(true);
    }

    configureAvailableContext({ user: student({ studentProfile: null }) });
    const noProfile = await getApplicationContext("intern-1", 7);
    expect(noProfile.kind).toBe("available");
    if (noProfile.kind === "available") expect(noProfile.eligibility.status).toBe("undetermined");
  });

  it("lists published internships for valid students and returns missing-account states", async () => {
    db.userFindUnique.mockResolvedValueOnce(null);
    db.internshipFindMany.mockResolvedValueOnce([]);
    expect(await listStudentInternshipEligibility(7)).toEqual({ kind: "student-not-found" });

    db.userFindUnique.mockResolvedValueOnce(student({ role: "ADMIN" }));
    db.internshipFindMany.mockResolvedValueOnce([]);
    expect(await listStudentInternshipEligibility(7)).toEqual({ kind: "student-not-found" });

    db.userFindUnique.mockResolvedValueOnce(student({ studentProfile: null }));
    db.internshipFindMany.mockResolvedValueOnce([
      internship({ id: "open", requiredSkills: " React \n\nTypeScript ", eligibleBranches: "Computer Science\n" }),
      internship({ id: "closed", acceptingApplications: false }),
    ]);
    const result = await listStudentInternshipEligibility(7);
    expect(db.internshipFindMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: { published: true } }));
    expect(result.kind).toBe("available");
    if (result.kind === "available") {
      expect(result.profile).toBeNull();
      expect(result.profileComplete).toBe(false);
      expect(result.internships[0]).toMatchObject({
        id: "open", isOpen: true, eligibleBranches: ["Computer Science"],
        requiredSkills: ["React", "TypeScript"], eligibility: { status: "undetermined" },
      });
      expect(result.internships[1].isOpen).toBe(false);
    }

    db.userFindUnique.mockResolvedValueOnce(student({ studentProfile: { branch: "  ", cgpa: Number.NaN, yearOfStudy: "THIRD" } }));
    db.internshipFindMany.mockResolvedValueOnce([]);
    const incomplete = await listStudentInternshipEligibility(7);
    expect(incomplete.kind).toBe("available");
    if (incomplete.kind === "available") expect(incomplete.profileComplete).toBe(false);
  });

  it("formats a student's applications across expired, closed, today, soon, and open deadlines", async () => {
    const today = new Date();
    const utcToday = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
    const deadline = (days: number) => new Date(utcToday + days * 86_400_000 + 12 * 60 * 60 * 1000);
    db.applicationFindMany.mockResolvedValue([
      { id: 1, status: "Pending", appliedAt: today, resumeStorageKey: null, internship: internship({ applicationDeadline: deadline(-1) }) },
      { id: 2, status: "Pending", appliedAt: today, resumeStorageKey: "key", internship: internship({ applicationDeadline: deadline(2), published: false }) },
      { id: 3, status: "Pending", appliedAt: today, resumeStorageKey: null, internship: internship({ applicationDeadline: deadline(0) }) },
      { id: 4, status: "Pending", appliedAt: today, resumeStorageKey: null, internship: internship({ applicationDeadline: deadline(1) }) },
      { id: 5, status: "Pending", appliedAt: today, resumeStorageKey: null, internship: internship({ applicationDeadline: deadline(7), acceptingApplications: false }) },
      { id: 6, status: "Pending", appliedAt: today, resumeStorageKey: null, internship: internship({ applicationDeadline: deadline(8) }) },
    ]);

    const applications = await listStudentApplications(7);
    expect(db.applicationFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { studentId: 7 }, orderBy: { appliedAt: "desc" } }));
    expect(applications.map(({ deadlineStatus, deadlineMessage }) => [deadlineStatus, deadlineMessage])).toEqual([
      ["Closed", "Deadline passed"],
      ["Closed", "Applications closed"],
      ["Closing soon", "Deadline is today"],
      ["Closing soon", "1 day left"],
      ["Closed", "Applications closed"],
      ["Open", "8 days left"],
    ]);
    expect(applications[0].internship.applicationDeadline).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(applications[1].resumeUrl).toBe("/api/student/applications/2/resume");
    expect(applications[2].resumeUrl).toBeNull();
  });

  it("creates eligible applications and handles each precondition and resume validation result", async () => {
    configureAvailableContext({ listing: null });
    expect(await createStudentApplication(7, "missing")).toEqual({ kind: "internship-not-found" });
    configureAvailableContext({ user: null });
    expect(await createStudentApplication(7, "intern-1")).toEqual({ kind: "student-not-found" });
    configureAvailableContext({ application: { id: 9, status: "Pending" } });
    expect(await createStudentApplication(7, "intern-1")).toEqual({ kind: "already-applied" });
    configureAvailableContext({ listing: internship({ published: false }) });
    expect(await createStudentApplication(7, "intern-1")).toEqual({ kind: "applications-closed" });
    configureAvailableContext({ listing: internship({ acceptingApplications: false }) });
    expect(await createStudentApplication(7, "intern-1")).toEqual({ kind: "applications-closed" });
    configureAvailableContext({ user: student({ studentProfile: { branch: "Arts", cgpa: 5, yearOfStudy: "THIRD" } }) });
    expect(await createStudentApplication(7, "intern-1")).toMatchObject({ kind: "ineligible" });

    configureAvailableContext();
    const resume = new File(["%PDF-test"], "resume.pdf", { type: "application/pdf" });
    db.validateResume.mockResolvedValueOnce("Resume must be a PDF.");
    expect(await createStudentApplication(7, "intern-1", resume)).toEqual({ kind: "invalid-resume", error: "Resume must be a PDF." });
    expect(db.applicationCreate).not.toHaveBeenCalled();

    db.applicationCreate.mockResolvedValueOnce({ id: 12, status: "Pending", appliedAt: new Date() });
    expect(await createStudentApplication(7, "intern-1")).toMatchObject({ kind: "created", application: { id: 12 } });
    expect(db.applicationCreate).toHaveBeenLastCalledWith(expect.objectContaining({
      data: { studentId: 7, internshipId: "intern-1", status: "Pending", resumeStorageKey: undefined },
    }));

    db.validateResume.mockResolvedValueOnce(null);
    db.storeResume.mockResolvedValueOnce("stored/cv");
    db.applicationCreate.mockResolvedValueOnce({ id: 13, status: "Pending", appliedAt: new Date() });
    expect(await createStudentApplication(7, "intern-1", resume)).toMatchObject({ kind: "created" });
    expect(db.applicationCreate).toHaveBeenLastCalledWith(expect.objectContaining({
      data: expect.objectContaining({ resumeStorageKey: "stored/cv" }),
    }));
  });

  it("removes a stored resume if application creation fails and propagates database errors", async () => {
    configureAvailableContext();
    const resume = new File(["%PDF-test"], "resume.pdf", { type: "application/pdf" });
    db.applicationCreate.mockRejectedValueOnce(new Error("database unavailable"));
    await expect(createStudentApplication(7, "intern-1")).rejects.toThrow("database unavailable");
    expect(db.deleteResume).not.toHaveBeenCalled();

    db.storeResume.mockResolvedValueOnce("stored/failed-cv");
    db.applicationCreate.mockRejectedValueOnce(new Error("database unavailable"));
    await expect(createStudentApplication(7, "intern-1", resume)).rejects.toThrow("database unavailable");
    expect(db.deleteResume).toHaveBeenCalledWith("stored/failed-cv");
  });

  it("filters and maps administrative applications without exposing storage keys", async () => {
    db.internshipFindMany.mockResolvedValue([{ id: "intern-1", company: "Example Co", role: "Engineer" }]);
    expect(await listAdminApplications({ internshipId: "missing", studentName: "", status: "" })).toBeNull();

    db.applicationFindMany.mockResolvedValue([{
      id: 1, status: "Pending", appliedAt: new Date(), resumeStorageKey: "private/key",
      student: { name: "Sam", studentProfile: { skills: ["React", 3, "SQL"] } },
      internship: { id: "intern-1", company: "Example Co", role: "Engineer" },
    }, {
      id: 2, status: "Rejected", appliedAt: new Date(), resumeStorageKey: null,
      student: { name: null, studentProfile: { skills: "not-an-array" } },
      internship: { id: "intern-1", company: "Example Co", role: "Engineer" },
    }]);
    const result = await listAdminApplications({ internshipId: "intern-1", studentName: "Sam", status: "Pending" });
    expect(db.applicationFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { internshipId: "intern-1", status: "Pending", student: { is: { name: { contains: "Sam" } } } },
    }));
    expect(result?.applications).toMatchObject([
      { id: 1, student: { name: "Sam", skills: ["React", "SQL"] }, resumeUrl: "/api/admin/applications/1/resume" },
      { id: 2, student: { name: null, skills: [] }, resumeUrl: null },
    ]);
    expect(JSON.stringify(result)).not.toContain("private/key");

    db.applicationFindMany.mockResolvedValue([{ id: 3, resumeStorageKey: null, student: { name: "No profile", studentProfile: null }, internship: {} }]);
    await listAdminApplications({ internshipId: "", studentName: "", status: "" });
    expect(db.applicationFindMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: {} }));
  });

  it("recognizes Prisma uniqueness and missing-row errors and forwards status/resume queries", async () => {
    expect(isUniqueApplicationError({ code: "P2002" })).toBe(true);
    expect(isUniqueApplicationError({ code: "P2025" })).toBe(false);
    expect(isUniqueApplicationError(null)).toBe(false);
    expect(isMissingApplicationError({ code: "P2025" })).toBe(true);
    expect(isMissingApplicationError("P2025")).toBe(false);

    db.applicationUpdate.mockResolvedValue({ id: 4, status: "Selected" });
    await expect(updateApplicationStatus(4, "Selected")).resolves.toEqual({ id: 4, status: "Selected" });
    expect(db.applicationUpdate).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 4 }, data: { status: "Selected" } }));

    db.applicationFindFirst.mockResolvedValue({ resumeStorageKey: "private/key" });
    await expect(getApplicationResumeKey(4, 7, false)).resolves.toEqual({ resumeStorageKey: "private/key" });
    expect(db.applicationFindFirst).toHaveBeenLastCalledWith(expect.objectContaining({ where: { id: 4, studentId: 7 } }));
    await getApplicationResumeKey(4, 7, true);
    expect(db.applicationFindFirst).toHaveBeenLastCalledWith(expect.objectContaining({ where: { id: 4 } }));
  });
});
