import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/server-session";
import { studentProfileResponse } from "@/modules/students/profile-response";
import { validateStudentProfile } from "@/modules/students/profile-validation";

function normalizeSkills(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length > 50 || !value.every((skill) => typeof skill === "string" && skill.trim().length > 0 && skill.trim().length <= 40 && !/[\u0000-\u001f\u007f]/.test(skill))) return null;
  const seen = new Set<string>();
  return value.map((skill) => skill.trim()).filter((skill) => { const key = skill.toLocaleLowerCase(); if (seen.has(key)) return false; seen.add(key); return true; });
}

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Sign in to view your profile." }, { status: 401 });
  if (session.role !== "student") return NextResponse.json({ error: "Only students can access this profile." }, { status: 403 });
  try {
    const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, role: true, name: true, email: true, studentProfile: { select: { branch: true, cgpa: true, yearOfStudy: true, skills: true } } } });
    if (!user || user.role !== "STUDENT") return NextResponse.json({ error: "Student profile not found." }, { status: 404 });
    const profile = studentProfileResponse(user);
    if (!profile) return NextResponse.json({ error: "Student profile not found." }, { status: 404 });
    return NextResponse.json({ profile });
  } catch (error) { console.error("Could not load student profile.", error); return NextResponse.json({ error: "Your profile is temporarily unavailable." }, { status: 503 }); }
}

export async function PATCH(request: Request) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Sign in to update your profile." }, { status: 401 });
  if (session.role !== "student") return NextResponse.json({ error: "Only students can update this profile." }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Provide valid profile fields." }, { status: 400 }); }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Provide profile fields to update." }, { status: 400 });
  const values = body as Record<string, unknown>;
  if (Object.hasOwn(values, "role") || Object.hasOwn(values, "email")) return NextResponse.json({ error: "Role and email cannot be changed here." }, { status: 400 });
  const profileValues = Object.fromEntries(["name", "branch", "cgpa", "yearOfStudy"].filter((field) => Object.hasOwn(values, field)).map((field) => [field, values[field]]));
  const hasSkills = Object.hasOwn(values, "skills");
  if (!Object.keys(profileValues).length && !hasSkills) return NextResponse.json({ error: "Provide profile fields to update." }, { status: 400 });
  const validationError = validateStudentProfile(profileValues, "update");
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
  const skills = hasSkills ? normalizeSkills(values.skills) : undefined;
  if (hasSkills && !skills) return NextResponse.json({ error: "Skills must be a list of up to 50 names, each 1–40 characters." }, { status: 400 });
  try {
    const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, role: true, studentProfile: { select: { userId: true } } } });
    if (!user || user.role !== "STUDENT" || !user.studentProfile) return NextResponse.json({ error: "Student profile not found." }, { status: 404 });
    const userData: { name?: string } = {};
    if (Object.hasOwn(profileValues, "name")) userData.name = (profileValues.name as string).trim();
    const profileData: { branch?: string; cgpa?: number; yearOfStudy?: "FIRST" | "SECOND" | "THIRD" | "FOURTH"; skills?: string[] } = {};
    if (Object.hasOwn(profileValues, "branch")) profileData.branch = (profileValues.branch as string).trim();
    if (Object.hasOwn(profileValues, "cgpa")) profileData.cgpa = profileValues.cgpa as number;
    if (Object.hasOwn(profileValues, "yearOfStudy")) profileData.yearOfStudy = profileValues.yearOfStudy as typeof profileData.yearOfStudy;
    if (skills) profileData.skills = skills;
    const [updatedUser, updatedProfile] = await prisma.$transaction([
      prisma.user.update({ where: { id: session.userId }, data: userData, select: { name: true } }),
      prisma.studentProfile.update({ where: { userId: session.userId }, data: profileData, select: { branch: true, cgpa: true, yearOfStudy: true, skills: true } }),
    ]);
    return NextResponse.json({ name: updatedUser.name, ...updatedProfile, skills: Array.isArray(updatedProfile.skills) ? updatedProfile.skills : [] });
  } catch (error) { console.error("Could not update the student profile.", error); return NextResponse.json({ error: "Your profile could not be saved. Please try again." }, { status: 503 }); }
}
