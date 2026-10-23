"use client";

import Link from "next/link";
import { io } from "next/cache";
import { use, useEffect, useMemo, useState } from "react";
import { AppShell, StatusBadge } from "@/components/app-shell";
import { currentStudent, formatDate, getInternshipStatus, internships } from "@/lib/placement-data";

type ListingEligibility = { eligible: boolean | null; reason?: string };
type AvailabilityResponse = {
  eligible?: boolean;
  eligibilityReasons?: string[];
  student?: { branch: string | null; cgpa: number | null };
  error?: string;
};

export default function InternshipsView({ role = "student" }: { role?: "student" | "admin" | "super-admin" }) {
  use(io());
  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState("All domains");
  const [status, setStatus] = useState("All statuses");
  const [eligibilityById, setEligibilityById] = useState<Record<string, ListingEligibility>>({});
  const [profile, setProfile] = useState<{ branch: string | null; cgpa: number | null } | null>(null);
  const [eligibilityLoading, setEligibilityLoading] = useState(role === "student");

  const filtered = useMemo(() => internships.filter((item) => {
    const matchesQuery = `${item.company} ${item.role} ${item.location} ${item.skills.join(" ")}`.toLowerCase().includes(query.toLowerCase());
    const matchesDomain = domain === "All domains" || item.domain === domain;
    const matchesStatus = status === "All statuses" || getInternshipStatus(item.deadline) === status;
    return matchesQuery && matchesDomain && matchesStatus;
  }), [query, domain, status]);

  useEffect(() => {
    if (role !== "student") {
      return;
    }
    let active = true;
    Promise.all(internships.map(async (item) => {
      try {
        const response = await fetch(`/api/internships/${encodeURIComponent(item.id)}/applications`);
        const result = await response.json() as AvailabilityResponse;
        if (!response.ok) return { id: item.id, eligible: null, reason: result.error ?? "Could not check eligibility." };
        return {
          id: item.id,
          eligible: result.eligible === true,
          reason: result.eligibilityReasons?.join(" "),
          student: result.student,
        };
      } catch {
        return { id: item.id, eligible: null, reason: "Could not check eligibility." };
      }
    })).then((results) => {
      if (!active) return;
      setEligibilityById(Object.fromEntries(results.map(({ id, eligible, reason }) => [id, { eligible, reason }])));
      const studentProfile = results.find((result) => result.student)?.student;
      if (studentProfile) setProfile(studentProfile);
    }).finally(() => { if (active) setEligibilityLoading(false); });
    return () => { active = false; };
  }, [role]);

  const profileLabel = role === "student"
    ? profile ? `Profile: ${profile.branch || "Branch not set"} · ${profile.cgpa ?? "—"} CGPA` : eligibilityLoading ? "Loading profile…" : "Profile unavailable"
    : `Profile: ${currentStudent.branch} · ${currentStudent.cgpa} CGPA`;

  return <AppShell role={role} title="Internship directory" eyebrow="Opportunities">
    <div className="mb-6 flex items-end justify-between"><p className="text-sm text-[#6e786f]">Find your next opportunity from {internships.length} active and recent listings.</p><span className="text-xs text-[#7b857c]">{profileLabel}</span></div>
    <div className="mb-5 flex flex-wrap gap-3 rounded-xl border border-[#e2e7e1] bg-white p-4"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search company, role, skill..." className="min-w-[240px] flex-1 rounded-lg border border-[#dfe5df] bg-[#fafbf9] px-3 py-2.5 text-sm outline-none focus:border-[#176b50]" /><select value={domain} onChange={(event) => setDomain(event.target.value)} className="rounded-lg border border-[#dfe5df] bg-[#fafbf9] px-3 py-2.5 text-sm text-[#526057] outline-none"><option>All domains</option><option>Software Development</option><option>Data & Analytics</option><option>Design</option><option>Business</option></select><select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-[#dfe5df] bg-[#fafbf9] px-3 py-2.5 text-sm text-[#526057] outline-none"><option>All statuses</option><option>Open</option><option>Closed</option></select></div>
    <div className="overflow-hidden rounded-xl border border-[#e2e7e1] bg-white"><table className="w-full text-left"><thead className="border-b border-[#edf0ec] bg-[#fafbf9] text-[10px] uppercase tracking-[0.12em] text-[#89948b]"><tr><th className="px-5 py-3">Opportunity</th><th className="px-5 py-3">Domain</th><th className="px-5 py-3">Location</th><th className="px-5 py-3">Deadline</th><th className="px-5 py-3">Eligibility</th><th className="px-5 py-3">Status</th></tr></thead><tbody>{filtered.map((item) => {
      const open = getInternshipStatus(item.deadline) === "Open";
      const staticEligible = currentStudent.cgpa >= item.minCgpa && (item.branches.includes("Any branch") || item.branches.includes(currentStudent.branch));
      const listingEligibility = eligibilityById[item.id];
      const eligible = role === "student" ? listingEligibility?.eligible === true : staticEligible;
      const eligibilityLabel = role === "student" && eligibilityLoading ? "Checking…" : role === "student" && listingEligibility?.eligible === null ? "Unavailable" : eligible ? "Eligible" : "Review requirements";
      return <tr key={item.id} className="border-b border-[#edf0ec] last:border-0 hover:bg-[#fcfdfb]"><td className="px-5 py-4"><Link href={`/student/internships/${item.id}`} className="text-sm font-semibold hover:text-[#176b50]">{item.role}</Link><div className="mt-1 text-xs text-[#7b857c]">{item.company} · {item.stipend}</div></td><td className="px-5 py-4 text-xs text-[#5e6b61]">{item.domain}</td><td className="px-5 py-4 text-xs text-[#5e6b61]">{item.location}</td><td className="px-5 py-4 text-xs text-[#5e6b61]">{formatDate(item.deadline)}</td><td className="px-5 py-4 text-xs font-semibold" title={role === "student" ? listingEligibility?.reason : undefined}>{eligibilityLabel}{role === "student" && listingEligibility?.reason && <span className="sr-only">: {listingEligibility.reason}</span>}</td><td className="px-5 py-4"><StatusBadge status={open ? "Open" : "Closed"} /></td></tr>;
    })}</tbody></table>{filtered.length === 0 && <div className="p-12 text-center text-sm text-[#7b857c]">No internships match your filters.</div>}</div>
  </AppShell>;
}
