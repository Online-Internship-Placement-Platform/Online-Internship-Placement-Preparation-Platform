import { prisma } from "@/lib/prisma";
import type { InternshipInput } from "@/modules/internships/internship-validation";

function serializeInternship(internship: {
  id: string;
  company: string;
  role: string;
  domain: string;
  stipendPerMonth: number;
  type: string;
  location: string | null;
  description: string;
  applicationDeadline: Date;
  minCgpa: number;
  eligibleBranches: string;
  requiredSkills: string;
  published: boolean;
  acceptingApplications: boolean;
}) {
  return {
    ...internship,
    applicationDeadline: internship.applicationDeadline.toISOString().slice(0, 10),
    eligibleBranches: internship.eligibleBranches.split("\n").filter(Boolean),
    requiredSkills: internship.requiredSkills.split("\n").filter(Boolean),
  };
}

const internshipSelect = {
  id: true,
  company: true,
  role: true,
  domain: true,
  stipendPerMonth: true,
  type: true,
  location: true,
  description: true,
  applicationDeadline: true,
  minCgpa: true,
  eligibleBranches: true,
  requiredSkills: true,
  published: true,
  acceptingApplications: true,
} as const;

export async function listAdminInternships() {
  const records = await prisma.internship.findMany({
    orderBy: [{ applicationDeadline: "asc" }, { company: "asc" }, { role: "asc" }],
    select: internshipSelect,
  });
  return records.map(serializeInternship);
}

export async function getAdminInternship(id: string) {
  const internship = await prisma.internship.findUnique({ where: { id }, select: internshipSelect });
  return internship ? serializeInternship(internship) : null;
}

export async function createInternship(input: InternshipInput) {
  const internship = await prisma.internship.create({
    data: {
      company: input.company,
      role: input.role,
      domain: input.domain,
      stipendPerMonth: input.stipendPerMonth,
      type: input.type,
      location: input.location,
      description: input.description,
      applicationDeadline: new Date(`${input.applicationDeadline}T00:00:00.000Z`),
      minCgpa: input.minCgpa,
      eligibleBranches: input.eligibleBranches.join("\n"),
      requiredSkills: input.requiredSkills.join("\n"),
      published: input.published,
      acceptingApplications: input.acceptingApplications,
    },
    select: internshipSelect,
  });
  return serializeInternship(internship);
}

export async function updateInternship(id: string, input: InternshipInput) {
  const internship = await prisma.internship.update({
    where: { id },
    data: {
      company: input.company,
      role: input.role,
      domain: input.domain,
      stipendPerMonth: input.stipendPerMonth,
      type: input.type,
      location: input.location,
      description: input.description,
      applicationDeadline: new Date(`${input.applicationDeadline}T00:00:00.000Z`),
      minCgpa: input.minCgpa,
      eligibleBranches: input.eligibleBranches.join("\n"),
      requiredSkills: input.requiredSkills.join("\n"),
      published: input.published,
      acceptingApplications: input.acceptingApplications,
    },
    select: internshipSelect,
  });
  return serializeInternship(internship);
}

export async function deleteInternship(id: string) {
  const applicationCount = await prisma.application.count({ where: { internshipId: id } });
  if (applicationCount > 0) return { kind: "has-applications" as const };
  await prisma.internship.delete({ where: { id } });
  return { kind: "deleted" as const };
}

export function isMissingInternshipError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2025";
}
