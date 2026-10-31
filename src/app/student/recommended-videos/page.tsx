import { connection } from "next/server";
import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { requireAssessmentRole } from "@/lib/assessment-route-auth";
import { RecommendedVideosView } from "@/components/recommended-videos-view";

export default function RecommendedVideosPage() {
  return <Suspense fallback={<div className="min-h-64 rounded-xl border border-[#e2e7e1] bg-white p-8 text-center text-sm text-[#6e786f]" role="status">Loading recommended videos…</div>}><RecommendedVideosRoute /></Suspense>;
}

async function RecommendedVideosRoute() {
  await connection();
  await requireAssessmentRole(["student"]);
  return <AppShell role="student" title="Recommended Videos" eyebrow="Student workspace"><RecommendedVideosView /></AppShell>;
}
