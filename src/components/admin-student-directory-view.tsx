"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { filterStudents, getStudentSkillOptions, searchSkillOptions, type StudentSearchCriteria } from "@/lib/student-search";
import type { Student } from "@/lib/placement-data";

const inputClass = "w-full rounded-lg border border-[#dfe5df] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#176b50]";
const initialCriteria: StudentSearchCriteria = { name: "", email: "", branch: "All branches", minCgpa: "", maxCgpa: "", yearOfStudy: "All years", skills: [] };

export default function AdminStudentDirectoryView({ role = "admin" }: { role?: "admin" | "super-admin" }) {
  const [records, setRecords] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [criteria, setCriteria] = useState<StudentSearchCriteria>(initialCriteria);
  const [skillQuery, setSkillQuery] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadRecords() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/admin/students", { cache: "no-store" });
        const result = (await response.json()) as { students?: Student[]; error?: string };
        if (!response.ok || !Array.isArray(result.students)) {
          throw new Error(result.error ?? "The student directory is temporarily unavailable.");
        }
        if (!cancelled) setRecords(result.students);
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "The student directory is temporarily unavailable.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadRecords();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => filterStudents(records, criteria), [records, criteria]);
  const branches = [...new Set(records.map((student) => student.branch))].sort();
  const skills = getStudentSkillOptions(records);
  const matchingSkills = searchSkillOptions(skills, skillQuery);

  function updateCriteria<K extends keyof StudentSearchCriteria>(key: K, value: StudentSearchCriteria[K]) {
    setCriteria((current) => ({ ...current, [key]: value }));
  }

  function toggleSkill(skill: string) {
    const selected = criteria.skills ?? [];
    updateCriteria("skills", selected.includes(skill) ? selected.filter((item) => item !== skill) : [...selected, skill]);
  }

  return <AppShell role={role} title="Student directory" eyebrow="Administration">
    {error && <p role="alert" className="mb-5 rounded-lg border border-[#f1d1ce] bg-[#fff8f7] px-4 py-3 text-sm text-[#b94b48]">{error}</p>}
    {!loading && <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm text-[#6e786f]">Search student profiles by contact, academics, and skills.</p><p className="mt-1 text-xs text-[#9aa49b]">Directory data is loaded from the authenticated admin session.</p></div><span className="text-sm font-semibold text-[#526057]">{filtered.length} {filtered.length === 1 ? "student" : "students"}</span></div>}
    {loading ? <p className="text-sm text-[#6e786f]">Loading student directory…</p> : <><section aria-label="Student filters" className="mb-5 rounded-xl border border-[#e2e7e1] bg-white p-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <label className="text-xs font-semibold text-[#526057]">Name<input className={`${inputClass} mt-1.5 font-normal`} value={criteria.name ?? ""} onChange={(event) => updateCriteria("name", event.target.value)} placeholder="Search name" /></label>
        <label className="text-xs font-semibold text-[#526057]">Email<input className={`${inputClass} mt-1.5 font-normal`} type="search" value={criteria.email ?? ""} onChange={(event) => updateCriteria("email", event.target.value)} placeholder="Search email" /></label>
        <label className="text-xs font-semibold text-[#526057]">Branch<select className={`${inputClass} mt-1.5 font-normal`} value={criteria.branch ?? "All branches"} onChange={(event) => updateCriteria("branch", event.target.value)}><option>All branches</option>{branches.map((branch) => <option key={branch}>{branch}</option>)}</select></label>
        <label className="text-xs font-semibold text-[#526057]">Academic year<select className={`${inputClass} mt-1.5 font-normal`} value={String(criteria.yearOfStudy ?? "All years")} onChange={(event) => updateCriteria("yearOfStudy", event.target.value)}><option>All years</option>{[1, 2, 3, 4].map((year) => <option value={year} key={year}>{year}{year === 1 ? "st" : year === 2 ? "nd" : year === 3 ? "rd" : "th"} Year</option>)}</select></label>
        <label className="text-xs font-semibold text-[#526057]">Minimum CGPA<input className={`${inputClass} mt-1.5 font-normal`} type="number" min="0" max="10" step="0.1" value={criteria.minCgpa ?? ""} onChange={(event) => updateCriteria("minCgpa", event.target.value)} placeholder="No minimum" /></label>
        <label className="text-xs font-semibold text-[#526057]">Maximum CGPA<input className={`${inputClass} mt-1.5 font-normal`} type="number" min="0" max="10" step="0.1" value={criteria.maxCgpa ?? ""} onChange={(event) => updateCriteria("maxCgpa", event.target.value)} placeholder="No maximum" /></label>
        <fieldset className="sm:col-span-2">
          <legend className="mb-2 text-xs font-semibold text-[#526057]">Skills <span className="font-normal text-[#89948b]">(students must have all selected)</span></legend>
          <label className="sr-only" htmlFor="directory-skill-search">Search available skills</label>
          <input id="directory-skill-search" type="search" className={`${inputClass} max-w-md`} value={skillQuery} onChange={(event) => setSkillQuery(event.target.value)} placeholder="Type to search skills" autoComplete="off" />
          {(criteria.skills ?? []).length > 0 && <div className="mt-2 flex flex-wrap gap-2" aria-label="Selected skills">{criteria.skills?.map((skill) => <span key={skill} className="inline-flex items-center gap-1 rounded-full bg-[#e6f2ec] py-1 pl-2.5 pr-1 text-xs font-medium text-[#176b50]">{skill}<button type="button" aria-label={`Remove ${skill} skill filter`} onClick={() => toggleSkill(skill)} className="rounded-full px-1.5 py-0.5 text-sm leading-none hover:bg-[#d5e9dc]">×</button></span>)}</div>}
          {skillQuery.trim() ? <div className="mt-2 max-h-36 max-w-md overflow-y-auto rounded-lg border border-[#e2e7e1] bg-white p-2" role="group" aria-label="Matching skills">
            {matchingSkills.length > 0 ? <>{matchingSkills.map((skill) => <label key={skill} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs text-[#5e6b61] hover:bg-[#f7f9f6]"><input type="checkbox" checked={(criteria.skills ?? []).includes(skill)} onChange={() => toggleSkill(skill)} className="accent-[#176b50]" />{skill}</label>)}{matchingSkills.length === 50 && <p className="px-2 py-1.5 text-[11px] text-[#89948b]">Showing up to 50 matches. Refine your search to narrow the list.</p>}</> : <p className="px-2 py-1.5 text-xs text-[#89948b]">No skills match that search.</p>}
          </div> : <p className="mt-2 text-xs text-[#89948b]">Search {skills.length} available skills to add a filter.</p>}
        </fieldset>
      </div>
      <button type="button" onClick={() => { setCriteria({ ...initialCriteria, skills: [] }); setSkillQuery(""); }} className="mt-4 rounded-lg border border-[#dfe5df] px-3 py-2 text-xs font-semibold text-[#526057] hover:bg-[#f7f9f6]">Clear filters</button>
    </section>
    <div className="hidden overflow-hidden rounded-xl border border-[#e2e7e1] bg-white md:block">
      <div role="region" aria-label="Student directory results" tabIndex={0} className="max-h-[60vh] overflow-auto overscroll-contain focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#176b50] lg:max-h-[min(65vh,calc(100vh-18rem))]"><table className="w-full min-w-[760px] text-left"><thead className="border-b border-[#edf0ec] bg-[#fafbf9] text-[10px] uppercase tracking-[0.12em] text-[#89948b]"><tr><th className="px-5 py-3 font-semibold">Name</th><th className="px-5 py-3 font-semibold">Email</th><th className="px-5 py-3 font-semibold">Branch</th><th className="px-5 py-3 font-semibold">CGPA</th><th className="px-5 py-3 font-semibold">Year</th><th className="px-5 py-3 font-semibold">Skills</th></tr></thead><tbody>{filtered.map((student) => <tr key={student.id} className="border-b border-[#edf0ec] last:border-0"><td className="px-5 py-4 text-sm font-semibold">{student.name}</td><td className="px-5 py-4 text-xs text-[#5e6b61]">{student.email}</td><td className="px-5 py-4 text-xs text-[#5e6b61]">{student.branch}</td><td className="px-5 py-4 text-xs font-semibold">{student.cgpa.toFixed(1)}</td><td className="px-5 py-4 text-xs text-[#5e6b61]">{student.yearOfStudy}</td><td className="px-5 py-4"><div className="flex max-w-xs flex-wrap gap-1">{student.skills.map((skill) => <span key={skill} className="rounded border border-[#e2e7e1] px-1.5 py-1 text-[10px] text-[#6e786f]">{skill}</span>)}</div></td></tr>)}</tbody></table></div>
    </div>
    <div className="space-y-3 md:hidden">{filtered.map((student) => <article key={student.id} className="rounded-xl border border-[#e2e7e1] bg-white p-4"><h2 className="mb-3 text-sm font-semibold">{student.name}</h2><dl className="grid grid-cols-[90px_1fr] gap-x-3 gap-y-2 text-xs"><dt className="text-[#89948b]">Email</dt><dd className="break-all text-[#526057]">{student.email}</dd><dt className="text-[#89948b]">Branch</dt><dd className="text-[#526057]">{student.branch}</dd><dt className="text-[#89948b]">CGPA</dt><dd className="text-[#526057]">{student.cgpa.toFixed(1)}</dd><dt className="text-[#89948b]">Year</dt><dd className="text-[#526057]">{student.yearOfStudy}</dd><dt className="text-[#89948b]">Skills</dt><dd className="flex flex-wrap gap-1">{student.skills.map((skill) => <span key={skill} className="rounded border border-[#e2e7e1] px-1.5 py-1 text-[10px] text-[#6e786f]">{skill}</span>)}</dd></dl></article>)}</div>
    {filtered.length === 0 && <div className="rounded-xl border border-[#e2e7e1] bg-white p-10 text-center text-sm text-[#7b857c]">No students match your filters.</div>}
    </>}
  </AppShell>;
}
