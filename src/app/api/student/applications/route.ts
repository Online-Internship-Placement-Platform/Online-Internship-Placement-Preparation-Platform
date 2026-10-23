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
    return NextResponse.json({ applications: applications.map(({ resumeStorageKey, internship, ...application }) => {
      const deadline = internship.applicationDeadline.toISOString().slice(0, 10);
      const [year, month, day] = deadline.split("-").map(Number);
      const deadlineUtc = Date.UTC(year, month - 1, day);
      const daysRemaining = Math.round((deadlineUtc - todayUtc) / 86_400_000);
      const isExpired = daysRemaining < 0;
      const isAccepting = internship.published && internship.acceptingApplications && !isExpired;
      const deadlineStatus = !isAccepting
        ? "Closed"
        : daysRemaining <= 7 ? "Closing soon" : "Open";
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
    }) });
  } catch (error) {
    console.error("Could not load the student's applications.", error);
    return NextResponse.json({ error: "Your applications are temporarily unavailable. Please try again." }, { status: 503 });
  }
}
