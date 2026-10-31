"use client";

import Link from "next/link";
import { io } from "next/cache";
import { use, useEffect, useMemo, useState } from "react";
import { AppShell, StatusBadge } from "@/components/app-shell";
import { formatDate } from "@/lib/placement-data";

type Listing = {
  id: string;
  company: string;
  role: string;
  domain: string;
  applicationDeadline: string;
  minCgpa: number;
  eligibleBranches: string[];
  requiredSkills: string[];
  isOpen: boolean;
  eligibility: { eligible: boolean; status: "eligible" | "ineligible" | "undetermined"; reasons: string[] };
};
type ListingsResponse = {
  profile?: { branch: string; cgpa: number; complete: boolean } | null;
  internships?: Listing[];
  error?: string;
};

export default function InternshipsView({ role = "student" }: { role?: "student" | "admin" | "super-admin" }) {
  use(io());
  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState("All domains");
  const [status, setStatus] = useState("All statuses");
  const [listings, setListings] = useState<Listing[]>([]);
  const [profile, setProfile] = useState<ListingsResponse["profile"]>(null);
  const [loading, setLoading] = useState(role === "student");
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (role !== "student") return;
    let active = true;
    fetch("/api/internships", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json() as ListingsResponse;
        if (!response.ok) throw new Error(result.error ?? "Could not load internships.");
        if (active) {
          setListings(result.internships ?? []);
          setProfile(result.profile ?? null);
        }
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load internships.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [role, reload]);

  const filtered = useMemo(() => listings.filter((item) => {
    const searchable = `${item.company} ${item.role} ${item.requiredSkills.join(" ")} ${item.eligibleBranches.join(" ")}`.toLowerCase();
    const matchesQuery = searchable.includes(query.trim().toLowerCase());
    const matchesDomain = domain === "All domains" || item.domain === domain;
    const matchesStatus = status === "All statuses" || (status === "Open" ? item.isOpen : !item.isOpen);
    return matchesQuery && matchesDomain && matchesStatus;
  }), [listings, query, domain, status]);

  const profileLabel = error
    ? "Profile check unavailable"
    : profile
    ? profile.complete
      ? `Profile: ${profile.branch} · ${profile.cgpa} CGPA`
      : "Profile incomplete — update your branch or CGPA to check eligibility"
    : "Profile unavailable";

  return <AppShell role={role} title="Internship directory" eyebrow="Opportunities">
    <div className="mb-6 flex items-end justify-between gap-4"><p className="text-sm text-[#6e786f]">Browse published internship opportunities and check your eligibility.</p><span className="text-right text-xs text-[#7b857c]">{loading ? "Loading profile…" : profileLabel}</span></div>
    <div className="mb-5 flex flex-wrap gap-3 rounded-xl border border-[#e2e7e1] bg-white p-4"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search company, role, skill..." className="min-w-[240px] flex-1 rounded-lg border border-[#dfe5df] bg-[#fafbf9] px-3 py-2.5 text-sm outline-none focus:border-[#176b50]" /><select value={domain} onChange={(event) => setDomain(event.target.value)} className="rounded-lg border border-[#dfe5df] bg-[#fafbf9] px-3 py-2.5 text-sm text-[#526057] outline-none"><option>All domains</option><option>Software Development</option><option>Data & Analytics</option><option>Design</option><option>Business</option><option>Other</option></select><select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-[#dfe5df] bg-[#fafbf9] px-3 py-2.5 text-sm text-[#526057] outline-none"><option>All statuses</option><option>Open</option><option>Closed</option></select></div>
    {error && <div role="alert" className="mb-4 flex items-center justify-between rounded-lg bg-[#fff8f7] p-4 text-sm text-[#b94b48]">{error}<button onClick={() => { setError(""); setLoading(true); setReload((value) => value + 1); }} className="ml-4 font-semibold underline">Retry</button></div>}
    <div role="region" aria-label="Internship opportunities" tabIndex={0} className="max-h-[60vh] overflow-auto overscroll-contain rounded-xl border border-[#e2e7e1] bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176b50] lg:max-h-[min(65vh,calc(100vh-18rem))]"><table className="w-full min-w-[900px] text-left"><thead className="text-[10px] uppercase tracking-[0.12em] text-[#89948b]"><tr><th scope="col" className="sticky top-0 z-10 border-b border-[#edf0ec] bg-[#fafbf9] px-5 py-3">Opportunity</th><th scope="col" className="sticky top-0 z-10 border-b border-[#edf0ec] bg-[#fafbf9] px-5 py-3">Domain</th><th scope="col" className="sticky top-0 z-10 border-b border-[#edf0ec] bg-[#fafbf9] px-5 py-3">Eligible branches</th><th scope="col" className="sticky top-0 z-10 border-b border-[#edf0ec] bg-[#fafbf9] px-5 py-3">Deadline</th><th scope="col" className="sticky top-0 z-10 border-b border-[#edf0ec] bg-[#fafbf9] px-5 py-3">Eligibility</th><th scope="col" className="sticky top-0 z-10 border-b border-[#edf0ec] bg-[#fafbf9] px-5 py-3">Status</th></tr></thead><tbody>{filtered.map((item) => {
      const label = item.eligibility.status === "eligible" ? "Eligible" : item.eligibility.status === "ineligible" ? "Not eligible" : "Unable to determine";
      return <tr key={item.id} className="border-b border-[#edf0ec] last:border-0 hover:bg-[#fcfdfb]"><td className="px-5 py-4"><Link href={`/student/internships/${encodeURIComponent(item.id)}`} className="text-sm font-semibold hover:text-[#176b50]">{item.role}</Link><div className="mt-1 text-xs text-[#7b857c]">{item.company}</div><div className="mt-1 text-xs text-[#7b857c]">Required: {item.requiredSkills.length ? item.requiredSkills.join(", ") : "No specific skills"}</div></td><td className="px-5 py-4 text-xs text-[#5e6b61]">{item.domain}</td><td className="px-5 py-4 text-xs text-[#5e6b61]">{item.eligibleBranches.join(", ") || "Not specified"}</td><td className="px-5 py-4 text-xs text-[#5e6b61]">{formatDate(item.applicationDeadline)}</td><td className="px-5 py-4 text-xs font-semibold" title={item.eligibility.reasons.join(" ")}><span className={item.eligibility.status === "eligible" ? "text-[#176b50]" : item.eligibility.status === "undetermined" ? "text-[#a86618]" : "text-[#b94b48]"}>{label}</span>{item.eligibility.reasons.length > 0 && <span className="mt-1 block max-w-[240px] font-normal text-[#6e786f]">{item.eligibility.reasons.join(" ")}</span>}</td><td className="px-5 py-4"><StatusBadge status={item.isOpen ? "Open" : "Closed"} /></td></tr>;
    })}</tbody></table>{!error && filtered.length === 0 && <div className="p-12 text-center text-sm text-[#7b857c]">{loading ? "Loading published internships…" : listings.length === 0 ? "No published internships are available yet." : "No internships match your filters."}</div>}</div>
  </AppShell>;
}
