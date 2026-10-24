import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/server-session";
import { APPLICATION_STATUSES } from "@/lib/placement-data";

type RouteContext = { params: Promise<{ applicationId: string }> };

function isMissingRecord(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2025";
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Sign in to update application status." }, { status: 401 });
  if (session.role !== "admin" && session.role !== "super-admin") {
    return NextResponse.json({ error: "Only administrators can update application status." }, { status: 403 });
  }

  const { applicationId } = await params;
  if (!/^\d+$/.test(applicationId)) {
    return NextResponse.json({ error: "Provide a valid application ID." }, { status: 400 });
  }
  const id = Number(applicationId);
  if (!Number.isSafeInteger(id) || id < 1) {
    return NextResponse.json({ error: "Provide a valid application ID." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Provide a valid JSON request body." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null || !("status" in body) || typeof body.status !== "string") {
    return NextResponse.json({ error: "Choose a valid application status." }, { status: 400 });
  }
  const status = body.status.trim();
  if (!APPLICATION_STATUSES.includes(status as (typeof APPLICATION_STATUSES)[number])) {
    return NextResponse.json({ error: "Choose a valid application status." }, { status: 400 });
  }

  try {
    const application = await prisma.application.update({
      where: { id },
      data: { status },
      select: { id: true, status: true },
    });
    return NextResponse.json({ application }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (isMissingRecord(error)) return NextResponse.json({ error: "Application not found." }, { status: 404 });
    console.error("Could not update application status.", error);
    return NextResponse.json({ error: "Application status could not be updated. Please try again." }, { status: 503 });
  }
}
