import { NextResponse } from "next/server";
import { getAccount } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { setServerSession } from "@/lib/server-session";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter your email and password to continue." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Enter your email and password to continue." }, { status: 400 });
  }
  const { email, password } = body as Record<string, unknown>;
  if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
    return NextResponse.json({ error: "Enter your email and password to continue." }, { status: 400 });
  }

  const account = getAccount(email, password);
  if (!account) return NextResponse.json({ error: "The email or password is incorrect." }, { status: 401 });

  try {
    const user = await prisma.user.upsert({
      where: { email: account.email },
      update: { role: account.role },
      create: {
        email: account.email,
        role: account.role,
        ...(account.role === "student"
          ? { name: "Aarav Mehta", branch: "Computer Science", cgpa: 8.6 }
          : {}),
      },
      select: { id: true, role: true },
    });
    if (user.role !== account.role) {
      return NextResponse.json({ error: "This account is not configured for this role." }, { status: 403 });
    }
    await setServerSession({ userId: user.id, role: account.role });
    return NextResponse.json({ role: account.role, route: account.route });
  } catch (error) {
    console.error("Login failed while creating a server session.", error);
    return NextResponse.json({ error: "Sign in is temporarily unavailable. Check the database and session setup." }, { status: 503 });
  }
}
