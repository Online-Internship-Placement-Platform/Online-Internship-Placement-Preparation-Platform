import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/server-session";
import { isApplicationAdminRole } from "@/modules/applications/application-authorization";
import { createInternship, listAdminInternships } from "@/modules/internships/internship-service";
import { parseInternshipInput } from "@/modules/internships/internship-validation";

async function authorizeAdmin() {
  const session = await getServerSession();
  if (!session) return { response: NextResponse.json({ error: "Sign in to manage internships." }, { status: 401 }) };
  if (!isApplicationAdminRole(session.role)) return { response: NextResponse.json({ error: "Only administrators can manage internships." }, { status: 403 }) };
  return { response: null };
}

export async function GET() {
  const auth = await authorizeAdmin();
  if (auth.response) return auth.response;
  try {
    return NextResponse.json({ internships: await listAdminInternships() }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Could not load internships for administrative management.", error);
    return NextResponse.json({ error: "Internships are temporarily unavailable. Please try again." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const auth = await authorizeAdmin();
  if (auth.response) return auth.response;
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Provide valid internship details." }, { status: 400 });
  }
  const parsed = parseInternshipInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    const internship = await createInternship(parsed.data);
    return NextResponse.json({ internship }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Could not create an internship.", error);
    return NextResponse.json({ error: "The internship could not be saved. Please try again." }, { status: 503 });
  }
}
