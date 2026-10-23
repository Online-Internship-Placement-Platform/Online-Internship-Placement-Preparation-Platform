import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/server-session";
import { checkEligibility, getEligibilityChecks } from "@/modules/applications/eligibility";
import { deleteResume, storeResume, validateResume } from "@/lib/private-resume-storage";

type RouteContext = { params: Promise<{ internshipId: string }> };

function eligibility(student: { branch: string | null; cgpa: number | null; skills: string }, internship: {
  minCgpa: number; eligibleBranches: string; requiredSkills: string; applicationDeadline: Date;
}) {
  return checkEligibility(
    { branch: student.branch ?? "", cgpa: student.cgpa ?? Number.NaN, skills: student.skills.split("\n").filter(Boolean) },
    {
      minCgpa: internship.minCgpa,
      eligibleBranches: internship.eligibleBranches.split("\n").map((value) => value.trim()).filter(Boolean),
      requiredSkills: internship.requiredSkills.split("\n").filter(Boolean),
      applicationDeadline: internship.applicationDeadline.toISOString().slice(0, 10),
    },
  );
}

function eligibilityChecks(student: { branch: string | null; cgpa: number | null; skills: string }, internship: {
  minCgpa: number; eligibleBranches: string; requiredSkills: string; applicationDeadline: Date;
}) {
  return getEligibilityChecks(
    { branch: student.branch ?? "", cgpa: student.cgpa ?? Number.NaN, skills: student.skills.split("\n").filter(Boolean) },
    {
      minCgpa: internship.minCgpa,
      eligibleBranches: internship.eligibleBranches.split("\n").map((value) => value.trim()).filter(Boolean),
      requiredSkills: internship.requiredSkills.split("\n").filter(Boolean),
      applicationDeadline: internship.applicationDeadline.toISOString().slice(0, 10),
    },
  );
}

async function getApplicationContext(internshipId: string, userId: number) {
  const internship = await prisma.internship.findUnique({ where: { id: internshipId } });
  if (!internship) return { missing: true as const };
  const [student, application] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, name: true, email: true, branch: true, cgpa: true, skills: true } }),
    prisma.application.findUnique({ where: { studentId_internshipId: { studentId: userId, internshipId } }, select: { id: true, status: true } }),
  ]);
  if (!student || student.role !== "student") return { invalidStudent: true as const };
  return { internship, student, application, eligibility: eligibility(student, internship) };
}

export async function GET(_request: Request, { params }: RouteContext) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Sign in to check application availability." }, { status: 401 });
  if (session.role !== "student") return NextResponse.json({ error: "Only students can apply for internships." }, { status: 403 });
  try {
    const { internshipId } = await params;
    const context = await getApplicationContext(internshipId, session.userId);
    if ("missing" in context) return NextResponse.json({ error: "This internship could not be found." }, { status: 404 });
    if ("invalidStudent" in context) return NextResponse.json({ error: "Your student account could not be verified." }, { status: 403 });
    const isOpen = context.internship.published && context.internship.acceptingApplications;
    const alreadyApplied = Boolean(context.application);
    const canApply = isOpen && !alreadyApplied && context.eligibility.eligible;
    return NextResponse.json({
      eligible: context.eligibility.eligible,
      canApply, isOpen, alreadyApplied,
      applicationStatus: context.application?.status,
      reason: alreadyApplied ? "You have already applied to this internship." : !isOpen ? "Applications for this internship are closed." : context.eligibility.reasons.join(" ") || undefined,
      eligibilityReasons: context.eligibility.reasons,
      eligibilityChecks: eligibilityChecks(context.student, context.internship),
      student: { name: context.student.name, email: context.student.email, branch: context.student.branch, cgpa: context.student.cgpa, skills: context.student.skills.split("\n").filter(Boolean) },
      profileResumeAvailable: false,
    });
  } catch (error) {
    console.error("Could not check internship application availability.", error);
    return NextResponse.json({ error: "Application availability is temporarily unavailable. Please try again." }, { status: 503 });
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Sign in to apply for an internship." }, { status: 401 });
  if (session.role !== "student") return NextResponse.json({ error: "Only students can submit applications." }, { status: 403 });

  let resumeKey: string | undefined;
  try {
    const { internshipId } = await params;
    const context = await getApplicationContext(internshipId, session.userId);
    if ("missing" in context) return NextResponse.json({ error: "This internship could not be found." }, { status: 404 });
    if ("invalidStudent" in context) return NextResponse.json({ error: "Your student account could not be verified." }, { status: 403 });
    if (context.application) return NextResponse.json({ error: "You have already applied to this internship." }, { status: 409 });
    if (!context.internship.published || !context.internship.acceptingApplications || !context.eligibility.eligible) {
      const reason = !context.internship.published || !context.internship.acceptingApplications
        ? "Applications for this internship are closed."
        : context.eligibility.reasons.join(" ");
      return NextResponse.json({ error: reason }, { status: 400 });
    }

    const formData = await request.formData();
    const resume = formData.get("resume");
    if (resume !== null) {
      if (!(resume instanceof File)) return NextResponse.json({ error: "Choose a PDF resume file." }, { status: 400 });
      const validationError = await validateResume(resume);
      if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
      resumeKey = await storeResume(resume);
    }

    const application = await prisma.application.create({
      data: { studentId: session.userId, internshipId, status: "Pending", resumeStorageKey: resumeKey },
      select: { id: true, status: true, appliedAt: true },
    });
    return NextResponse.json({ application, resumeUrl: resumeKey ? `/api/student/applications/${application.id}/resume` : null }, { status: 201 });
  } catch (error) {
    if (resumeKey) await deleteResume(resumeKey);
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "You have already applied to this internship." }, { status: 409 });
    }
    console.error("Application submission failed.", error);
    return NextResponse.json({ error: error instanceof Error && error.message.includes("valid PDF") ? error.message : "Application service is temporarily unavailable. Please try again." }, { status: 503 });
  }
}
