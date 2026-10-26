"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell, StatusBadge } from "@/components/app-shell";

type StudentApplication = {
  id: number;
  status: string;
  appliedAt: string;
  resumeUrl: string | null;
  deadlineStatus: "Open" | "Closing soon" | "Closed";
  deadlineMessage: string;
  internship: { id: string; company: string; role: string; applicationDeadline: string };
};

type ApplicationsViewProps = { role?: "student" | "admin" | "super-admin" };

export default function ApplicationsView({ role = "student" }: ApplicationsViewProps) {
  const [applications, setApplications] = useState<StudentApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [sortBy, setSortBy] = useState("newest");

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

  const statuses = useMemo(() => [...new Set(applications.map((application) => application.status))].sort(), [applications]);
  const visibleApplications = useMemo(() => applications
    .filter((application) => statusFilter === "All statuses" || application.status === statusFilter)
    .filter((application) => `${application.internship.role} ${application.internship.company}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
    .sort((first, second) => sortBy === "deadline"
      ? first.internship.applicationDeadline.localeCompare(second.internship.applicationDeadline)
      : sortBy === "oldest"
        ? new Date(first.appliedAt).getTime() - new Date(second.appliedAt).getTime()
        : new Date(second.appliedAt).getTime() - new Date(first.appliedAt).getTime()),
  [applications, query, sortBy, statusFilter]);

  function formatDeadline(date: string) {
    return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
  }

  return <AppShell role={role} title="My applications" eyebrow="Student workspace">
    {loading ? <div className="rounded-xl border border-[#e2e7e1] bg-white p-10 text-center text-sm text-[#6e786f]" role="status">Loading your applications…</div>
      : error ? <div className="rounded-xl border border-[#f1d1ce] bg-white p-10 text-center"><p className="text-sm text-[#b94b48]" role="alert">{error}</p><Link href="/student/internships" className="mt-5 inline-flex rounded-lg bg-[#176b50] px-4 py-2.5 text-sm font-semibold text-white">Browse internships</Link></div>
        : applications.length === 0 ? <div className="rounded-xl border border-[#e2e7e1] bg-white p-10 text-center"><h2 className="font-semibold">You haven’t applied to any internships yet.</h2><p className="mt-2 text-sm text-[#6e786f]">Browse available opportunities to find a role that fits your interests.</p><Link href="/student/internships" className="mt-5 inline-flex rounded-lg bg-[#176b50] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#12563f]">Browse internships</Link></div>
          : <div className="overflow-hidden rounded-xl border border-[#e2e7e1] bg-white">
            <div className="flex flex-wrap gap-3 border-b border-[#edf0ec] p-4">
              <label className="sr-only" htmlFor="application-search">Search applications</label><input id="application-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search role or company..." className="min-w-[220px] flex-1 rounded-lg border border-[#dfe5df] bg-[#fafbf9] px-3 py-2 text-sm outline-none focus:border-[#176b50]" />
              <label className="sr-only" htmlFor="application-status-filter">Filter by status</label><select id="application-status-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-lg border border-[#dfe5df] bg-[#fafbf9] px-3 py-2 text-sm"><option>All statuses</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select>
              <label className="sr-only" htmlFor="application-sort">Sort applications</label><select id="application-sort" value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="rounded-lg border border-[#dfe5df] bg-[#fafbf9] px-3 py-2 text-sm"><option value="newest">Newest applied</option><option value="oldest">Oldest applied</option><option value="deadline">Soonest deadline</option></select>
            </div>
            {visibleApplications.length === 0 ? <p className="p-8 text-center text-sm text-[#6e786f]">No applications match these filters.</p>
              : <div role="region" aria-label="Application history" tabIndex={0} className="max-h-[60vh] overflow-auto overscroll-contain focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#176b50] lg:max-h-[min(65vh,calc(100vh-18rem))]"><table className="w-full min-w-[900px] text-left"><thead className="text-[10px] uppercase tracking-[0.12em] text-[#89948b]"><tr><th scope="col" className="sticky top-0 z-10 border-b border-[#edf0ec] bg-[#fafbf9] px-5 py-3">Opportunity</th><th scope="col" className="sticky top-0 z-10 border-b border-[#edf0ec] bg-[#fafbf9] px-5 py-3">Applied on</th><th scope="col" className="sticky top-0 z-10 border-b border-[#edf0ec] bg-[#fafbf9] px-5 py-3">Status</th><th scope="col" className="sticky top-0 z-10 border-b border-[#edf0ec] bg-[#fafbf9] px-5 py-3">Application deadline</th><th scope="col" className="sticky top-0 z-10 border-b border-[#edf0ec] bg-[#fafbf9] px-5 py-3">Resume</th></tr></thead><tbody>{visibleApplications.map((application) => <tr className="border-b border-[#edf0ec] last:border-0" key={application.id}><td className="px-5 py-4 text-sm font-semibold"><Link href={`/student/internships/${encodeURIComponent(application.internship.id)}`} className="hover:text-[#176b50]">{application.internship.role}</Link><div className="mt-1 text-xs font-normal text-[#7b857c]">{application.internship.company}</div></td><td className="px-5 py-4 text-xs text-[#6e786f]">{new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(application.appliedAt))}</td><td className="px-5 py-4"><StatusBadge status={application.status || "Unknown"} /></td><td className="px-5 py-4"><StatusBadge status={application.deadlineStatus} /><div className="mt-1 text-xs text-[#6e786f]">{formatDeadline(application.internship.applicationDeadline)} · {application.deadlineMessage}</div></td><td className="px-5 py-4 text-xs">{application.resumeUrl ? <a href={application.resumeUrl} className="font-semibold text-[#176b50]">Download PDF</a> : <span className="text-[#89948b]">Not attached</span>}</td></tr>)}</tbody></table></div>}
          </div>}
  </AppShell>;
}
