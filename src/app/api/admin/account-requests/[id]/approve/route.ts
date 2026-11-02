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
    await prisma.$transaction(async (tx) => {
      const accountRequest = await tx.accountCreationRequest.findUnique({
        where: { id: requestId },
      });

      if (!accountRequest || (accountRequest.role !== "ADMIN" && accountRequest.role !== "SUPER_ADMIN") ||
          accountRequest.status !== "PENDING") {
        throw new Error("REQUEST_NOT_PENDING");
      }

      await tx.user.create({
        data: {
          name: accountRequest.name,
          email: accountRequest.email,
          passwordHash: accountRequest.passwordHash,
          role: accountRequest.role,
        },
      });

      await tx.accountCreationRequest.update({
        where: { id: requestId },
        data: { status: "APPROVED" },
      });
    });

    return NextResponse.json({ message: "Account request approved." });
  } catch (error) {
    if (error instanceof Error && error.message === "REQUEST_NOT_PENDING") {
      return NextResponse.json(
        { error: "Request not found or already processed." },
        { status: 404 },
      );
    }

    console.error("Account approval failed.", error);
    return NextResponse.json({ error: "Unable to approve request." }, { status: 500 });
  }
}