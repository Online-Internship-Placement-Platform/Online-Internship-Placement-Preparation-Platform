import { Suspense } from "react";
import { redirect } from "next/navigation";
import AdminRecommendedVideosView from "@/components/admin-recommended-videos-view";
import { getServerSession } from "@/lib/server-session";

export default function AdminRecommendedVideosPage() {
  return (
    <Suspense fallback={<div className="min-h-64 rounded-xl border border-[#e2e7e1] bg-white p-8 text-center text-sm text-[#6e786f]" role="status">Loading video management…</div>}>
      <AuthorizedVideoManagementPage />
    </Suspense>
  );
}

async function AuthorizedVideoManagementPage() {
  const session = await getServerSession();
  if (!session || session.role !== "admin") redirect("/login");
  return <AdminRecommendedVideosView role="admin" />;
}
