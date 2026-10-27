
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password-hash";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const values = body as Record<string, unknown>;
  const name = typeof values.name === "string" ? values.name.trim() : "";
  const email = typeof values.email === "string" ? values.email.trim().toLowerCase() : "";
  const password = typeof values.password === "string" ? values.password : "";

  if (!name || name.length > 150 || !emailPattern.test(email) ||
      email.length > 255 || password.length < 8 || password.length > 72) {
    return NextResponse.json(
      { error: "Enter a valid name, email, and password of 8–72 characters." },
      { status: 400 },
    );
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existingUser) {
      return NextResponse.json({ error: "An account already exists for this email." }, { status: 409 });
    }

    const existingRequest = await prisma.accountCreationRequest.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existingRequest) {
      return NextResponse.json({ error: "An account request already exists for this email." }, { status: 409 });
    }

    await prisma.accountCreationRequest.create({
      data: {
        name,
        email,
        passwordHash: await hashPassword(password),
        role: "ADMIN",
      },
    });

    return NextResponse.json(
      { message: "Admin account request submitted for super-admin approval." },
      { status: 201 },
    );
  } catch (error) {
    console.error("Admin account request failed.", error);
    return NextResponse.json({ error: "Unable to submit the account request." }, { status: 500 });
  }
}
