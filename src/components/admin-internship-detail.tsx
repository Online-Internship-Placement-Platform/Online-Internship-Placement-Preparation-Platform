"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AppShell, SectionHeading, StatusBadge } from "@/components/app-shell";
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

type InternshipDraft = Omit<InternshipRecord, "id" | "eligibleBranches" | "requiredSkills"> & {
  eligibleBranches: string;
  requiredSkills: string;
};

export default function AdminInternshipDetail({ id, role = "admin" }: { id: string; role?: "admin" | "super-admin" }) {
  const router = useRouter();
  const [internship, setInternship] = useState<InternshipRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const listHref = `/${role}/internships`;

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/admin/internships/${encodeURIComponent(id)}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const result = await response.json() as { internship?: InternshipRecord; error?: string };
        if (!response.ok || !result.internship) throw new Error(result.error ?? "Could not load this internship.");
        setInternship(result.internship);
        setError("");
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Could not load this internship.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id]);

  async function save(draft: InternshipDraft) {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/internships/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const result = await response.json() as { internship?: InternshipRecord; error?: string };
      if (!response.ok || !result.internship) throw new Error(result.error ?? "Could not save this internship.");
      setInternship(result.internship);
      setEditing(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save this internship.");
    } finally {
      setSaving(false);
    }
  }

  return <AppShell role={role} title={internship?.role ?? "Internship details"} eyebrow="Internship management">
    <Link href={listHref} className="mb-6 inline-block text-xs font-semibold text-[#176b50]">← Back to internships</Link>
    {error && <div role="alert" className="mb-4 rounded-lg bg-[#fff8f7] p-4 text-sm text-[#b94b48]">{error}</div>}
    {loading ? <div className="rounded-xl border border-[#e2e7e1] bg-white p-10 text-center text-sm text-[#6e786f]" role="status">Loading internship details…</div>
      : !internship ? <div className="rounded-xl border border-[#e2e7e1] bg-white p-10 text-center text-sm text-[#6e786f]">This internship could not be loaded.</div>
        : editing ? <InternshipEditor key={internship.id} initial={internship} saving={saving} onCancel={() => setEditing(false)} onSave={save} />
          : <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
            <section className="rounded-xl border border-[#e2e7e1] bg-white p-7">
              <div className="mb-7 flex flex-wrap items-start justify-between gap-4"><div><div className="mb-2 text-sm font-semibold text-[#176b50]">{internship.company}</div><h2 className="text-2xl font-semibold tracking-tight">{internship.role}</h2><p className="mt-2 text-sm text-[#6e786f]">{internship.domain}</p></div><StatusBadge status={internship.published ? "Published" : "Draft"} /></div>
              <SectionHeading title="About the role" />
              <p className="mb-8 whitespace-pre-wrap text-sm leading-7 text-[#5e6b61]">{internship.description || "No description has been added yet."}</p>
              <SectionHeading title="Required skills" />
              <div className="mb-8 flex flex-wrap gap-2">{internship.requiredSkills.length ? internship.requiredSkills.map((skill) => <span className="rounded-lg border border-[#dce5de] bg-[#f7faf7] px-3 py-2 text-xs font-medium text-[#405147]" key={skill}>{skill}</span>) : <span className="text-sm text-[#7b857c]">No specific skills</span>}</div>
              <SectionHeading title="Eligibility requirements" />
              <div className="grid gap-3 sm:grid-cols-2"><Detail label="Eligible branches" value={internship.eligibleBranches.join(", ") || "Not specified"} /><Detail label="Minimum CGPA" value={`${internship.minCgpa} / 10`} /></div>
            </section>
            <aside><div className="sticky top-6 rounded-xl border border-[#e2e7e1] bg-white p-6">
              <div className="mb-5 text-xs font-bold uppercase tracking-[0.12em] text-[#89948b]">Opportunity details</div>
              <div className="mb-5 space-y-4 rounded-lg bg-[#fafbf9] p-4 text-xs"><Detail label="Monthly stipend" value={formatCurrency(internship.stipendPerMonth)} /><Detail label="Work type" value={internship.type === "on-site" ? "On-site" : internship.type[0].toUpperCase() + internship.type.slice(1)} />{internship.type !== "remote" && <Detail label="Location" value={internship.location || "Not provided"} />}<Detail label="Application deadline" value={formatDate(internship.applicationDeadline)} /><Detail label="Applications" value={internship.acceptingApplications ? "Accepting applications" : "Closed"} /></div>
              <button type="button" onClick={() => setEditing(true)} className="w-full rounded-lg bg-[#176b50] px-4 py-3 text-sm font-semibold text-white hover:bg-[#12583f]">Edit internship</button>
              <button type="button" onClick={() => router.push(listHref)} className="mt-2 w-full rounded-lg border border-[#dfe5df] px-4 py-3 text-sm font-semibold text-[#526057]">Back to directory</button>
            </div></aside>
          </div>}
  </AppShell>;
}

