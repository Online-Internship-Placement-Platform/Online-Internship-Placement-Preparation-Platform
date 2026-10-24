import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/server-session";
import { readResume } from "@/lib/private-resume-storage";

type RouteContext = { params: Promise<{ applicationId: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Sign in to access this resume." }, { status: 401 });
  const { applicationId } = await params;
  if (!/^\d+$/.test(applicationId)) return NextResponse.json({ error: "Resume not found." }, { status: 404 });
  const id = Number(applicationId);
  if (!Number.isSafeInteger(id) || id < 1) return NextResponse.json({ error: "Resume not found." }, { status: 404 });

  const isAdmin = session.role === "admin" || session.role === "super-admin";
  if (!isAdmin && session.role !== "student") {
    return NextResponse.json({ error: "Resume not found." }, { status: 404 });
  }

  try {
    const application = await prisma.application.findFirst({
      where: { id, ...(isAdmin ? {} : { studentId: session.userId }) },
      select: { resumeStorageKey: true },
    });
    if (!application || !application.resumeStorageKey) return NextResponse.json({ error: "Resume not found." }, { status: 404 });
    const file = await readResume(application.resumeStorageKey);
    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="resume-${id}.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Could not read application resume.", error);
    return NextResponse.json({ error: "Resume is unavailable." }, { status: 404 });
  }
}
