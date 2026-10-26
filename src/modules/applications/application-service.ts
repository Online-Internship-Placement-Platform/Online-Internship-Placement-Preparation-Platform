import { prisma } from "@/lib/prisma";
import { deleteResume, storeResume, validateResume } from "@/lib/private-resume-storage";
import { applicationResumeFilter } from "@/modules/applications/application-access";
import type { AdminApplicationFilters } from "@/modules/applications/application-validation";
import { checkEligibility, getEligibilityChecks } from "@/modules/applications/eligibility";

type StudentProfile = {
  id: number;
  role: "STUDENT" | "ADMIN" | "SUPER_ADMIN";
  name: string | null;
  email: string;
  studentProfile: { branch: string; cgpa: number; skills: unknown; yearOfStudy: "FIRST" | "SECOND" | "THIRD" | "FOURTH" } | null;
};

type InternshipRequirements = {
  id: string;
  company: string;
  role: string;
  applicationDeadline: Date;
  published: boolean;
  acceptingApplications: boolean;
  minCgpa: number;
  eligibleBranches: string;
  requiredSkills: string;
};

function eligibilityProfile(student: StudentProfile) {
  const profile = student.studentProfile;
  return {
    branch: profile?.branch ?? "",
    cgpa: profile?.cgpa ?? Number.NaN,
    skills: Array.isArray(profile?.skills) && profile.skills.every((skill) => typeof skill === "string") ? profile.skills : [],
  };
}

function eligibilityRequirements(internship: InternshipRequirements) {
  return {
    minCgpa: internship.minCgpa,
    eligibleBranches: internship.eligibleBranches.split("\n").map((value) => value.trim()).filter(Boolean),
    requiredSkills: internship.requiredSkills.split("\n").filter(Boolean),
    applicationDeadline: internship.applicationDeadline.toISOString().slice(0, 10),
  };
}

export async function getApplicationContext(internshipId: string, userId: number) {
  const [internship, student, application] = await Promise.all([
    prisma.internship.findUnique({
      where: { id: internshipId },
      select: {
        id: true, company: true, role: true, applicationDeadline: true, published: true,
        acceptingApplications: true, minCgpa: true, eligibleBranches: true, requiredSkills: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, name: true, email: true, studentProfile: { select: { branch: true, cgpa: true, skills: true, yearOfStudy: true } } },
    }),
    prisma.application.findUnique({
      where: { studentId_internshipId: { studentId: userId, internshipId } },
      select: { id: true, status: true },
    }),
  ]);

  if (!internship) return { kind: "internship-not-found" as const };
  if (!student || student.role !== "STUDENT" || !student.studentProfile) return { kind: "student-not-found" as const };

  const profile = eligibilityProfile(student);
  const requirements = eligibilityRequirements(internship);
  return {
    kind: "available" as const,
    internship,
    student,
    application,
    eligibility: checkEligibility(profile, requirements),
    eligibilityChecks: getEligibilityChecks(profile, requirements),
  };
}

export async function listStudentApplications(userId: number) {
  const applications = await prisma.application.findMany({
    where: { studentId: userId },
    orderBy: { appliedAt: "desc" },
    select: {
      id: true,
      status: true,
      appliedAt: true,
      resumeStorageKey: true,
      internship: {
        select: {
          id: true,
          company: true,
          role: true,
          applicationDeadline: true,
          published: true,
          acceptingApplications: true,
        },
      },
    },
  });

  const today = new Date();
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return applications.map(({ resumeStorageKey, internship, ...application }) => {
    const deadline = internship.applicationDeadline.toISOString().slice(0, 10);
    const [year, month, day] = deadline.split("-").map(Number);
    const daysRemaining = Math.round((Date.UTC(year, month - 1, day) - todayUtc) / 86_400_000);
    const isExpired = daysRemaining < 0;
    const isAccepting = internship.published && internship.acceptingApplications && !isExpired;
    const deadlineStatus = !isAccepting ? "Closed" : daysRemaining <= 7 ? "Closing soon" : "Open";
    const deadlineMessage = isExpired
      ? "Deadline passed"
      : !internship.published || !internship.acceptingApplications
        ? "Applications closed"
        : daysRemaining === 0
          ? "Deadline is today"
          : `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} left`;

    return {
      ...application,
      internship: { id: internship.id, company: internship.company, role: internship.role, applicationDeadline: deadline },
      deadlineStatus,
      deadlineMessage,
      resumeUrl: resumeStorageKey ? `/api/student/applications/${application.id}/resume` : null,
    };
  });
}

export async function createStudentApplication(userId: number, internshipId: string, resume?: File) {
  const context = await getApplicationContext(internshipId, userId);
  if (context.kind !== "available") return context;
  if (context.application) return { kind: "already-applied" as const };
  if (!context.internship.published || !context.internship.acceptingApplications) {
    return { kind: "applications-closed" as const };
  }
  if (!context.eligibility.eligible) {
    return { kind: "ineligible" as const, reason: context.eligibility.reasons.join(" ") };
  }

  let resumeStorageKey: string | undefined;
  if (resume) {
    const validationError = await validateResume(resume);
    if (validationError) return { kind: "invalid-resume" as const, error: validationError };
    resumeStorageKey = await storeResume(resume);
  }

  try {
    const application = await prisma.application.create({
      data: { studentId: userId, internshipId, status: "Pending", resumeStorageKey },
      select: { id: true, status: true, appliedAt: true },
    });
    return { kind: "created" as const, application };
  } catch (error) {
    if (resumeStorageKey) await deleteResume(resumeStorageKey);
    throw error;
  }
}

export async function listAdminApplications(filters: AdminApplicationFilters) {
  const internships = await prisma.internship.findMany({
    orderBy: [{ company: "asc" }, { role: "asc" }],
    select: { id: true, company: true, role: true },
  });
  if (filters.internshipId && !internships.some(({ id }) => id === filters.internshipId)) return null;

  const applications = await prisma.application.findMany({
    where: {
      ...(filters.internshipId ? { internshipId: filters.internshipId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.studentName ? { student: { is: { name: { contains: filters.studentName } } } } : {}),
    },
    orderBy: { appliedAt: "desc" },
    select: {
      id: true,
      status: true,
      appliedAt: true,
      resumeStorageKey: true,
      student: { select: { name: true, studentProfile: { select: { skills: true } } } },
      internship: { select: { id: true, company: true, role: true } },
    },
  });
  return {
    applications: applications.map(({ resumeStorageKey, student, ...application }) => ({
      ...application,
      student: {
        name: student.name,
        skills: Array.isArray(student.studentProfile?.skills) ? student.studentProfile.skills.filter((skill): skill is string => typeof skill === "string") : [],
      },
      resumeUrl: resumeStorageKey ? `/api/admin/applications/${application.id}/resume` : null,
    })),
    internships,
  };
}

export function isUniqueApplicationError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

export function isMissingApplicationError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2025";
}

export async function updateApplicationStatus(id: number, status: string) {
  return prisma.application.update({
    where: { id },
    data: { status },
    select: { id: true, status: true },
  });
}

export async function getApplicationResumeKey(id: number, userId: number, isAdmin: boolean) {
  return prisma.application.findFirst({
    where: applicationResumeFilter(id, userId, isAdmin),
    select: { resumeStorageKey: true },
  });
}
