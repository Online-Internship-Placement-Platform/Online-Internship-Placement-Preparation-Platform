import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkEligibility,
  evaluateStudentEligibility,
  getEligibilityChecks,
  isInternshipOpenForApplications,
  normalizeStudentSkills,
  type InternshipEligibilityRequirements,
  type StudentEligibilityProfile,
} from "@/modules/applications/eligibility";

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

const now = new Date("2030-06-01T12:00:00.000Z");
const studentId = 42;
const internshipId = "tc10-eligible-internship";

const eligibleStudent: StudentEligibilityProfile = {
  cgpa: 8.2,
  branch: " Computer Science ",
  skills: ["TypeScript", " React ", "SQL"],
};

const eligibleInternship: InternshipEligibilityRequirements = {
  minCgpa: 7.5,
  eligibleBranches: ["Information Technology", "computer science"],
  requiredSkills: ["react", " SQL "],
  applicationDeadline: "2030-06-30",
};

function makePostRequest() {
  return new Request(`http://localhost/api/internships/${internshipId}/applications`, {
    method: "POST",
    body: new FormData(),
  });
}

describe("internship eligibility validation", () => {
  it("marks a student eligible when CGPA, branch, skills, and deadline all qualify", () => {
    expect(checkEligibility(eligibleStudent, eligibleInternship, now)).toEqual({
      eligible: true,
      status: "eligible",
      reasons: [],
    });
  });

  it("marks a student ineligible when CGPA is below the internship minimum", () => {
    const result = checkEligibility({ ...eligibleStudent, cgpa: 7 }, eligibleInternship, now);

    expect(result.eligible).toBe(false);
    expect(result.status).toBe("ineligible");
    expect(result.reasons).toEqual(["Student CGPA is below the internship minimum."]);
  });

  it("marks a student ineligible when their branch is not listed", () => {
    const result = checkEligibility({ ...eligibleStudent, branch: "Mechanical Engineering" }, eligibleInternship, now);

    expect(result.eligible).toBe(false);
    expect(result.status).toBe("ineligible");
    expect(result.reasons).toEqual(["Student branch is not eligible for this internship."]);
  });

  it("marks a student ineligible and explains each missing required skill", () => {
    const result = checkEligibility({ ...eligibleStudent, skills: ["React"] }, eligibleInternship, now);

    expect(result.eligible).toBe(false);
    expect(result.status).toBe("ineligible");
    expect(result.reasons).toEqual(["Student is missing required skill: sql."]);
  });

  it("collects explanations when multiple eligibility criteria fail", () => {
    const result = checkEligibility(
      { cgpa: 6, branch: "Arts", skills: [] },
      { ...eligibleInternship, applicationDeadline: "2030-05-31" },
      now,
    );

    expect(result.eligible).toBe(false);
    expect(result.status).toBe("ineligible");
    expect(result.reasons).toEqual([
      "Student CGPA is below the internship minimum.",
      "Student branch is not eligible for this internship.",
      "Student is missing required skill: react.",
      "Student is missing required skill: sql.",
      "Application deadline has passed.",
    ]);
  });

  it("accepts any branch when the internship explicitly allows any branch", () => {
    expect(checkEligibility(eligibleStudent, { ...eligibleInternship, eligibleBranches: ["Any branch"] }, now)).toMatchObject({
      eligible: true,
      status: "eligible",
      reasons: [],
    });
  });

  it("normalizes saved skill names and supported saved-skill formats", () => {
    expect(normalizeStudentSkills('["React", "SQL"]')).toEqual(["React", "SQL"]);
    expect(normalizeStudentSkills("React, SQL")).toEqual(["React", "SQL"]);
    expect(checkEligibility({ ...eligibleStudent, skills: "React, TypeScript, SQL" }, eligibleInternship, now).status).toBe("eligible");
  });

  it("returns criterion-level results for the eligibility display", () => {
    const checks = getEligibilityChecks(eligibleStudent, eligibleInternship, now);

    expect(checks.find((check) => check.criterion === "CGPA")).toMatchObject({ eligible: true, determinate: true });
    expect(checks.find((check) => check.criterion === "Branch")).toMatchObject({ eligible: true, determinate: true });
    expect(checks.find((check) => check.criterion === "react")).toMatchObject({ eligible: true, determinate: true, reasons: [] });
    expect(checks.find((check) => check.criterion === "sql")).toMatchObject({ eligible: true, determinate: true, reasons: [] });
  });

  it("marks missing or invalid profile values undetermined rather than eligible", () => {
    const result = checkEligibility({ cgpa: Number.NaN, branch: "", skills: [] }, eligibleInternship, now);

    expect(result.eligible).toBe(false);
    expect(result.status).toBe("undetermined");
    expect(result.reasons).toEqual(expect.arrayContaining([
      "Student CGPA must be a finite number from 0 to 10.",
      "Student branch is required.",
      "Student is missing required skill: react.",
    ]));
  });

  it("reports invalid student CGPA, internship minimum CGPA, and deadline values", () => {
    const result = checkEligibility(
      { ...eligibleStudent, cgpa: Number.NaN },
      { ...eligibleInternship, minCgpa: 11, applicationDeadline: "not-a-date" },
      now,
    );

    expect(result.eligible).toBe(false);
    expect(result.status).toBe("undetermined");
    expect(result.reasons).toEqual([
      "Student CGPA must be a finite number from 0 to 10.",
      "Internship minimum CGPA must be a finite number from 0 to 10.",
      "Application deadline is invalid.",
    ]);
  });

  it("marks a genuinely missing student profile undetermined", () => {
    expect(evaluateStudentEligibility(null, eligibleInternship, now).eligibility).toEqual({
      eligible: false,
      status: "undetermined",
      reasons: ["Your student profile could not be retrieved."],
    });
  });

  it("uses the selected internship's own CGPA and skill requirements", () => {
    const result = evaluateStudentEligibility(eligibleStudent, {
      ...eligibleInternship,
      minCgpa: 8.5,
      requiredSkills: ["React", "Python"],
    }, now).eligibility;

    expect(result.status).toBe("ineligible");
    expect(result.reasons).toEqual([
      "Student CGPA is below the internship minimum.",
      "Student is missing required skill: python.",
    ]);
  });

  it("rejects expired and invalid deadlines and accepts the exact deadline instant", () => {
    expect(checkEligibility(eligibleStudent, { ...eligibleInternship, applicationDeadline: "2030-05-31" }, now).reasons)
      .toEqual(["Application deadline has passed."]);

    const deadline = new Date("2030-06-30T12:00:00.000Z");
    expect(checkEligibility(eligibleStudent, { ...eligibleInternship, applicationDeadline: deadline }, deadline).eligible).toBe(true);
    expect(checkEligibility(eligibleStudent, { ...eligibleInternship, applicationDeadline: deadline }, new Date(deadline.getTime() + 1)).reasons)
      .toEqual(["Application deadline has passed."]);

    expect(checkEligibility(eligibleStudent, { ...eligibleInternship, applicationDeadline: "2030-02-30" }, now).reasons)
      .toEqual(["Application deadline is invalid."]);

    expect(checkEligibility(eligibleStudent, { ...eligibleInternship, applicationDeadline: "2030-02-30" }, new Date(Number.NaN)).reasons)
      .toEqual(["Application deadline is invalid.", "Current date/time is invalid."]);
  });
});

