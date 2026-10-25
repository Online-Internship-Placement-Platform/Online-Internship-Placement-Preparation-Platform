import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/server-session";
import { isApplicationAdminRole } from "@/modules/applications/application-authorization";
import { parseAdminApplicationFilters } from "@/modules/applications/application-validation";
import { listAdminApplications } from "@/modules/applications/application-service";

export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Sign in to view applications." }, { status: 401 });
  if (!isApplicationAdminRole(session.role)) return NextResponse.json({ error: "Only administrators can view applications." }, { status: 403 });

  const parsedFilters = parseAdminApplicationFilters(new URL(request.url).searchParams);
  if ("error" in parsedFilters) return NextResponse.json({ error: parsedFilters.error }, { status: 400 });

  try {
    const result = await listAdminApplications(parsedFilters.filters);
    if (!result) return NextResponse.json({ error: "Choose a valid internship." }, { status: 400 });
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Could not load applications for administrative review.", error);
    return NextResponse.json({ error: "Applications are temporarily unavailable. Please try again." }, { status: 503 });
  }
}
