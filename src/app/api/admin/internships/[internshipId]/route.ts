import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/server-session";
import { isApplicationAdminRole } from "@/modules/applications/application-authorization";
import { deleteInternship, isMissingInternshipError, updateInternship } from "@/modules/internships/internship-service";
import { parseInternshipInput } from "@/modules/internships/internship-validation";

type RouteContext = { params: Promise<{ internshipId: string }> };

async function authorizeAdmin() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Sign in to manage internships." }, { status: 401 });
  if (!isApplicationAdminRole(session.role)) return NextResponse.json({ error: "Only administrators can manage internships." }, { status: 403 });
  return null;
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const denial = await authorizeAdmin();
  if (denial) return denial;
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Provide valid internship details." }, { status: 400 });
  }
  const parsed = parseInternshipInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    const { internshipId } = await params;
    const internship = await updateInternship(internshipId, parsed.data);
    return NextResponse.json({ internship }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (isMissingInternshipError(error)) return NextResponse.json({ error: "This internship could not be found." }, { status: 404 });
    console.error("Could not update an internship.", error);
    return NextResponse.json({ error: "The internship could not be saved. Please try again." }, { status: 503 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const denial = await authorizeAdmin();
  if (denial) return denial;
  try {
    const { internshipId } = await params;
    const result = await deleteInternship(internshipId);
    if (result.kind === "has-applications") return NextResponse.json({ error: "This internship has applications and cannot be deleted." }, { status: 409 });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    if (isMissingInternshipError(error)) return NextResponse.json({ error: "This internship could not be found." }, { status: 404 });
    console.error("Could not delete an internship.", error);
    return NextResponse.json({ error: "The internship could not be deleted. Please try again." }, { status: 503 });
  }
}
