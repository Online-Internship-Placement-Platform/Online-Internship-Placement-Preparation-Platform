import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/server-session";
import { isApplicationAdminRole } from "@/modules/applications/application-authorization";
import { parseApplicationId, parseApplicationStatus } from "@/modules/applications/application-validation";
import { isMissingApplicationError, updateApplicationStatus } from "@/modules/applications/application-service";

type RouteContext = { params: Promise<{ applicationId: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Sign in to update application status." }, { status: 401 });
  if (!isApplicationAdminRole(session.role)) {
    return NextResponse.json({ error: "Only administrators can update application status." }, { status: 403 });
  }

  const id = parseApplicationId((await params).applicationId);
  if (id === null) {
    return NextResponse.json({ error: "Provide a valid application ID." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Provide a valid JSON request body." }, { status: 400 });
  }
  const status = typeof body === "object" && body !== null && "status" in body
    ? parseApplicationStatus(body.status)
    : null;
  if (status === null) {
    return NextResponse.json({ error: "Choose a valid application status." }, { status: 400 });
  }

  try {
    const application = await updateApplicationStatus(id, status);
    return NextResponse.json({ application }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (isMissingApplicationError(error)) return NextResponse.json({ error: "Application not found." }, { status: 404 });
    console.error("Could not update application status.", error);
    return NextResponse.json({ error: "Application status could not be updated. Please try again." }, { status: 503 });
  }
}
