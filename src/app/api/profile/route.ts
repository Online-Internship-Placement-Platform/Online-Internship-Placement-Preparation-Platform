import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/server-session";
import type { Role } from "@/lib/placement-data";
import { validateStudentProfile } from "@/modules/students/profile-validation";

function normalizeSkills(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length > 50 || !value.every((skill) => typeof skill === "string" && skill.trim().length > 0 && skill.trim().length <= 40 && !/[\u0000-\u001f\u007f]/.test(skill))) {
    return null;
  }

  const seen = new Set<string>();
  return value.map((skill) => skill.trim()).filter((skill) => {
    const key = skill.toLocaleLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function roleFromDatabase(value: string): Role | null {
  switch (value) {
    case "STUDENT": return "student";
    case "ADMIN": return "admin";
    case "SUPER_ADMIN": return "super-admin";
    default: return null;
  }
}

function serializeProfile(user: {
  id: number;
  name: string | null;
  email: string;
  role: string;
  studentProfile?: {
    branch?: string | null;
    cgpa?: number | null;
    yearOfStudy?: "FIRST" | "SECOND" | "THIRD" | "FOURTH" | null;
    skills?: unknown;
  } | null;
}, sessionRole: Role) {
  const role = roleFromDatabase(user.role) ?? sessionRole;
  const commonProfile = { id: user.id, name: user.name, email: user.email, role };

  if (role !== "student" || !user.studentProfile) {
    return commonProfile;
  }

  const skills = Array.isArray(user.studentProfile.skills)
    ? user.studentProfile.skills.filter((skill): skill is string => typeof skill === "string")
    : [];

  return {
    ...commonProfile,
    branch: user.studentProfile.branch ?? null,
    cgpa: user.studentProfile.cgpa ?? null,
    yearOfStudy: user.studentProfile.yearOfStudy ?? null,
    skills,
  };
}

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Sign in to view your profile." }, { status: 401 });

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        role: true,
        name: true,
        email: true,
        studentProfile: session.role === "student" ? { select: { branch: true, cgpa: true, yearOfStudy: true, skills: true } } : undefined,
      },
    });

    if (!user) return NextResponse.json({ error: "Profile not found." }, { status: 404 });

    const dbRole = roleFromDatabase(user.role);
    if (!dbRole || dbRole !== session.role) {
      return NextResponse.json({ error: "You are not allowed to view this profile." }, { status: 403 });
    }

    return NextResponse.json({ profile: serializeProfile(user, session.role) }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Could not load the profile.", error);
    return NextResponse.json({ error: "Your profile is temporarily unavailable." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Sign in to update your profile." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Provide valid profile fields." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Provide profile fields to update." }, { status: 400 });
  }

  const values = body as Record<string, unknown>;
  if (Object.hasOwn(values, "name") || Object.hasOwn(values, "email")) {
    return NextResponse.json({ error: "Name and email cannot be changed here." }, { status: 400 });
  }

  if (session.role !== "student") {
    return NextResponse.json({ error: "Only student profiles can be updated here." }, { status: 403 });
  }

  const profileValues = Object.fromEntries(
    ["branch", "cgpa", "yearOfStudy"].filter((field) => Object.hasOwn(values, field)).map((field) => [field, values[field]]),
  );
  const hasSkills = Object.hasOwn(values, "skills");
  if (!Object.keys(profileValues).length && !hasSkills) {
    return NextResponse.json({ error: "Provide student profile fields to update." }, { status: 400 });
  }

  const validationError = validateStudentProfile(profileValues, "update");
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

  const skills = hasSkills ? normalizeSkills(values.skills) : undefined;
  if (hasSkills && !skills) {
    return NextResponse.json({ error: "Skills must be a list of up to 50 names, each 1–40 characters." }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, role: true, name: true, email: true, studentProfile: { select: { userId: true } } },
    });

    if (!user || user.role !== "STUDENT" || !user.studentProfile) {
      return NextResponse.json({ error: "Student profile not found." }, { status: 404 });
    }

    const profileData: {
      branch?: string;
      cgpa?: number;
      yearOfStudy?: "FIRST" | "SECOND" | "THIRD" | "FOURTH";
      skills?: string[];
    } = {};

    if (Object.hasOwn(profileValues, "branch")) profileData.branch = String(profileValues.branch).trim();
    if (Object.hasOwn(profileValues, "cgpa")) profileData.cgpa = Number(profileValues.cgpa);
    if (Object.hasOwn(profileValues, "yearOfStudy")) profileData.yearOfStudy = profileValues.yearOfStudy as typeof profileData.yearOfStudy;
    if (skills) profileData.skills = skills;

    const updatedProfile = await prisma.studentProfile.update({
      where: { userId: session.userId },
      data: profileData,
      select: { branch: true, cgpa: true, yearOfStudy: true, skills: true },
    });

    return NextResponse.json({
      profile: serializeProfile({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentProfile: {
          branch: updatedProfile.branch,
          cgpa: updatedProfile.cgpa,
          yearOfStudy: updatedProfile.yearOfStudy,
          skills: updatedProfile.skills,
        },
      }, session.role),
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Could not update the profile.", error);
    return NextResponse.json({ error: "Your profile could not be saved. Please try again." }, { status: 503 });
  }
}
