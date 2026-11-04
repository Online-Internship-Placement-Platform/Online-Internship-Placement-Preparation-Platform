import { beforeEach, describe, expect, it, vi } from "vitest";

const userFindUnique = vi.hoisted(() => vi.fn());
const internshipFindMany = vi.hoisted(() => vi.fn());
const internshipFindUnique = vi.hoisted(() => vi.fn());
const applicationFindUnique = vi.hoisted(() => vi.fn());
const applicationCreate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: userFindUnique },
    internship: { findMany: internshipFindMany, findUnique: internshipFindUnique },
    application: { findUnique: applicationFindUnique, create: applicationCreate },
  },
}));
vi.mock("@/lib/private-resume-storage", () => ({
  deleteResume: vi.fn(), storeResume: vi.fn(), validateResume: vi.fn(),
}));

import { createStudentApplication, listStudentInternshipEligibility } from "@/modules/applications/application-service";

describe("listStudentInternshipEligibility", () => {
  beforeEach(() => vi.clearAllMocks());

  it("queries only published internships and includes published closed listings", async () => {
    userFindUnique.mockResolvedValue({
      id: 7, role: "STUDENT",
      studentProfile: { branch: "Computer Science", cgpa: 8.6, yearOfStudy: "THIRD" },
    });
    internshipFindMany.mockResolvedValue([{
      id: "published-closed", company: "Example Co", role: "Analyst", domain: "Data & Analytics",
      stipendPerMonth: 0, type: "remote", location: null, description: "",
      applicationDeadline: new Date("2030-06-30T00:00:00.000Z"), published: true, acceptingApplications: false,
      minCgpa: 8, eligibleBranches: "Computer Science", requiredSkills: "React",
    }]);

    const result = await listStudentInternshipEligibility(7);

    expect(userFindUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 7 } }));
    expect(userFindUnique.mock.calls[0][0].select.studentProfile.select).not.toHaveProperty("skills");
    expect(internshipFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { published: true } }));
    expect(result.kind).toBe("available");
    if (result.kind !== "available") return;
    expect(result.internships).toHaveLength(1);
    expect(result.internships[0]).toMatchObject({ domain: "Data & Analytics", isOpen: false, eligibility: { status: "eligible" } });
  });

  it("returns undetermined eligibility when the authenticated student has no saved profile", async () => {
    userFindUnique.mockResolvedValue({ id: 7, role: "STUDENT", studentProfile: null });
    internshipFindMany.mockResolvedValue([{
      id: "published", company: "Example Co", role: "Engineer", domain: "Software Development",
      stipendPerMonth: 0, type: "remote", location: null, description: "",
      applicationDeadline: new Date("2030-06-30T00:00:00.000Z"), published: true, acceptingApplications: true,
      minCgpa: 7, eligibleBranches: "Any branch", requiredSkills: "React",
    }]);

    const result = await listStudentInternshipEligibility(7);

    expect(result.kind).toBe("available");
    if (result.kind !== "available") return;
    expect(result.profile).toBeNull();
    expect(result.internships[0].eligibility.status).toBe("undetermined");
  });

  it("creates an application when skills do not match employer-listed skills", async () => {
    userFindUnique.mockResolvedValue({
      id: 7,
      role: "STUDENT",
      name: "Alex Sample",
      email: "alex@example.test",
      studentProfile: { branch: "Computer Science", cgpa: 8.6, yearOfStudy: "THIRD" },
    });
    internshipFindUnique.mockResolvedValue({
      id: "published",
      company: "Example Co",
      role: "Engineer",
      domain: "Software Development",
      stipendPerMonth: 0,
      type: "remote",
      location: null,
      description: "",
      applicationDeadline: new Date("2030-06-30T00:00:00.000Z"),
      published: true,
      acceptingApplications: true,
      minCgpa: 7,
      eligibleBranches: "Computer Science",
      requiredSkills: "Rust\nGo",
    });
    applicationFindUnique.mockResolvedValue(null);
    applicationCreate.mockResolvedValue({ id: 100, status: "Pending", appliedAt: new Date("2030-06-01T00:00:00.000Z") });

    const result = await createStudentApplication(7, "published");

    expect(result.kind).toBe("created");
    expect(applicationCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: { studentId: 7, internshipId: "published", status: "Pending", resumeStorageKey: undefined },
    }));
  });
});
