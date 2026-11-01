"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell, StatusBadge } from "@/components/app-shell";
import { formatDate } from "@/lib/placement-data";

type InternshipRecord = {
  id: string;
  company: string;
  role: string;
  domain: string;
  stipendPerMonth: number;
  type: "remote" | "hybrid" | "on-site";
  location: string | null;
  description: string;
  applicationDeadline: string;
  minCgpa: number;
  eligibleBranches: string[];
  requiredSkills: string[];
  published: boolean;
  acceptingApplications: boolean;
};
type FormValue = Omit<InternshipRecord, "id" | "applicationDeadline" | "eligibleBranches" | "requiredSkills"> & {
  applicationDeadline: string;
  eligibleBranches: string;
  requiredSkills: string;
};

const today = () => new Date().toISOString().slice(0, 10);
const applicationStatus = (item: InternshipRecord) => item.acceptingApplications && item.applicationDeadline >= today() ? "Open" : "Closed";

export default function AdminInternshipsView({ role = "admin" }: { role?: "admin" | "super-admin" }) {
  const router = useRouter();
  const [records, setRecords] = useState<InternshipRecord[]>([]);
  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState("All domains");
  const [status, setStatus] = useState("All statuses");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/internships", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const result = await response.json() as { internships?: InternshipRecord[]; error?: string };
        if (!response.ok) throw new Error(result.error ?? "Could not load internships.");
        setRecords(result.internships ?? []);
        setError("");
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Could not load internships.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload]);

  const filtered = useMemo(() => records.filter((item) => {
    const matchesQuery = `${item.company} ${item.role}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
    const matchesDomain = domain === "All domains" || item.domain === domain;
    const matchesStatus = status === "All statuses" || applicationStatus(item) === status;
    return matchesQuery && matchesDomain && matchesStatus;
  }), [records, query, domain, status]);

  async function save(record: FormValue) {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/internships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record),
      });
      const result = await response.json() as { internship?: InternshipRecord; error?: string };
      if (!response.ok || !result.internship) throw new Error(result.error ?? "Could not save this internship.");
      setRecords((current) => [...current, result.internship!]);
      setShowForm(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save this internship.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this internship? Records with applications cannot be deleted.")) return;
    setError("");
    try {
      const response = await fetch(`/api/admin/internships/${encodeURIComponent(id)}`, { method: "DELETE" });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not delete this internship.");
      setRecords((current) => current.filter((item) => item.id !== id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete this internship.");
    }
  }

  return <AppShell role={role} title="Internship management" eyebrow="Administration">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm text-[#6e786f]">Create, review, and maintain opportunities shown to students.</p><p className="mt-1 text-xs text-[#9aa49b]">Published internships are visible to students; application status is controlled separately.</p></div><button onClick={() => { setShowForm(true); setError(""); }} className="rounded-lg bg-[#176b50] px-4 py-2.5 text-sm font-semibold text-white">+ Create internship</button></div>
    {error && <div role="alert" className="mb-4 flex items-center justify-between rounded-lg bg-[#fff8f7] p-4 text-sm text-[#b94b48]">{error}<button onClick={() => setReload((value) => value + 1)} className="ml-4 font-semibold underline">Retry</button></div>}
    {showForm && <InternshipForm saving={saving} onCancel={() => setShowForm(false)} onSave={save} />}
    <div className="rounded-xl border border-[#e2e7e1] bg-white"><div className="flex flex-wrap items-center gap-3 border-b border-[#edf0ec] p-4"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search listings..." className="w-full max-w-sm rounded-lg border border-[#dfe5df] bg-[#fafbf9] px-3 py-2.5 text-sm outline-none focus:border-[#176b50]" /><select aria-label="Filter by domain" value={domain} onChange={(event) => setDomain(event.target.value)} className="rounded-lg border border-[#dfe5df] bg-[#fafbf9] px-3 py-2.5 text-sm"><option>All domains</option><option>Software Development</option><option>Data & Analytics</option><option>Design</option><option>Business</option><option>Other</option></select><select aria-label="Filter by application status" value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-[#dfe5df] bg-[#fafbf9] px-3 py-2.5 text-sm"><option>All statuses</option><option>Open</option><option>Closed</option></select><span className="ml-auto text-xs text-[#7b857c]">{filtered.length} listings</span></div>
      <div role="region" aria-label="Internship listings" tabIndex={0} className="max-h-[60vh] overflow-auto overscroll-contain focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#176b50] lg:max-h-[min(65vh,calc(100vh-18rem))]"><table className="w-full min-w-[900px] text-left"><thead className="border-b border-[#edf0ec] bg-[#fafbf9] text-[10px] uppercase tracking-[0.12em] text-[#89948b]"><tr><th className="px-5 py-3">Listing</th><th className="px-5 py-3">Domain</th><th className="px-5 py-3">Deadline</th><th className="px-5 py-3">Publication</th><th className="px-5 py-3">Applications</th><th className="px-5 py-3">Actions</th></tr></thead><tbody>{filtered.map((item) => {
        const detailHref = `/${role}/internships/${encodeURIComponent(item.id)}`;
        return <tr className="cursor-pointer border-b border-[#edf0ec] last:border-0 hover:bg-[#fcfdfb] focus-visible:outline-2 focus-visible:outline-[#176b50]" key={item.id} tabIndex={0} role="link" aria-label={`View ${item.role} at ${item.company}`} onClick={(event) => { if ((event.target as HTMLElement).closest("a,button,input,select,textarea")) return; router.push(detailHref); }} onKeyDown={(event) => { if (event.target !== event.currentTarget) return; if (event.key === "Enter" || event.key === " ") { event.preventDefault(); router.push(detailHref); } }}><td className="px-5 py-4"><div className="text-sm font-semibold">{item.role}</div><div className="mt-1 text-xs text-[#7b857c]">{item.company}</div></td><td className="px-5 py-4 text-xs text-[#5e6b61]">{item.domain}</td><td className="px-5 py-4 text-xs text-[#5e6b61]">{formatDate(item.applicationDeadline)}</td><td className="px-5 py-4"><StatusBadge status={item.published ? "Published" : "Draft"} /></td><td className="px-5 py-4"><StatusBadge status={applicationStatus(item)} /></td><td className="px-5 py-4"><Link href={detailHref} className="mr-3 text-xs font-semibold text-[#176b50] hover:underline">Edit</Link><button onClick={() => void remove(item.id)} className="text-xs font-semibold text-[#b94b48]">Delete</button></td></tr>;
      })}</tbody></table></div>
      {loading && <div className="p-8 text-center text-sm text-[#7b857c]">Loading internships…</div>}
      {!loading && !error && records.length === 0 && <div className="p-8 text-center text-sm text-[#7b857c]">No internships have been added yet.</div>}
      {!loading && !error && records.length > 0 && filtered.length === 0 && <div className="p-8 text-center text-sm text-[#7b857c]">No internships match your filters.</div>}
    </div>
  </AppShell>;
}

function InternshipForm({ saving, onCancel, onSave }: { saving: boolean; onCancel: () => void; onSave: (record: FormValue) => void }) {
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [domain, setDomain] = useState("Software Development");
  const [stipend, setStipend] = useState("0");
  const [type, setType] = useState<FormValue["type"]>("remote");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [minCgpa, setMinCgpa] = useState("0");
  const [branches, setBranches] = useState("");
  const [skills, setSkills] = useState("");
  const [published, setPublished] = useState(false);
  const [acceptingApplications, setAcceptingApplications] = useState(false);
  const [error, setError] = useState("");

  function submit() {
    if (!company.trim() || !role.trim() || !deadline || !branches.trim()) {
      setError("Company, role, deadline, and eligible branches are required.");
      return;
    }
    if (!description.trim()) {
      setError("Description is required.");
      return;
    }
    const stipendPerMonth = Number(stipend);
    if (!Number.isFinite(stipendPerMonth) || stipendPerMonth < 0) {
      setError("Monthly stipend must be a non-negative amount.");
      return;
    }
    if (type !== "remote" && !location.trim()) {
      setError("Location is required for hybrid and on-site internships.");
      return;
    }
    const cgpa = Number(minCgpa);
    if (!Number.isFinite(cgpa) || cgpa < 0 || cgpa > 10) {
      setError("Minimum CGPA must be from 0 to 10.");
      return;
    }
    setError("");
    onSave({
      company, role, domain, stipendPerMonth, type, location: type === "remote" ? null : location.trim(), description: description.trim(),
      applicationDeadline: deadline, minCgpa: cgpa, eligibleBranches: branches, requiredSkills: skills, published, acceptingApplications,
    });
  }

  return <section className="mb-5 rounded-xl border border-[#b9d6c4] bg-[#f7fbf8] p-5" aria-label="Create internship">
    <div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-bold">New internship</h2><button onClick={onCancel} className="text-xs text-[#6e786f]">Cancel</button></div>
    <div className="grid gap-3 md:grid-cols-3"><label className="text-xs text-[#526057]">Company<input value={company} onChange={(event) => setCompany(event.target.value)} maxLength={191} className="mt-1 block w-full rounded-lg border border-[#dfe5df] bg-white px-3 py-2.5 text-sm" /></label><label className="text-xs text-[#526057]">Role<input value={role} onChange={(event) => setRole(event.target.value)} maxLength={191} className="mt-1 block w-full rounded-lg border border-[#dfe5df] bg-white px-3 py-2.5 text-sm" /></label><label className="text-xs text-[#526057]">Domain<select value={domain} onChange={(event) => setDomain(event.target.value)} className="mt-1 block w-full rounded-lg border border-[#dfe5df] bg-white px-3 py-2.5 text-sm"><option>Software Development</option><option>Data & Analytics</option><option>Design</option><option>Business</option><option>Other</option></select></label><label className="text-xs text-[#526057]">Monthly stipend<input type="number" min="0" step="0.01" value={stipend} onChange={(event) => setStipend(event.target.value)} className="mt-1 block w-full rounded-lg border border-[#dfe5df] bg-white px-3 py-2.5 text-sm" /></label><label className="text-xs text-[#526057]">Work type<select value={type} onChange={(event) => setType(event.target.value as FormValue["type"])} className="mt-1 block w-full rounded-lg border border-[#dfe5df] bg-white px-3 py-2.5 text-sm"><option value="remote">Remote</option><option value="hybrid">Hybrid</option><option value="on-site">On-site</option></select></label>{type !== "remote" && <label className="text-xs text-[#526057]">Location<input value={location} onChange={(event) => setLocation(event.target.value)} maxLength={191} className="mt-1 block w-full rounded-lg border border-[#dfe5df] bg-white px-3 py-2.5 text-sm" /></label>}<label className="text-xs text-[#526057]">Application deadline<input type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} className="mt-1 block w-full rounded-lg border border-[#dfe5df] bg-white px-3 py-2.5 text-sm" /></label><label className="text-xs text-[#526057]">Minimum CGPA<input type="number" min="0" max="10" step="0.1" value={minCgpa} onChange={(event) => setMinCgpa(event.target.value)} className="mt-1 block w-full rounded-lg border border-[#dfe5df] bg-white px-3 py-2.5 text-sm" /></label><label className="text-xs text-[#526057]">Eligible branches<textarea value={branches} onChange={(event) => setBranches(event.target.value)} placeholder="One per line, or Any branch" className="mt-1 block min-h-10 w-full rounded-lg border border-[#dfe5df] bg-white px-3 py-2.5 text-sm" /></label><label className="text-xs text-[#526057] md:col-span-3">Description<textarea required value={description} onChange={(event) => setDescription(event.target.value)} maxLength={20_000} className="mt-1 block min-h-28 w-full rounded-lg border border-[#dfe5df] bg-white px-3 py-2.5 text-sm" /></label><label className="text-xs text-[#526057] md:col-span-3">Required skills<textarea value={skills} onChange={(event) => setSkills(event.target.value)} placeholder="One per line (leave blank if no specific skills)" className="mt-1 block min-h-10 w-full rounded-lg border border-[#dfe5df] bg-white px-3 py-2.5 text-sm" /></label></div>
    <div className="mt-4 flex flex-wrap gap-6 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={published} onChange={(event) => setPublished(event.target.checked)} /> Published to students</label><label className="flex items-center gap-2"><input type="checkbox" checked={acceptingApplications} onChange={(event) => setAcceptingApplications(event.target.checked)} /> Accepting applications</label></div>
    {error && <p role="alert" className="mt-3 text-xs text-[#b94b48]">{error}</p>}
    <div className="mt-4 flex gap-2"><button onClick={submit} disabled={saving} className="rounded-lg bg-[#176b50] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving…" : "Save internship"}</button><button onClick={onCancel} disabled={saving} className="rounded-lg border border-[#dfe5df] px-4 py-2.5 text-sm">Cancel</button></div>
  </section>;
}
