import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/server-session";
import { isApplicationStudentRole } from "@/modules/applications/application-authorization";
import { isUniqueApplicationError, createStudentApplication, getApplicationContext } from "@/modules/applications/application-service";
import { isInternshipOpenForApplications } from "@/modules/applications/eligibility";

type RouteContext = { params: Promise<{ internshipId: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Sign in to check application availability." }, { status: 401 });
  if (!isApplicationStudentRole(session.role)) return NextResponse.json({ error: "Only students can apply for internships." }, { status: 403 });

  try {
    const { internshipId } = await params;
    const context = await getApplicationContext(internshipId, session.userId);
    if (context.kind === "internship-not-found") return NextResponse.json({ error: "This internship could not be found." }, { status: 404 });
    if (context.kind === "student-not-found") return NextResponse.json({ error: "Your student account could not be verified." }, { status: 403 });
    if (!context.internship.published) return NextResponse.json({ error: "This internship is not published." }, { status: 404 });

    const isOpen = isInternshipOpenForApplications(
      context.internship.published,
      context.internship.acceptingApplications,
      context.internship.applicationDeadline.toISOString().slice(0, 10),
    );
    const alreadyApplied = Boolean(context.application);
    const canApply = isOpen && !alreadyApplied && context.eligibility.eligible;
    return NextResponse.json({
      internship: {
        id: context.internship.id,
        company: context.internship.company,
        role: context.internship.role,
        domain: context.internship.domain,
        applicationDeadline: context.internship.applicationDeadline.toISOString().slice(0, 10),
        minCgpa: context.internship.minCgpa,
        eligibleBranches: context.internship.eligibleBranches.split("\n").map((value) => value.trim()).filter(Boolean),
        requiredSkills: context.internship.requiredSkills.split("\n").map((value) => value.trim()).filter(Boolean),
      },
      eligible: context.eligibility.eligible,
      canApply,
      isOpen,
      alreadyApplied,
      applicationStatus: context.application?.status,
      reason: alreadyApplied
        ? "You have already applied to this internship."
        : !isOpen
          ? "Applications for this internship are closed."
          : context.eligibility.reasons.join(" ") || undefined,
      eligibilityReasons: context.eligibility.reasons,
      eligibilityChecks: context.eligibilityChecks,
      student: {
        name: context.student.name,
        email: context.student.email,
        branch: context.student.studentProfile?.branch ?? null,
        cgpa: context.student.studentProfile?.cgpa ?? null,
        skills: Array.isArray(context.student.studentProfile?.skills) ? context.student.studentProfile.skills : [],
      },
      profileResumeAvailable: false,
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Could not check internship application availability.", error);
    return NextResponse.json({ error: "Application availability is temporarily unavailable. Please try again." }, { status: 503 });
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Sign in to apply for an internship." }, { status: 401 });
  if (!isApplicationStudentRole(session.role)) return NextResponse.json({ error: "Only students can submit applications." }, { status: 403 });

  try {
    const formData = await request.formData();
    const resume = formData.get("resume");
    if (resume !== null && !(resume instanceof File)) {
      return NextResponse.json({ error: "Choose a PDF resume file." }, { status: 400 });
    }

    const { internshipId } = await params;
    const result = await createStudentApplication(session.userId, internshipId, resume ?? undefined);
    if (result.kind === "internship-not-found") return NextResponse.json({ error: "This internship could not be found." }, { status: 404 });
    if (result.kind === "student-not-found") return NextResponse.json({ error: "Your student account could not be verified." }, { status: 403 });
    if (result.kind === "already-applied") return NextResponse.json({ error: "You have already applied to this internship." }, { status: 409 });
    if (result.kind === "applications-closed") return NextResponse.json({ error: "Applications for this internship are closed." }, { status: 400 });
    if (result.kind === "ineligible" || result.kind === "invalid-resume") {
      return NextResponse.json({ error: result.kind === "ineligible" ? result.reason : result.error }, { status: 400 });
    }

    return NextResponse.json(
      { application: result.application, resumeUrl: result.application ? `/api/student/applications/${result.application.id}/resume` : null },
      { status: 201, headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (isUniqueApplicationError(error)) {
      return NextResponse.json({ error: "You have already applied to this internship." }, { status: 409 });
    }
    console.error("Application submission failed.", error);
    return NextResponse.json({ error: "Application service is temporarily unavailable. Please try again." }, { status: 503 });
  }
}
