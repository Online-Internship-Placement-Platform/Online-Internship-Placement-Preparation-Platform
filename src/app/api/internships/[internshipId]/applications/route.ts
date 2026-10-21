import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/server-session";

type RouteContext = { params: Promise<{ internshipId: string }> };

function deadlineHasPassed(applicationDeadline: Date) {
  const deadline = new Date(applicationDeadline);
  deadline.setUTCHours(23, 59, 59, 999);
  return deadline.getTime() < Date.now();
}

function studentMeetsRequirements(
  student: { branch: string | null; cgpa: number | null },
  internship: { minCgpa: number; eligibleBranches: string },
) {
  const branches = internship.eligibleBranches.split("\n").map((branch) => branch.trim().toLocaleLowerCase());
  return student.cgpa !== null && student.cgpa >= internship.minCgpa &&
    (branches.includes("any branch") || Boolean(student.branch && branches.includes(student.branch.trim().toLocaleLowerCase())));
}

export async function GET(_request: Request, { params }: RouteContext) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Sign in to check application availability." }, { status: 401 });
  if (session.role !== "student") return NextResponse.json({ error: "Only students can apply for internships." }, { status: 403 });

  try {
    const { internshipId } = await params;
    const internship = await prisma.internship.findUnique({ where: { id: internshipId } });
    if (!internship) return NextResponse.json({ error: "This internship could not be found." }, { status: 404 });

    const [student, application] = await Promise.all([
      prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, role: true, branch: true, cgpa: true } }),
      prisma.application.findUnique({
        where: { studentId_internshipId: { studentId: session.userId, internshipId } },
        select: { status: true },
      }),
    ]);
    if (!student || student.role !== "student") {
      return NextResponse.json({ error: "Your student account could not be verified." }, { status: 403 });
    }

    const closed = !internship.published || !internship.acceptingApplications || deadlineHasPassed(internship.applicationDeadline);
    const eligible = studentMeetsRequirements(student, internship);
    const reason = application
      ? "You have already applied to this internship."
      : closed
        ? "Applications for this internship are closed."
        : !eligible
          ? "You do not meet this internship's eligibility requirements."
          : undefined;

    return NextResponse.json({
      canApply: !application && !closed && eligible,
      isOpen: !closed,
      alreadyApplied: Boolean(application),
      applicationStatus: application?.status,
      reason,
    });
  } catch (error) {
    console.error("Could not check internship application availability.", error);
    return NextResponse.json({ error: "Application availability is temporarily unavailable. Please try again." }, { status: 503 });
  }
}

export async function POST(_request: Request, { params }: RouteContext) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Sign in to apply for an internship." }, { status: 401 });
  if (session.role !== "student") return NextResponse.json({ error: "Only students can submit applications." }, { status: 403 });

  try {
    const { internshipId } = await params;
    const internship = await prisma.internship.findUnique({ where: { id: internshipId } });
    if (!internship) return NextResponse.json({ error: "This internship could not be found." }, { status: 404 });
    if (!internship.published || !internship.acceptingApplications) {
      return NextResponse.json({ error: "Applications for this internship are closed." }, { status: 409 });
    }
    if (deadlineHasPassed(internship.applicationDeadline)) {
      return NextResponse.json({ error: "The application deadline has passed." }, { status: 409 });
    }

    const [student, existingApplication] = await Promise.all([
      prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, role: true, branch: true, cgpa: true } }),
      prisma.application.findUnique({
        where: { studentId_internshipId: { studentId: session.userId, internshipId } },
        select: { id: true },
      }),
    ]);
    if (!student || student.role !== "student") {
      return NextResponse.json({ error: "Your student account could not be verified." }, { status: 403 });
    }
    if (existingApplication) return NextResponse.json({ error: "You have already applied to this internship." }, { status: 409 });

    if (!studentMeetsRequirements(student, internship)) {
      return NextResponse.json({ error: "You do not meet this internship's eligibility requirements." }, { status: 422 });
    }

    const application = await prisma.application.create({
      data: { studentId: session.userId, internshipId, status: "Pending" },
      select: { id: true, status: true, appliedAt: true },
    });
    return NextResponse.json({ application }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "You have already applied to this internship." }, { status: 409 });
    }
    console.error("Application submission failed.", error);
    return NextResponse.json({ error: "Application service is temporarily unavailable. Please try again." }, { status: 503 });
  }
}