describe("POST /api/internships/[internshipId]/applications eligibility gate", () => {
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
      eligibleBranches: "Information Technology\nComputer Science",
      requiredSkills: "React\nTypeScript",
    });
    userFindUnique.mockResolvedValue({
      id: studentId,
      role: "STUDENT",
      name: "Test Student",
      email: "student@example.test",
      studentProfile: {
        branch: "Computer Science",
        cgpa: 8.2,
        skills: ["React", "TypeScript"],
        yearOfStudy: "THIRD",
      },
    });
    applicationFindUnique.mockResolvedValue(null);
    applicationCreate.mockResolvedValue({ id: 9002, status: "Pending", appliedAt: now });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows an eligible student to submit", async () => {
    const response = await POST(makePostRequest(), { params: Promise.resolve({ internshipId }) });

    expect(response.status).toBe(201);
    expect((await response.json()).application).toMatchObject({ id: 9002, status: "Pending" });
    expect(applicationCreate).toHaveBeenCalledTimes(1);
  });

  it.each([
    {
      scenario: "insufficient CGPA",
      profile: { cgpa: 7, branch: "Computer Science", skills: ["React", "TypeScript"] },
      reason: "Student CGPA is below the internship minimum.",
    },
    {
      scenario: "an ineligible branch",
      profile: { cgpa: 8.2, branch: "Mechanical Engineering", skills: ["React", "TypeScript"] },
      reason: "Student branch is not eligible for this internship.",
    },
    {
      scenario: "a missing required skill",
      profile: { cgpa: 8.2, branch: "Computer Science", skills: ["React"] },
      reason: "Student is missing required skill: typescript.",
    },
  ])("blocks submission for $scenario with a reason", async ({ profile, reason }) => {
    userFindUnique.mockResolvedValue({
      id: studentId,
      role: "STUDENT",
      name: "Test Student",
      email: "student@example.test",
      studentProfile: { ...profile, yearOfStudy: "THIRD" },
    });

    const response = await POST(makePostRequest(), { params: Promise.resolve({ internshipId }) });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: reason });
    expect(applicationCreate).not.toHaveBeenCalled();
  });
});

describe("internship application availability", () => {
  it("requires publication, accepting applications, and an open deadline", () => {
    expect(isInternshipOpenForApplications(true, true, "2030-06-30", now)).toBe(true);
    expect(isInternshipOpenForApplications(false, true, "2030-06-30", now)).toBe(false);
    expect(isInternshipOpenForApplications(true, false, "2030-06-30", now)).toBe(false);
    expect(isInternshipOpenForApplications(true, true, "2030-05-31", now)).toBe(false);
    expect(isInternshipOpenForApplications(true, true, "2030-02-30", now)).toBe(false);
  });
});
