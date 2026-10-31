"use client";

import { useEffect, useState } from "react";
import { AppShell, StatusBadge } from "@/components/app-shell";
import { APPLICATION_STATUSES } from "@/lib/placement-data";

type AdminApplication = {
  id: number;
  status: string;
  appliedAt: string;
  student: { name: string | null; skills: string[] };
  internship: { id: string; company: string; role: string };
  resumeUrl: string | null;
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
  const [pendingStatuses, setPendingStatuses] = useState<Record<number, string>>({});
  const [updatingApplicationId, setUpdatingApplicationId] = useState<number | null>(null);
  const [statusFeedback, setStatusFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);

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

  async function saveStatus(application: AdminApplication) {
    const nextStatus = pendingStatuses[application.id] ?? application.status;
    if (nextStatus === application.status || updatingApplicationId !== null) return;

    setUpdatingApplicationId(application.id);
    setStatusFeedback(null);
    try {
      const response = await fetch(`/api/admin/applications/${application.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const result = await response.json() as { application?: { id: number; status: string }; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Application status could not be updated.");
      if (!result.application || result.application.id !== application.id) {
        throw new Error("The server did not confirm the application update.");
      }

      setApplications((current) => current.filter((item) => item.id !== application.id || !status || result.application?.status === status)
        .map((item) => item.id === application.id ? { ...item, status: result.application!.status } : item));
      setPendingStatuses((current) => { const next = { ...current }; delete next[application.id]; return next; });
      setStatusFeedback({ kind: "success", message: `Status updated to ${result.application.status}.` });
    } catch (cause) {
      setPendingStatuses((current) => ({ ...current, [application.id]: application.status }));
      setStatusFeedback({ kind: "error", message: cause instanceof Error ? cause.message : "Application status could not be updated." });
    } finally {
      setUpdatingApplicationId(null);
    }
  }

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
      {statusFeedback && <p className={`border-b px-5 py-3 text-sm ${statusFeedback.kind === "error" ? "border-[#f1d1ce] bg-[#fcedeb] text-[#b94b48]" : "border-[#d7e9de] bg-[#e6f2ec] text-[#176b50]"}`} role={statusFeedback.kind === "error" ? "alert" : "status"}>{statusFeedback.message}</p>}
      {loading ? <div className="p-10 text-center text-sm text-[#6e786f]" role="status">Loading applications…</div>
        : error ? <div className="p-10 text-center">
          <p className="text-sm text-[#b94b48]" role="alert">{error}</p>
          <button type="button" onClick={() => { setLoading(true); setError(""); setReload((value) => value + 1); }} className="mt-4 rounded-lg border border-[#dfe5df] px-4 py-2 text-sm font-semibold text-[#526057] hover:bg-[#fafbf9]">Try again</button>
        </div>
          : applications.length === 0 ? <div className="p-10 text-center">
            <p className="text-sm font-semibold text-[#344238]">{hasFilters ? "No applications match these filters." : "No applications have been submitted yet."}</p>
            <p className="mt-1 text-xs text-[#7b857c]">{hasFilters ? "Adjust or clear your filters to see more results." : "Submitted student applications will appear here."}</p>
          </div>
            : <div role="region" aria-label="Application review results" tabIndex={0} className="max-h-[60vh] overflow-auto overscroll-contain focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#176b50] lg:max-h-[min(65vh,calc(100vh-18rem))]"><table className="w-full min-w-[900px] text-left">
              <thead className="border-b border-[#edf0ec] bg-[#fafbf9] text-[10px] uppercase tracking-[0.12em] text-[#89948b]"><tr><th className="px-5 py-3">Student</th><th className="px-5 py-3">Internship</th><th className="px-5 py-3">Applied on</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Resume</th><th className="px-5 py-3">Update</th></tr></thead>
              <tbody>{applications.map((application) => <tr className="border-b border-[#edf0ec] last:border-0" key={application.id}>
                <td className="px-5 py-4"><div className="text-sm font-semibold">{application.student.name?.trim() || "Name not provided"}</div><div className="mt-2 flex max-w-[260px] flex-wrap gap-1.5">{application.student.skills.length ? application.student.skills.map((skill) => <span key={skill} className="rounded-md bg-[#f1f3ef] px-2 py-1 text-[10px] font-medium text-[#526057]">{skill}</span>) : <span className="text-xs font-normal text-[#89948b]">No skills added</span>}</div></td>
                <td className="px-5 py-4 text-sm"><div className="font-medium text-[#344238]">{application.internship.role}</div><div className="mt-1 text-xs text-[#7b857c]">{application.internship.company}</div></td>
                <td className="px-5 py-4 text-xs text-[#6e786f]">{new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(application.appliedAt))}</td>
                <td className="px-5 py-4"><StatusBadge status={application.status || "Unknown"} /></td>
                <td className="px-5 py-4 text-xs">{application.resumeUrl ? <a href={application.resumeUrl} className="font-semibold text-[#176b50] hover:underline">Download resume</a> : <span className="text-[#89948b]">Resume not uploaded</span>}</td>
                <td className="px-5 py-4"><div className="flex items-center gap-2">
                  <label className="sr-only" htmlFor={`application-status-${application.id}`}>New status for {application.student.name || "student application"}</label>
                  <select
                    id={`application-status-${application.id}`}
                    value={pendingStatuses[application.id] ?? application.status}
                    disabled={updatingApplicationId !== null}
                    onChange={(event) => { setStatusFeedback(null); setPendingStatuses((current) => ({ ...current, [application.id]: event.target.value })); }}
                    className="rounded-lg border border-[#dfe5df] bg-[#fafbf9] px-2 py-2 text-xs text-[#526057] outline-none focus:border-[#176b50] disabled:opacity-60"
                  >
                    {!APPLICATION_STATUSES.includes(application.status as (typeof APPLICATION_STATUSES)[number]) && <option value={application.status}>{application.status}</option>}
                    {APPLICATION_STATUSES.map((applicationStatus) => <option key={applicationStatus} value={applicationStatus}>{applicationStatus}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={() => void saveStatus(application)}
                    disabled={updatingApplicationId !== null || (pendingStatuses[application.id] ?? application.status) === application.status}
                    className="rounded-lg bg-[#176b50] px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#b8c2ba]"
                  >{updatingApplicationId === application.id ? "Saving…" : "Save"}</button>
                </div></td>
              </tr>)}</tbody>
            </table></div>}
    </div>
  </AppShell>;
}
