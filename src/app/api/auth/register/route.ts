
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import {
  saveResume,
  deleteResume,
  ResumeUploadError,
} from "@/lib/resume-storage";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let savedResumePath: string | undefined;

  try {
    let form: FormData;

    try {
      form = await request.formData();
    } catch {
      return NextResponse.json(
        { error: "Invalid registration form." },
        { status: 400 }
      );
    }

    const getText = (key: string): string => {
      const value = form.get(key);
      return typeof value === "string" ? value : "";
    };

    const name = getText("name").trim();
    const email = getText("email").trim().toLowerCase();
    const password = getText("password");
    const accountType = getText("accountType");

    if (!name || name.length > 150 || !email || !password) {
      return NextResponse.json(
        { error: "Name, email and password are required." },
        { status: 400 }
      );
    }

    if (email.length > 255 || !emailPattern.test(email)) {
      return NextResponse.json(
        { error: "Enter a valid email address." },
        { status: 400 }
      );
    }

    if (password.length < 8 || password.length > 72) {
      return NextResponse.json(
        { error: "Password must contain 8-72 characters." },
        { status: 400 }
      );
    }

    if (accountType !== "student" && accountType !== "admin") {
      return NextResponse.json(
        { error: "Invalid account type. Super-admin registration is restricted." },
        { status: 400 }
      );
    }

    const [existingUser, existingRequest] = await Promise.all([
      prisma.user.findUnique({ where: { email } }),
      prisma.accountCreationRequest.findUnique({ where: { email } }),
    ]);

    if (existingUser || existingRequest) {
      return NextResponse.json(
        { error: "An account or request already exists for this email." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    if (accountType === "admin") {
      await prisma.accountCreationRequest.create({
        data: {
          name,
          email,
          passwordHash,
          role: "ADMIN",
          status: "PENDING",
        },
      });

      return NextResponse.json(
        {
          message: "Admin approval request submitted successfully. Wait for super-admin approval.",
        },
        { status: 201 }
      );
    }

    const branch = getText("branch").trim();
    const cgpaText = getText("cgpa");
    const cgpa = Number(cgpaText);
    const yearOfStudy = Number(getText("year"));
    const skills = getText("skills")
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean);

    if (
      !branch ||
      branch.length > 150 ||
      !cgpaText ||
      !Number.isFinite(cgpa) ||
      cgpa < 0 ||
      cgpa > 10 ||
      !Number.isInteger(yearOfStudy) ||
      yearOfStudy < 1 ||
      yearOfStudy > 4 ||
      skills.length > 50 ||
      skills.some((skill) => skill.length > 60)
    ) {
      return NextResponse.json(
        { error: "Enter valid student profile details." },
        { status: 400 }
      );
    }

    const resumeEntry = form.get("resume");

    if (resumeEntry && !(resumeEntry instanceof File)) {
      return NextResponse.json(
        { error: "Invalid resume upload." },
        { status: 400 }
      );
    }

    if (resumeEntry instanceof File && resumeEntry.size > 0) {
      savedResumePath = await saveResume(resumeEntry);
    }

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
            yearOfStudy,
            skills,
            ...(savedResumePath ? { resumePath: savedResumePath } : {}),
          },
        },
      },
    });

    return NextResponse.json(
      { message: "Student account created successfully. You can now sign in." },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (savedResumePath) {
      await deleteResume(savedResumePath);
    }

    if (error instanceof ResumeUploadError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "An account or request already exists for this email." },
        { status: 409 }
      );
    }

    console.error("Registration failed:", error);

    return NextResponse.json(
      { error: "Registration could not be completed. Please try again." },
      { status: 500 }
    );
  }
}