function InternshipEditor({ initial, saving, onCancel, onSave }: { initial: InternshipRecord; saving: boolean; onCancel: () => void; onSave: (draft: InternshipDraft) => void }) {
  const [company, setCompany] = useState(initial.company);
  const [role, setRole] = useState(initial.role);
  const [domain, setDomain] = useState(initial.domain);
  const [stipend, setStipend] = useState(String(initial.stipendPerMonth));
  const [type, setType] = useState<InternshipRecord["type"]>(initial.type);
  const [location, setLocation] = useState(initial.location ?? "");
  const [description, setDescription] = useState(initial.description);
  const [deadline, setDeadline] = useState(initial.applicationDeadline);
  const [minCgpa, setMinCgpa] = useState(String(initial.minCgpa));
  const [branches, setBranches] = useState(initial.eligibleBranches.join("\n"));
  const [skills, setSkills] = useState(initial.requiredSkills.join("\n"));
  const [published, setPublished] = useState(initial.published);
  const [acceptingApplications, setAcceptingApplications] = useState(initial.acceptingApplications);
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const stipendPerMonth = Number(stipend);
    const numericCgpa = Number(minCgpa);
    if (!company.trim() || !role.trim() || !deadline || !branches.trim()) {
      setError("Company, role, deadline, and eligible branches are required.");
      return;
    }
    if (!description.trim()) {
      setError("Description is required.");
      return;
    }
    if (!Number.isFinite(stipendPerMonth) || stipendPerMonth < 0 || !Number.isFinite(numericCgpa) || numericCgpa < 0 || numericCgpa > 10) {
      setError("Enter a non-negative stipend and a minimum CGPA from 0 to 10.");
      return;
    }
    if (type !== "remote" && !location.trim()) {
      setError("Location is required for hybrid and on-site internships.");
      return;
    }
    setError("");
    onSave({
      company: company.trim(), role: role.trim(), domain,
      stipendPerMonth, type, location: type === "remote" ? null : location.trim(), description: description.trim(),
      applicationDeadline: deadline, minCgpa: numericCgpa, eligibleBranches: branches,
      requiredSkills: skills, published, acceptingApplications,
    });
  }

  const inputClass = "mt-1 block w-full rounded-lg border border-[#dfe5df] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#176b50]";
  return <form onSubmit={submit} className="rounded-xl border border-[#e2e7e1] bg-white p-6" aria-label="Edit internship">
    <div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-[#176b50]">Edit opportunity</p><h2 className="mt-1 text-xl font-semibold">{initial.role}</h2></div><button type="button" onClick={onCancel} className="text-xs font-semibold text-[#6e786f]">Cancel</button></div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <label className="text-xs font-medium text-[#526057]">Company<input required value={company} onChange={(event) => setCompany(event.target.value)} maxLength={191} className={inputClass} /></label>
      <label className="text-xs font-medium text-[#526057]">Role<input required value={role} onChange={(event) => setRole(event.target.value)} maxLength={191} className={inputClass} /></label>
      <label className="text-xs font-medium text-[#526057]">Domain<select value={domain} onChange={(event) => setDomain(event.target.value)} className={inputClass}><option>Software Development</option><option>Data & Analytics</option><option>Design</option><option>Business</option><option>Other</option></select></label>
      <label className="text-xs font-medium text-[#526057]">Monthly stipend<input required type="number" min="0" step="0.01" value={stipend} onChange={(event) => setStipend(event.target.value)} className={inputClass} /></label>
      <label className="text-xs font-medium text-[#526057]">Work type<select value={type} onChange={(event) => setType(event.target.value as InternshipRecord["type"])} className={inputClass}><option value="remote">Remote</option><option value="hybrid">Hybrid</option><option value="on-site">On-site</option></select></label>
      {type !== "remote" && <label className="text-xs font-medium text-[#526057]">Location<input required value={location} onChange={(event) => setLocation(event.target.value)} maxLength={191} className={inputClass} /></label>}
      <label className="text-xs font-medium text-[#526057]">Application deadline<input required type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} className={inputClass} /></label>
      <label className="text-xs font-medium text-[#526057]">Minimum CGPA<input required type="number" min="0" max="10" step="0.1" value={minCgpa} onChange={(event) => setMinCgpa(event.target.value)} className={inputClass} /></label>
      <label className="text-xs font-medium text-[#526057]">Eligible branches<textarea required value={branches} onChange={(event) => setBranches(event.target.value)} placeholder="One per line, or Any branch" className={`${inputClass} min-h-24`} /></label>
      <label className="text-xs font-medium text-[#526057] md:col-span-2 xl:col-span-3">Description<textarea required maxLength={20_000} value={description} onChange={(event) => setDescription(event.target.value)} className={`${inputClass} min-h-36`} /></label>
      <label className="text-xs font-medium text-[#526057] md:col-span-2 xl:col-span-3">Required skills<textarea value={skills} onChange={(event) => setSkills(event.target.value)} placeholder="One per line" className={`${inputClass} min-h-24`} /></label>
    </div>
    <div className="mt-4 flex flex-wrap gap-6 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={published} onChange={(event) => setPublished(event.target.checked)} /> Published to students</label><label className="flex items-center gap-2"><input type="checkbox" checked={acceptingApplications} onChange={(event) => setAcceptingApplications(event.target.checked)} /> Accepting applications</label></div>
    {error && <p role="alert" className="mt-4 text-xs text-[#b94b48]">{error}</p>}
    <div className="mt-5 flex gap-2"><button type="submit" disabled={saving} className="rounded-lg bg-[#176b50] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving…" : "Save changes"}</button><button type="button" onClick={onCancel} disabled={saving} className="rounded-lg border border-[#dfe5df] px-4 py-2.5 text-sm">Cancel</button></div>
  </form>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><div className="mb-1 text-xs text-[#7b857c]">{label}</div><div className="text-sm font-semibold text-[#344238]">{value}</div></div>;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}