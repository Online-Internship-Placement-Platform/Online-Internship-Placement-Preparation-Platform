import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/server-session";
import { readResume } from "@/lib/private-resume-storage";
import { isApplicationAdminRole } from "@/modules/applications/application-authorization";
import { getApplicationResumeKey } from "@/modules/applications/application-service";
import { parseApplicationId } from "@/modules/applications/application-validation";

type RouteContext = { params: Promise<{ applicationId: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Sign in to access this resume." }, { status: 401 });
  const id = parseApplicationId((await params).applicationId);
  if (id === null) return NextResponse.json({ error: "Resume not found." }, { status: 404 });

  const isAdmin = isApplicationAdminRole(session.role);
  if (!isAdmin && session.role !== "student") {
    return NextResponse.json({ error: "Resume not found." }, { status: 404 });
  }

  try {
    const application = await getApplicationResumeKey(id, session.userId, isAdmin);
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
