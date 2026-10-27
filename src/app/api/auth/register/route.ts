
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password-hash";
import { validateStudentProfile } from "@/modules/students/profile-validation";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_RESUME_SIZE = 5 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    let form: FormData;

    try {
      form = await request.formData();
    } catch {
      return NextResponse.json(
        { error: "Invalid registration form." },
        { status: 400 },
      );
    }

    const text = (key: string) => {
      const value = form.get(key);
      return typeof value === "string" ? value : "";
    };

    const name = text("name").trim();
    const email = text("email").trim().toLowerCase();
    const password = text("password");
    const branch = text("branch").trim();
    const cgpaText = text("cgpa");
    const cgpa = Number(cgpaText);
    const yearOfStudy = text("yearOfStudy");
    const skillsText = text("skills");

    if (
      !name ||
      name.length > 100 ||
      !email ||
      !password ||
      password.length < 8 ||
      password.length > 72
    ) {
      return NextResponse.json(
        { error: "Enter valid name, email, and password details." },
        { status: 400 },
      );
    }

    if (email.length > 255 || !emailPattern.test(email)) {
      return NextResponse.json(
        { error: "Enter a valid email address." },
        { status: 400 },
      );
    }

    const profileError = validateStudentProfile(
      { name, branch, cgpa, yearOfStudy },
      "create",
    );

    if (!cgpaText || profileError) {
      return NextResponse.json(
        { error: profileError ?? "Enter a valid CGPA." },
        { status: 400 },
      );
    }

    const skills = skillsText
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean);

    if (
      skills.length > 50 ||
      skills.some(
        (skill) =>
          skill.length > 40 ||
          /[\u0000-\u001f\u007f]/.test(skill),
      )
    ) {
      return NextResponse.json(
        { error: "Enter up to 50 valid skills, each at most 40 characters." },
        { status: 400 },
      );
    }

    const resume = form.get("resume");
    let resumeData: Uint8Array<ArrayBuffer> | undefined;

    if (resume && !(resume instanceof File)) {
      return NextResponse.json(
        { error: "Invalid resume upload." },
        { status: 400 },
      );
    }

    if (resume instanceof File && resume.size > 0) {
      if (
        resume.size > MAX_RESUME_SIZE ||
        !resume.name.toLowerCase().endsWith(".pdf")
      ) {
        return NextResponse.json(
          { error: "Resume must be a PDF of 5 MB or smaller." },
          { status: 400 },
        );
      }

      const bytes = new Uint8Array(await resume.arrayBuffer());

      if (
        bytes.length < 5 ||
        new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-"
      ) {
        return NextResponse.json(
          { error: "Resume must contain a valid PDF file." },
          { status: 400 },
        );
      }

      resumeData = bytes;
    }

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: "An account already exists for this email." },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(password);

    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: "STUDENT",
        studentProfile: {
          create: {
            branch,
            cgpa,
            yearOfStudy:
              yearOfStudy as "FIRST" | "SECOND" | "THIRD" | "FOURTH",
            skills,
            ...(resumeData ? { resumeData } : {}),
          },
        },
      },
    });

    return NextResponse.json(
      { message: "Student account created successfully. You can now sign in." },
      { status: 201 },
    );
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "An account already exists for this email." },
        { status: 409 },
      );
    }

    console.error("Registration failed:", error);

    return NextResponse.json(
      { error: "Registration could not be completed. Please try again." },
      { status: 500 },
    );
  }
}
