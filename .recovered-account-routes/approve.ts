
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireRole(request, ["super-admin"]);
    if (auth.response) return auth.response;

    const { id: rawId } = await context.params;
    const id = Number(rawId);

    if (!Number.isSafeInteger(id) || id <= 0) {
      return NextResponse.json({ error: "Invalid request ID." }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const accountRequest = await tx.accountCreationRequest.findUnique({
        where: { id },
      });

      if (!accountRequest || accountRequest.role !== "ADMIN") {
        return { error: "Admin request not found.", status: 404 };
      }

      if (accountRequest.status !== "PENDING") {
        return { error: "Request has already been reviewed.", status: 409 };
      }

      const existing = await tx.user.findUnique({
        where: { email: accountRequest.email },
      });

      if (existing) {
        return { error: "An account already exists for this email.", status: 409 };
      }

      await tx.user.create({
        data: {
          name: accountRequest.name,
          email: accountRequest.email,
          passwordHash: accountRequest.passwordHash,
          role: "ADMIN",
        },
      });

      await tx.accountCreationRequest.update({
        where: { id },
        data: { status: "APPROVED" },
      });

      return { success: true };
    });

    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Unable to approve request." },
      { status: 500 },
    );
  }
}
