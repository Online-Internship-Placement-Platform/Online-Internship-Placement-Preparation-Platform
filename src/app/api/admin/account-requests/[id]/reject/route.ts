
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

    const accountRequest = await prisma.accountCreationRequest.findUnique({
      where: { id },
    });

    if (!accountRequest || accountRequest.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin request not found." }, { status: 404 });
    }

    if (accountRequest.status !== "PENDING") {
      return NextResponse.json({ error: "Request has already been reviewed." }, { status: 409 });
    }

    await prisma.accountCreationRequest.update({
      where: { id },
      data: { status: "REJECTED" },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Unable to reject request." },
      { status: 500 },
    );
  }
}
