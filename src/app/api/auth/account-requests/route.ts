
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password-hash";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(request: Request) {
  const email = new URL(request.url).searchParams.get("email")?.trim().toLowerCase() ?? "";
  if (!email || email.length > 255 || !emailPattern.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  try {
    const accountRequest = await prisma.accountCreationRequest.findUnique({
      where: { email },
      select: { status: true, updatedAt: true },
    });
    if (!accountRequest) {
      return NextResponse.json({ error: "No admin account request was found for this email." }, { status: 404 });
    }

    return NextResponse.json({ status: accountRequest.status, updatedAt: accountRequest.updatedAt }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Unable to check admin account request status.", error);
    return NextResponse.json({ error: "Unable to check request status." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const email = typeof body === "object" && body !== null && "email" in body && typeof body.email === "string"
    ? body.email.trim().toLowerCase()
    : "";
  if (!email || email.length > 255 || !emailPattern.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existingUser) {
      return NextResponse.json({ error: "An account already exists for this email." }, { status: 409 });
    }

    const result = await prisma.accountCreationRequest.updateMany({
      where: { email, role: "ADMIN", status: "REJECTED" },
      data: { status: "PENDING" },
    });
    if (result.count === 0) {
      return NextResponse.json({ error: "Only rejected requests can be resubmitted." }, { status: 409 });
    }

    return NextResponse.json({ message: "Your request has been resubmitted for review.", status: "PENDING" }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Unable to resubmit admin account request.", error);
    return NextResponse.json({ error: "Unable to resubmit request. Please try again." }, { status: 500 });
  }
}

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
