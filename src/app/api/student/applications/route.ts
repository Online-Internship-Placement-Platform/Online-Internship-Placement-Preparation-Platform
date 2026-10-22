import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/server-session";

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Sign in to view your applications." }, { status: 401 });
  if (session.role !== "student") return NextResponse.json({ error: "Only students can view this page." }, { status: 403 });

  try {
    const applications = await prisma.application.findMany({
      where: { studentId: session.userId },
      orderBy: { appliedAt: "desc" },
      select: {
        id: true,
        status: true,
        appliedAt: true,
        resumeStorageKey: true,
        internship: { select: { id: true, company: true, role: true } },
      },
    });
    return NextResponse.json({ applications: applications.map(({ resumeStorageKey, ...application }) => ({
      ...application,
      resumeUrl: resumeStorageKey ? `/api/student/applications/${application.id}/resume` : null,
    })) });
  } catch (error) {
    console.error("Could not load the student's applications.", error);
    return NextResponse.json({ error: "Your applications are temporarily unavailable. Please try again." }, { status: 503 });
  }
}
