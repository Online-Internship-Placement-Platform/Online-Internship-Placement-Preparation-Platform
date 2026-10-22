"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell, StatusBadge } from "@/components/app-shell";

type StudentApplication = {
  id: number;
  status: string;
  appliedAt: string;
  resumeUrl: string | null;
  internship: { id: string; company: string; role: string };
};

type ApplicationsViewProps = { role?: "student" | "admin" | "super-admin" };

export default function ApplicationsView({ role = "student" }: ApplicationsViewProps) {
  const [applications, setApplications] = useState<StudentApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/student/applications")
      .then(async (response) => {
        const result = await response.json() as { applications?: StudentApplication[]; error?: string };
        if (!response.ok) throw new Error(result.error ?? "Could not load your applications.");
        if (active) setApplications(result.applications ?? []);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load your applications.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return <AppShell role={role} title="My applications" eyebrow="Student workspace">
    {loading ? <div className="rounded-xl border border-[#e2e7e1] bg-white p-10 text-center text-sm text-[#6e786f]" role="status">Loading your applications…</div>
      : error ? <div className="rounded-xl border border-[#f1d1ce] bg-white p-10 text-center"><p className="text-sm text-[#b94b48]" role="alert">{error}</p><Link href="/student/internships" className="mt-5 inline-flex rounded-lg bg-[#176b50] px-4 py-2.5 text-sm font-semibold text-white">Browse internships</Link></div>
        : applications.length === 0 ? <div className="rounded-xl border border-[#e2e7e1] bg-white p-10 text-center"><h2 className="font-semibold">You haven’t applied to any internships yet.</h2><p className="mt-2 text-sm text-[#6e786f]">Browse available opportunities to find a role that fits your interests.</p><Link href="/student/internships" className="mt-5 inline-flex rounded-lg bg-[#176b50] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#12563f]">Browse internships</Link></div>
          : <div className="overflow-x-auto rounded-xl border border-[#e2e7e1] bg-white"><table className="w-full min-w-[680px] text-left"><thead className="border-b border-[#edf0ec] bg-[#fafbf9] text-[10px] uppercase tracking-[0.12em] text-[#89948b]"><tr><th className="px-5 py-3">Opportunity</th><th className="px-5 py-3">Applied on</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Resume</th></tr></thead><tbody>{applications.map((application) => <tr className="border-b border-[#edf0ec] last:border-0" key={application.id}><td className="px-5 py-4 text-sm font-semibold">{application.internship.role}<div className="mt-1 text-xs font-normal text-[#7b857c]">{application.internship.company}</div></td><td className="px-5 py-4 text-xs text-[#6e786f]">{new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(application.appliedAt))}</td><td className="px-5 py-4"><StatusBadge status={application.status} /></td><td className="px-5 py-4 text-xs">{application.resumeUrl ? <a href={application.resumeUrl} className="font-semibold text-[#176b50]">Download PDF</a> : <span className="text-[#89948b]">Not attached</span>}</td></tr>)}</tbody></table></div>}
  </AppShell>;
}
