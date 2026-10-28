import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/server-session";
import { isApplicationAdminRole } from "@/modules/applications/application-authorization";
import { filterStudents, type StudentSearchCriteria } from "@/lib/student-search";

function parseStudentCriteria(searchParams: URLSearchParams): StudentSearchCriteria {
  const skillsParam = searchParams.getAll("skills");
  const skills = skillsParam.length > 0
    ? skillsParam.flatMap((value) => value.split(",").map((part) => part.trim()).filter(Boolean))
    : [];

  const criteria: StudentSearchCriteria = {
    name: searchParams.get("name") ?? "",
    email: searchParams.get("email") ?? "",
    branch: searchParams.get("branch") ?? "All branches",
    minCgpa: searchParams.get("minCgpa") ?? "",
    maxCgpa: searchParams.get("maxCgpa") ?? "",
    yearOfStudy: searchParams.get("yearOfStudy") ?? "All years",
    skills,
  };

  return criteria;
}

function yearNumber(value: string | null | undefined): number | undefined {
  switch (value) {
    case "FIRST": return 1;
    case "SECOND": return 2;
    case "THIRD": return 3;
    case "FOURTH": return 4;
    default: return undefined;
  }
}

function normalizeStudentRecord(user: {
  id: number;
  name: string | null;
  email: string;
  studentProfile?: {
    branch?: string | null;
    cgpa?: number | null;
    yearOfStudy?: "FIRST" | "SECOND" | "THIRD" | "FOURTH" | null;
    skills?: unknown;
  } | null;
}) {
  const profile = user.studentProfile ?? null;
  const skills = Array.isArray(profile?.skills)
    ? profile.skills.filter((skill): skill is string => typeof skill === "string").map((skill) => skill.trim()).filter(Boolean)
    : [];

  return {
    id: String(user.id),
    name: user.name ?? "",
    email: user.email,
    branch: profile?.branch ?? "",
    cgpa: typeof profile?.cgpa === "number" ? profile.cgpa : 0,
    yearOfStudy: yearNumber(profile?.yearOfStudy) ?? 0,
    skills,
  };
}

export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Sign in to view the student directory." }, { status: 401 });
  if (!isApplicationAdminRole(session.role)) return NextResponse.json({ error: "Only administrators can view the student directory." }, { status: 403 });

  const criteria = parseStudentCriteria(new URL(request.url).searchParams);

  try {
    const users = await prisma.user.findMany({
      where: { role: "STUDENT" },
      select: {
        id: true,
        name: true,
        email: true,
        studentProfile: { select: { branch: true, cgpa: true, yearOfStudy: true, skills: true } },
      },
    });

    const students = users.map(normalizeStudentRecord).filter((student) => filterStudents([student], criteria).length > 0);
    return NextResponse.json({ students, total: students.length }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Could not load the student directory.", error);
    return NextResponse.json({ error: "The student directory is temporarily unavailable." }, { status: 503 });
  }
}
