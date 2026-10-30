import { beforeEach, describe, expect, it, vi } from "vitest";

const userFindUnique = vi.hoisted(() => vi.fn());
const internshipFindMany = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: userFindUnique },
    internship: { findMany: internshipFindMany },
  },
}));
vi.mock("@/lib/private-resume-storage", () => ({
  deleteResume: vi.fn(), storeResume: vi.fn(), validateResume: vi.fn(),
}));

import { listStudentInternshipEligibility } from "@/modules/applications/application-service";

describe("listStudentInternshipEligibility", () => {
  beforeEach(() => vi.clearAllMocks());

  it("queries only published internships and includes published closed listings", async () => {
    userFindUnique.mockResolvedValue({
      id: 7, role: "STUDENT",
      studentProfile: { branch: "Computer Science", cgpa: 8.6, skills: ["React", "TypeScript"], yearOfStudy: "THIRD" },
    });
    internshipFindMany.mockResolvedValue([{
      id: "published-closed", company: "Example Co", role: "Analyst", domain: "Data & Analytics",
      applicationDeadline: new Date("2030-06-30T00:00:00.000Z"), published: true, acceptingApplications: false,
      minCgpa: 8, eligibleBranches: "Computer Science", requiredSkills: "React",
    }]);

    const result = await listStudentInternshipEligibility(7);

    expect(userFindUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 7 } }));
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
      applicationDeadline: new Date("2030-06-30T00:00:00.000Z"), published: true, acceptingApplications: true,
      minCgpa: 7, eligibleBranches: "Any branch", requiredSkills: "React",
    }]);

    const result = await listStudentInternshipEligibility(7);

    expect(result.kind).toBe("available");
    if (result.kind !== "available") return;
    expect(result.profile).toBeNull();
    expect(result.internships[0].eligibility.status).toBe("undetermined");
  });
});
