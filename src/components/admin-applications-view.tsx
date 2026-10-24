"use client";

import { useEffect, useState } from "react";
import { AppShell, StatusBadge } from "@/components/app-shell";
import { APPLICATION_STATUSES } from "@/lib/placement-data";

type AdminApplication = {
  id: number;
  status: string;
  appliedAt: string;
  student: { name: string | null };
  internship: { id: string; company: string; role: string };
};

type InternshipOption = { id: string; company: string; role: string };

export default function AdminApplicationsView({ role = "admin" }: { role?: "admin" | "super-admin" }) {
  const [applications, setApplications] = useState<AdminApplication[]>([]);
  const [internships, setInternships] = useState<InternshipOption[]>([]);
  const [studentName, setStudentName] = useState("");
  const [internshipId, setInternshipId] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const search = new URLSearchParams();
    if (studentName.trim()) search.set("studentName", studentName.trim());
    if (internshipId) search.set("internshipId", internshipId);
    if (status) search.set("status", status);

    fetch(`/api/admin/applications${search.size ? `?${search.toString()}` : ""}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = await response.json() as {
          applications?: AdminApplication[];
          internships?: InternshipOption[];
          error?: string;
        };
        if (!response.ok) throw new Error(result.error ?? "Could not load applications.");
        setApplications(result.applications ?? []);
        setInternships(result.internships ?? []);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : "Could not load applications.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [studentName, internshipId, status, reload]);

  const hasFilters = Boolean(studentName || internshipId || status);

  return <AppShell role={role} title="Application review" eyebrow="Administration">
    <section className="mb-5 rounded-xl border border-[#e2e7e1] bg-white p-4" aria-label="Filter applications">
      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <label htmlFor="application-student-search" className="mb-1.5 block text-xs font-semibold text-[#526057]">Student name</label>
          <input
            id="application-student-search"
            type="search"
            value={studentName}
            onChange={(event) => { setLoading(true); setError(""); setStudentName(event.target.value); }}
            placeholder="Search student name..."
            maxLength={100}
            className="w-full rounded-lg border border-[#dfe5df] bg-[#fafbf9] px-3 py-2.5 text-sm outline-none focus:border-[#176b50]"
          />
        </div>
        <div>
          <label htmlFor="application-internship-filter" className="mb-1.5 block text-xs font-semibold text-[#526057]">Internship</label>
          <select
            id="application-internship-filter"
            value={internshipId}
            onChange={(event) => { setLoading(true); setError(""); setInternshipId(event.target.value); }}
            className="w-full rounded-lg border border-[#dfe5df] bg-[#fafbf9] px-3 py-2.5 text-sm text-[#526057] outline-none focus:border-[#176b50]"
          >
            <option value="">All internships</option>
            {internships.map((internship) => <option key={internship.id} value={internship.id}>{internship.role} · {internship.company}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="application-status-filter" className="mb-1.5 block text-xs font-semibold text-[#526057]">Status</label>
          <select
            id="application-status-filter"
            value={status}
            onChange={(event) => { setLoading(true); setError(""); setStatus(event.target.value); }}
            className="w-full rounded-lg border border-[#dfe5df] bg-[#fafbf9] px-3 py-2.5 text-sm text-[#526057] outline-none focus:border-[#176b50]"
          >
            <option value="">All statuses</option>
            {APPLICATION_STATUSES.map((applicationStatus) => <option key={applicationStatus} value={applicationStatus}>{applicationStatus}</option>)}
          </select>
        </div>
      </div>
      {hasFilters && <button
        type="button"
        onClick={() => { setLoading(true); setError(""); setStudentName(""); setInternshipId(""); setStatus(""); }}
        className="mt-3 text-xs font-semibold text-[#176b50] hover:underline"
      >Clear filters</button>}
    </section>

    <div className="overflow-hidden rounded-xl border border-[#e2e7e1] bg-white">
      {loading ? <div className="p-10 text-center text-sm text-[#6e786f]" role="status">Loading applications…</div>
        : error ? <div className="p-10 text-center">
          <p className="text-sm text-[#b94b48]" role="alert">{error}</p>
          <button type="button" onClick={() => { setLoading(true); setError(""); setReload((value) => value + 1); }} className="mt-4 rounded-lg border border-[#dfe5df] px-4 py-2 text-sm font-semibold text-[#526057] hover:bg-[#fafbf9]">Try again</button>
        </div>
          : applications.length === 0 ? <div className="p-10 text-center">
            <p className="text-sm font-semibold text-[#344238]">{hasFilters ? "No applications match these filters." : "No applications have been submitted yet."}</p>
            <p className="mt-1 text-xs text-[#7b857c]">{hasFilters ? "Adjust or clear your filters to see more results." : "Submitted student applications will appear here."}</p>
          </div>
            : <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left">
              <thead className="border-b border-[#edf0ec] bg-[#fafbf9] text-[10px] uppercase tracking-[0.12em] text-[#89948b]"><tr><th className="px-5 py-3">Student</th><th className="px-5 py-3">Internship</th><th className="px-5 py-3">Applied on</th><th className="px-5 py-3">Status</th></tr></thead>
              <tbody>{applications.map((application) => <tr className="border-b border-[#edf0ec] last:border-0" key={application.id}>
                <td className="px-5 py-4 text-sm font-semibold">{application.student.name?.trim() || "Name not provided"}</td>
                <td className="px-5 py-4 text-sm"><div className="font-medium text-[#344238]">{application.internship.role}</div><div className="mt-1 text-xs text-[#7b857c]">{application.internship.company}</div></td>
                <td className="px-5 py-4 text-xs text-[#6e786f]">{new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(application.appliedAt))}</td>
                <td className="px-5 py-4"><StatusBadge status={application.status || "Unknown"} /></td>
              </tr>)}</tbody>
            </table></div>}
    </div>
  </AppShell>;
}
