"use client";

import { useState, type FormEvent } from "react";
import { AppShell } from "@/components/app-shell";
import { getStudentById } from "@/lib/student-store";
import { addSkill, editSkill, removeSkill, updateStudentProfile, type ResumeFileInput, type StudentProfileDraft } from "@/lib/student-profile";

const STUDENT_ID = "stu-001";
const inputClass = "w-full rounded-lg border border-[#dfe5df] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#176b50]";
const labelClass = "mb-1.5 block text-xs font-semibold text-[#526057]";

function initialDraft(): StudentProfileDraft {
  const student = getStudentById(STUDENT_ID)!;
  return { name: student.name, email: student.email, branch: student.branch, cgpa: student.cgpa, yearOfStudy: student.yearOfStudy, skills: [...student.skills], resume: student.resume ? { ...student.resume } : null };
}

export default function StudentProfileView() {
  const [profile, setProfile] = useState(() => getStudentById(STUDENT_ID)!);
  const [draft, setDraft] = useState<StudentProfileDraft>(initialDraft);
  const [editing, setEditing] = useState(false);
  const [newSkill, setNewSkill] = useState("");
  const [resumeFile, setResumeFile] = useState<ResumeFileInput | undefined>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState("");

  function startEditing() {
    setDraft(initialDraft());
    setErrors({});
    setSuccess("");
    setResumeFile(undefined);
    setEditing(true);
  }

  function cancelEditing() {
    setDraft({ name: profile.name, email: profile.email, branch: profile.branch, cgpa: profile.cgpa, yearOfStudy: profile.yearOfStudy, skills: [...profile.skills], resume: profile.resume ? { ...profile.resume } : null });
    setResumeFile(undefined);
    setErrors({});
    setEditing(false);
  }

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccess("");
    const result = updateStudentProfile(STUDENT_ID, draft, resumeFile);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setProfile(result.profile);
    setDraft({ name: result.profile.name, email: result.profile.email, branch: result.profile.branch, cgpa: result.profile.cgpa, yearOfStudy: result.profile.yearOfStudy, skills: [...result.profile.skills], resume: result.profile.resume ? { ...result.profile.resume } : null });
    setErrors({});
    setResumeFile(undefined);
    setEditing(false);
    setSuccess("Profile updated. Changes are stored in this browser session only and reset if you refresh.");
  }

  function updateField<K extends keyof StudentProfileDraft>(field: K, value: StudentProfileDraft[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  }

  return <AppShell role="student" title="My profile" eyebrow="Student workspace">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-sm text-[#6e786f]">Keep your academic and contact details up to date.</p><p className="mt-1 text-xs text-[#9aa49b]">This prototype keeps changes in memory for this browser session only.</p></div>
      {!editing && <button type="button" onClick={startEditing} className="rounded-lg bg-[#176b50] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#12563f]">Edit profile</button>}
    </div>
    {success && <p role="status" className="mb-5 rounded-lg border border-[#b9d6c4] bg-[#f1f8f3] px-4 py-3 text-sm text-[#176b50]">{success}</p>}
    {errors.profile && <p role="alert" className="mb-5 rounded-lg border border-[#f1d1ce] bg-[#fff8f7] px-4 py-3 text-sm text-[#b94b48]">{errors.profile}</p>}
    <form onSubmit={saveProfile}>
      <div className="grid gap-5 md:grid-cols-2">
        <section className="rounded-xl border border-[#e2e7e1] bg-white p-5 md:p-6">
          <h2 className="mb-5 text-sm font-bold">Personal information</h2>
          <div className="space-y-4">
            <Field label="Full name" error={errors.name}>{editing ? <input className={inputClass} autoComplete="name" value={draft.name} onChange={(event) => updateField("name", event.target.value)} /> : <Value>{profile.name}</Value>}</Field>
            <Field label="Academic contact email" error={errors.email}>{editing ? <input className={inputClass} type="email" autoComplete="email" value={draft.email} onChange={(event) => updateField("email", event.target.value)} /> : <Value>{profile.email}</Value>}</Field>
          </div>
        </section>
        <section className="rounded-xl border border-[#e2e7e1] bg-white p-5 md:p-6">
          <h2 className="mb-5 text-sm font-bold">Academic information</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Branch" error={errors.branch}>{editing ? <input className={inputClass} value={draft.branch} onChange={(event) => updateField("branch", event.target.value)} /> : <Value>{profile.branch}</Value>}</Field>
            <Field label="CGPA (0–10)" error={errors.cgpa}>{editing ? <input className={inputClass} type="number" min="0" max="10" step="0.01" value={draft.cgpa} onChange={(event) => updateField("cgpa", event.target.value === "" ? Number.NaN : Number(event.target.value))} /> : <Value>{profile.cgpa.toFixed(1)} / 10</Value>}</Field>
            <Field label="Academic year" error={errors.yearOfStudy}>{editing ? <select className={inputClass} value={draft.yearOfStudy} onChange={(event) => updateField("yearOfStudy", Number(event.target.value))}>{[1, 2, 3, 4].map((year) => <option key={year} value={year}>{year}{year === 1 ? "st" : year === 2 ? "nd" : year === 3 ? "rd" : "th"} Year</option>)}</select> : <Value>{ordinal(profile.yearOfStudy)} Year</Value>}</Field>
          </div>
        </section>
        <section className="rounded-xl border border-[#e2e7e1] bg-white p-5 md:p-6">
          <h2 className="mb-5 text-sm font-bold">Skills</h2>
          <div className="flex flex-wrap gap-2">
            {draft.skills.map((skill, index) => editing ? <div key={`${index}-${skill}`} className="flex items-center gap-1 rounded-lg border border-[#dce5de] bg-[#f7faf7] p-1"><input aria-label={`Skill ${index + 1}`} className="w-28 bg-transparent px-2 py-1 text-xs outline-none" value={skill} onChange={(event) => updateField("skills", editSkill(draft.skills, skill, event.target.value))} /><button type="button" aria-label={`Remove ${skill || `skill ${index + 1}`}`} onClick={() => updateField("skills", removeSkill(draft.skills, skill))} className="rounded px-2 py-1 text-xs font-semibold text-[#b94b48] hover:bg-[#fcedeb]">×</button></div> : <span key={skill} className="rounded-lg border border-[#dce5de] bg-[#f7faf7] px-3 py-2 text-xs font-medium text-[#405147]">{skill}</span>)}
          </div>
          {editing && <div className="mt-4 flex gap-2"><label className="sr-only" htmlFor="new-skill">Add a skill</label><input id="new-skill" className={inputClass} value={newSkill} onChange={(event) => setNewSkill(event.target.value)} placeholder="Add a skill" onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); updateField("skills", addSkill(draft.skills, newSkill)); setNewSkill(""); } }} /><button type="button" onClick={() => { updateField("skills", addSkill(draft.skills, newSkill)); setNewSkill(""); }} className="shrink-0 rounded-lg border border-[#b9d6c4] px-3 text-xs font-semibold text-[#176b50]">Add</button></div>}
          {errors.skills && <p className="mt-2 text-xs text-[#b94b48]">{errors.skills}</p>}
        </section>
        <section className="rounded-xl border border-[#e2e7e1] bg-white p-5 md:p-6">
          <h2 className="mb-5 text-sm font-bold">Resume</h2>
          <p className="text-sm text-[#5e6b61]">{draft.resume?.fileName ?? "No resume uploaded"}</p>
          {editing && <div className="mt-4 space-y-3"><label className={labelClass} htmlFor="resume-file">Upload resume (PDF, up to 5 MB)</label><input id="resume-file" type="file" accept="application/pdf,.pdf" className="block w-full text-xs text-[#5e6b61] file:mr-3 file:rounded-lg file:border-0 file:bg-[#e6f2ec] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[#176b50]" onChange={(event) => { const file = event.target.files?.[0]; setResumeFile(file ? { name: file.name, type: file.type, size: file.size } : undefined); setErrors((current) => ({ ...current, resume: "" })); }} />{draft.resume && <button type="button" onClick={() => { updateField("resume", null); setResumeFile(undefined); }} className="text-xs font-semibold text-[#b94b48]">Remove current resume</button>}{errors.resume && <p role="alert" className="text-xs text-[#b94b48]">{errors.resume}</p>}<p className="text-xs text-[#9aa49b]">Only the filename and file size are kept in this prototype; file contents are not uploaded.</p></div>}
        </section>
      </div>
      {editing && <div className="mt-5 flex flex-wrap items-center gap-3"><button type="submit" className="rounded-lg bg-[#176b50] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#12563f]">Save profile</button><button type="button" onClick={cancelEditing} className="rounded-lg border border-[#dfe5df] bg-white px-4 py-2.5 text-sm font-semibold text-[#526057]">Cancel</button>{Object.values(errors).some(Boolean) && <p role="alert" className="text-sm text-[#b94b48]">Please correct the highlighted fields before saving.</p>}</div>}
    </form>
  </AppShell>;
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <div><div className={labelClass}>{label}</div>{children}{error && <p className="mt-1 text-xs text-[#b94b48]">{error}</p>}</div>;
}

function Value({ children }: { children: React.ReactNode }) { return <p className="min-h-10 rounded-lg bg-[#fafbf9] px-3 py-2.5 text-sm text-[#17211b]">{children}</p>; }
function ordinal(year: number) { return `${year}${year === 1 ? "st" : year === 2 ? "nd" : year === 3 ? "rd" : "th"}`; }
