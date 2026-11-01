import { Suspense } from "react";
import AdminInternshipDetail from "@/components/admin-internship-detail";

type RouteProps = { params: Promise<{ internshipId: string }> };

async function SuperAdminInternshipDetailContent({ params }: RouteProps) {
  const { internshipId } = await params;
  return <AdminInternshipDetail id={internshipId} role="super-admin" />;
}

export default function SuperAdminInternshipDetailRoute({ params }: RouteProps) {
  return <Suspense fallback={<div className="min-h-screen bg-[var(--background)] p-6 text-sm text-[#6e786f]" role="status">Loading internship details…</div>}>
    <SuperAdminInternshipDetailContent params={params} />
  </Suspense>;
}