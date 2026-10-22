import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/server-session";

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
      select: { id: true, role: true, name: true, email: true, branch: true, cgpa: true, skills: true },
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
    return NextResponse.json({ error: "Provide a valid skills list." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null || !("skills" in body)) {
    return NextResponse.json({ error: "Provide a valid skills list." }, { status: 400 });
  }
  const skills = normalizeSkills((body as { skills: unknown }).skills);
  if (skills === null) return NextResponse.json({ error: "Skills must be a list of up to 50 names, each 1–40 characters." }, { status: 400 });

  try {
    const student = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, role: true } });
    if (!student || student.role !== "student") return NextResponse.json({ error: "Student profile not found." }, { status: 404 });
    const updated = await prisma.user.update({
      where: { id: session.userId },
      data: { skills: skills.join("\n") },
      select: { skills: true },
    });
    return NextResponse.json({ skills: updated.skills.split("\n").filter(Boolean) });
  } catch (error) {
    console.error("Could not update student profile skills.", error);
    return NextResponse.json({ error: "Your skills could not be saved. Please try again." }, { status: 503 });
  }
}
