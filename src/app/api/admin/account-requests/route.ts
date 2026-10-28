import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/server-session";

export async function GET() {
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  if (session.role !== "super-admin") {
    return NextResponse.json({ error: "Super-admin access required." }, { status: 403 });
  }

  try {
    const requests = await prisma.accountCreationRequest.findMany({
      where: { role: "ADMIN", status: "PENDING" },
      select: { id: true, name: true, email: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ requests });
  } catch (error) {
    console.error("Unable to load admin account requests.", error);
    return NextResponse.json({ error: "Unable to load requests." }, { status: 500 });
  }
}