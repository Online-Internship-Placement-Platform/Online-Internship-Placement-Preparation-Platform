import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clearServerSession, getServerSession } from "@/lib/server-session";

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    await clearServerSession();
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, name: true },
    });

    if (!user) {
      await clearServerSession();
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: { "Cache-Control": "private, no-store" } },
      );
    }

    return NextResponse.json(
      { user: { id: user.id, name: user.name, role: session.role } },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    const errorCode =
      typeof error === "object" && error !== null && "code" in error
        ? String(error.code)
        : "unknown";
    console.error("Could not load the current session user.", { errorCode });
    return NextResponse.json(
      { error: "Session validation is temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}