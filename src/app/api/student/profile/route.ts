import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/server-session";
import { validateStudentProfile } from "@/modules/students/profile-validation";

function normalizeSkills(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length > 50 || !value.every((skill) =>
    typeof skill === "string" && skill.trim().length > 0 && skill.trim().length <= 40 && !/[\u0000-\u001f\u007f]/.test(skill))) {
    return null;
  }
  const seen = new Set<string>();
  return value.map((skill) => skill.trim()).filter((skill) => {
    const normalized = skill.toLocaleLowerCase();
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Sign in to view your profile." }, { status: 401 });
  if (session.role !== "student") return NextResponse.json({ error: "Only students can access this profile." }, { status: 403 });

  try {
    const student = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, role: true, name: true, email: true, branch: true, cgpa: true, year: true, skills: true },
    });
    if (!student || student.role !== "student") return NextResponse.json({ error: "Student profile not found." }, { status: 404 });
    return NextResponse.json({ profile: { ...student, skills: student.skills.split("\n").filter(Boolean) } });
  } catch (error) {
    console.error("Could not load student profile.", error);
    return NextResponse.json({ error: "Your profile is temporarily unavailable." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Sign in to update your profile." }, { status: 401 });
  if (session.role !== "student") return NextResponse.json({ error: "Only students can update this profile." }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Provide valid profile fields." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Provide profile fields to update." }, { status: 400 });
  }
  const values = body as Record<string, unknown>;
  const profileValues = Object.fromEntries(["name", "branch", "cgpa", "year"]
    .filter((field) => Object.hasOwn(values, field))
    .map((field) => [field, values[field]]));
  const hasSkills = Object.hasOwn(values, "skills");
  if (Object.keys(profileValues).length === 0 && !hasSkills) {
    return NextResponse.json({ error: "Provide profile fields to update." }, { status: 400 });
  }
  const profileError = validateStudentProfile(profileValues, "update");
  if (profileError) return NextResponse.json({ error: profileError }, { status: 400 });
  const skills = hasSkills ? normalizeSkills(values.skills) : undefined;
  if (hasSkills && skills === null) return NextResponse.json({ error: "Skills must be a list of up to 50 names, each 1–40 characters." }, { status: 400 });

  try {
    const student = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, role: true } });
    if (!student || student.role !== "student") return NextResponse.json({ error: "Student profile not found." }, { status: 404 });
    const updateData: { name?: string; branch?: string; cgpa?: number; year?: number; skills?: string } = {};
    if (Object.hasOwn(profileValues, "name")) updateData.name = profileValues.name as string;
    if (Object.hasOwn(profileValues, "branch")) updateData.branch = profileValues.branch as string;
    if (Object.hasOwn(profileValues, "cgpa")) updateData.cgpa = profileValues.cgpa as number;
    if (Object.hasOwn(profileValues, "year")) updateData.year = profileValues.year as number;
    if (skills) updateData.skills = skills.join("\n");
    const updated = await prisma.user.update({
      where: { id: session.userId },
      data: updateData,
      select: { name: true, branch: true, cgpa: true, year: true, skills: true },
    });
    return NextResponse.json({ ...updated, skills: updated.skills.split("\n").filter(Boolean) });
  } catch (error) {
    console.error("Could not update the student profile.", error);
    return NextResponse.json({ error: "Your profile could not be saved. Please try again." }, { status: 503 });
  }
}
