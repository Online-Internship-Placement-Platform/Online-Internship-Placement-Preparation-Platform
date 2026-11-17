import { beforeEach, describe, expect, it, vi } from "vitest";

const create = vi.hoisted(() => vi.fn());
const update = vi.hoisted(() => vi.fn());
const remove = vi.hoisted(() => vi.fn());
const countApplications = vi.hoisted(() => vi.fn());
const list = vi.hoisted(() => vi.fn());
const find = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: {
    internship: { create, update, delete: remove, findMany: list, findUnique: find },
    application: { count: countApplications },
  },
}));

import { createInternship, deleteInternship, getAdminInternship, isMissingInternshipError, listAdminInternships, updateInternship } from "@/modules/internships/internship-service";

const record = {
  company: "Example Co", role: "Frontend Intern", domain: "Software Development" as const,
  stipendPerMonth: 12000, type: "remote" as const, location: null, description: "Build web features.",
  applicationDeadline: "2030-06-30", minCgpa: 7.5,
  eligibleBranches: ["Computer Science"], requiredSkills: ["React"],
  published: false, acceptingApplications: false,
};

describe("internship management service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates an unpublished draft with application status explicitly closed", async () => {
    create.mockImplementation(async ({ data }) => ({
      ...data,
      applicationDeadline: data.applicationDeadline,
      eligibleBranches: data.eligibleBranches,
      requiredSkills: data.requiredSkills,
    }));

    await createInternship(record);

    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        domain: record.domain, published: false, acceptingApplications: false,
        eligibleBranches: "Computer Science", requiredSkills: "React",
      }),
    }));
  });

  it("persists publication and accepting-application flags independently on edit", async () => {
    update.mockImplementation(async ({ data }) => ({
      id: "internship-id", ...data,
      applicationDeadline: data.applicationDeadline,
      eligibleBranches: data.eligibleBranches,
      requiredSkills: data.requiredSkills,
    }));

    await updateInternship("internship-id", { ...record, published: true, acceptingApplications: false });

    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "internship-id" },
      data: expect.objectContaining({ published: true, acceptingApplications: false }),
    }));
  });

  it("protects applications by refusing to delete an internship they reference", async () => {
    countApplications.mockResolvedValue(2);

    await expect(deleteInternship("internship-id")).resolves.toEqual({ kind: "has-applications" });
    expect(remove).not.toHaveBeenCalled();
  });

  it("lists and serializes internships with newline-separated list fields", async () => {
    list.mockResolvedValue([{
      id: "internship-id", company: "Example Co", role: "Frontend Intern", domain: "Software Development",
      stipendPerMonth: 12000, type: "remote", location: null, description: "Build web features.",
      applicationDeadline: new Date("2030-06-30T00:00:00.000Z"), minCgpa: 7.5,
      eligibleBranches: "CS\n\nIT", requiredSkills: "React\nTypeScript", published: false, acceptingApplications: false,
    }]);
    const result = await listAdminInternships();
    expect(result[0]).toMatchObject({ applicationDeadline: "2030-06-30", eligibleBranches: ["CS", "IT"], requiredSkills: ["React", "TypeScript"] });
    expect(list).toHaveBeenCalledWith(expect.objectContaining({ orderBy: [{ applicationDeadline: "asc" }, { company: "asc" }, { role: "asc" }] }));
  });

  it("returns a serialized record or null from admin lookup", async () => {
    find.mockResolvedValueOnce(null);
    await expect(getAdminInternship("missing")).resolves.toBeNull();
    find.mockResolvedValueOnce({
      id: "internship-id", company: "Example Co", role: "Frontend Intern", domain: "Software Development",
      stipendPerMonth: 12000, type: "remote", location: null, description: "Build web features.",
      applicationDeadline: new Date("2030-06-30T00:00:00.000Z"), minCgpa: 7.5,
      eligibleBranches: "CS", requiredSkills: "React", published: true, acceptingApplications: true,
    });
    await expect(getAdminInternship("internship-id")).resolves.toMatchObject({ id: "internship-id", eligibleBranches: ["CS"], requiredSkills: ["React"] });
  });

  it("deletes only unused internships and recognizes only Prisma missing-row errors", async () => {
    countApplications.mockResolvedValue(0);
    remove.mockResolvedValue(undefined);
    await expect(deleteInternship("unused")).resolves.toEqual({ kind: "deleted" });
    expect(remove).toHaveBeenCalledWith({ where: { id: "unused" } });
    expect(isMissingInternshipError({ code: "P2025" })).toBe(true);
    expect(isMissingInternshipError({ code: "P2002" })).toBe(false);
    expect(isMissingInternshipError(null)).toBe(false);
  });
});
