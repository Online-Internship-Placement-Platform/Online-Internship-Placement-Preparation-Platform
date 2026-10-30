import { beforeEach, describe, expect, it, vi } from "vitest";

const create = vi.hoisted(() => vi.fn());
const update = vi.hoisted(() => vi.fn());
const remove = vi.hoisted(() => vi.fn());
const countApplications = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: {
    internship: { create, update, delete: remove },
    application: { count: countApplications },
  },
}));

import { createInternship, deleteInternship, updateInternship } from "@/modules/internships/internship-service";

const record = {
  company: "Example Co", role: "Frontend Intern", domain: "Software Development" as const,
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
});
