import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/server-session";

type Context = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Context) {
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  if (session.role !== "super-admin") {
    return NextResponse.json({ error: "Super-admin access required." }, { status: 403 });
  }

  const { id } = await params;
  const requestId = Number(id);

  if (!Number.isSafeInteger(requestId) || requestId <= 0) {
    return NextResponse.json({ error: "Invalid request ID." }, { status: 400 });
  }

  try {
    const result = await prisma.accountCreationRequest.updateMany({
      where: {
        id: requestId,
        role: "ADMIN",
        status: "PENDING",
      },
      data: { status: "REJECTED" },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: "Request not found or already processed." },
        { status: 404 },
      );
    }

    return NextResponse.json({ message: "Admin account request rejected." });
  } catch (error) {
    console.error("Admin rejection failed.", error);
    return NextResponse.json({ error: "Unable to reject request." }, { status: 500 });
  }
}