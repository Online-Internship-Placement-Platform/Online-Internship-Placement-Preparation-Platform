import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/server-session";
import { isApplicationStudentRole } from "@/modules/applications/application-authorization";
import { listStudentApplications } from "@/modules/applications/application-service";

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Sign in to view your applications." }, { status: 401 });
  if (!isApplicationStudentRole(session.role)) return NextResponse.json({ error: "Only students can view this page." }, { status: 403 });

  try {
    const applications = await listStudentApplications(session.userId);
    return NextResponse.json({ applications }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Could not load the student's applications.", error);
    return NextResponse.json({ error: "Your applications are temporarily unavailable. Please try again." }, { status: 503 });
  }
}
