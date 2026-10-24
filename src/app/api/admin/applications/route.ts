import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/server-session";
import { APPLICATION_STATUSES } from "@/lib/placement-data";

const isAdminRole = (role: string) => role === "admin" || role === "super-admin";

export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Sign in to view applications." }, { status: 401 });
  if (!isAdminRole(session.role)) return NextResponse.json({ error: "Only administrators can view applications." }, { status: 403 });

  const searchParams = new URL(request.url).searchParams;
  const internshipId = searchParams.get("internshipId")?.trim() ?? "";
  const studentName = searchParams.get("studentName")?.trim() ?? "";
  const status = searchParams.get("status")?.trim() ?? "";

  if (studentName.length > 100) {
    return NextResponse.json({ error: "Student name search must be 100 characters or fewer." }, { status: 400 });
  }
  if (status && !APPLICATION_STATUSES.includes(status as (typeof APPLICATION_STATUSES)[number])) {
    return NextResponse.json({ error: "Choose a valid application status." }, { status: 400 });
  }

  try {
    const internships = await prisma.internship.findMany({
      orderBy: [{ company: "asc" }, { role: "asc" }],
      select: { id: true, company: true, role: true },
    });
    if (internshipId && !internships.some((internship) => internship.id === internshipId)) {
      return NextResponse.json({ error: "Choose a valid internship." }, { status: 400 });
    }

    const applications = await prisma.application.findMany({
      where: {
        ...(internshipId ? { internshipId } : {}),
        ...(status ? { status } : {}),
        ...(studentName ? { student: { is: { name: { contains: studentName } } } } : {}),
      },
      orderBy: { appliedAt: "desc" },
      select: {
        id: true,
        status: true,
        appliedAt: true,
        student: { select: { name: true } },
        internship: { select: { id: true, company: true, role: true } },
      },
    });

    return NextResponse.json({ applications, internships }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Could not load applications for administrative review.", error);
    return NextResponse.json({ error: "Applications are temporarily unavailable. Please try again." }, { status: 503 });
  }
}
