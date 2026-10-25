
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RegistrationBody = {
  name?: string;
  email?: string;
  password?: string;
  accountType?: string;
  branch?: string;
  cgpa?: string | number;
  year?: string | number;
  skills?: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    
    let body: RegistrationBody;

    try {
    body = (await request.json()) as RegistrationBody;
    } catch {
    return NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400 }
    );
    };

    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();
    const password = body.password;
    const accountType = body.accountType;

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
        { error: "Password must contain 8–72 characters." },
        { status: 400 }
      );
    }

    // Never allow public registration to create a super-admin.
    if (accountType !== "student" && accountType !== "admin") {
      return NextResponse.json(
        { error: "Invalid account type. Super-admin registration is restricted." },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    const existingRequest =
      await prisma.accountCreationRequest.findUnique({
        where: { email },
      });

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
          message:
            "Admin approval request submitted successfully. Wait for super-admin approval.",
        },
        { status: 201 }
      );
    }

    const branch = body.branch?.trim();
    const cgpa = Number(body.cgpa);
    const yearOfStudy = Number(body.year);
    const skills = (body.skills ?? "")
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean);

    if (
      !branch ||
      branch.length > 150 ||
      body.cgpa === "" ||
      body.cgpa === undefined ||
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
          },
        },
      },
    });

    return NextResponse.json(
      {
        message:
          "Student account created successfully. You can now sign in.",
      },
      { status: 201 }
    );
  } catch (error: unknown) {
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
