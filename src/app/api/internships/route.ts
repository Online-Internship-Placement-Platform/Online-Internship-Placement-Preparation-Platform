import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/server-session";
import { listStudentInternshipEligibility } from "@/modules/applications/application-service";

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Sign in to view internships." }, { status: 401 });
  if (session.role !== "student") return NextResponse.json({ error: "Only students can view personalized eligibility." }, { status: 403 });

  try {
    const result = await listStudentInternshipEligibility(session.userId);
    if (result.kind === "student-not-found") {
      return NextResponse.json({ error: "Your student account could not be verified." }, { status: 403 });
    }
    return NextResponse.json({
      profile: result.profile ? {
        branch: result.profile.branch,
        cgpa: result.profile.cgpa,
        yearOfStudy: result.profile.yearOfStudy,
        complete: result.profileComplete,
      } : null,
      internships: result.internships,
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Could not load internship eligibility.", error);
    return NextResponse.json({ error: "Internships are temporarily unavailable. Please try again." }, { status: 503 });
  }
}
