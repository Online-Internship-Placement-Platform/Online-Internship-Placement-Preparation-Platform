"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import { AppShell, SectionHeading, StatusBadge } from "@/components/app-shell";
import { formatDate, getInternship, getInternshipStatus } from "@/lib/placement-data";

type EligibilityCheck = { criterion: string; eligible: boolean; reasons: string[] };
type ApplicationAvailability = {
  canApply: boolean;
  isOpen: boolean;
  alreadyApplied: boolean;
  applicationStatus?: string;
  reason?: string;
  eligibilityReasons?: string[];
  eligibilityChecks?: EligibilityCheck[];
  profileResumeAvailable?: boolean;
  student?: { name: string | null; email: string; branch: string | null; cgpa: number | null; skills: string[] };
};

const MAX_RESUME_SIZE = 5 * 1024 * 1024;

export function InternshipDetail({ id }: { id: string }) {
  const internship = getInternship(id);
  const [availability, setAvailability] = useState<ApplicationAvailability | null>(null);
  const [availabilityError, setAvailabilityError] = useState("");
  const [editingSkills, setEditingSkills] = useState(false);
  const [draftSkills, setDraftSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [savingSkills, setSavingSkills] = useState(false);
  const [skillMessage, setSkillMessage] = useState("");
  const [skillError, setSkillError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [resume, setResume] = useState<File | null>(null);
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const refreshAvailability = useCallback(async () => {
    setAvailabilityError("");
    const response = await fetch(`/api/internships/${encodeURIComponent(id)}/applications`);
    const result = await response.json() as ApplicationAvailability & { error?: string };
    if (!response.ok) throw new Error(result.error ?? "Could not check application availability.");
    setAvailability(result);
    setDraftSkills(result.student?.skills ?? []);
  }, [id]);

  useEffect(() => {
    let active = true;
    fetch(`/api/internships/${encodeURIComponent(id)}/applications`)
      .then(async (response) => {
        const result = await response.json() as ApplicationAvailability & { error?: string };
        if (!response.ok) throw new Error(result.error ?? "Could not check application availability.");
        if (active) {
          setAvailability(result);
          setDraftSkills(result.student?.skills ?? []);
        }
      })
      .catch((cause: unknown) => {
        if (active) setAvailabilityError(cause instanceof Error ? cause.message : "Could not check application availability.");
      });
    return () => { active = false; };
  }, [id]);

  function addSkill() {
    const skill = skillInput.trim();
    setSkillError("");
    if (!skill) return;
    if (skill.length > 40) { setSkillError("Skill names must be 40 characters or fewer."); return; }
    if (draftSkills.some((saved) => saved.trim().toLocaleLowerCase() === skill.toLocaleLowerCase())) {
      setSkillError("That skill is already in your list.");
      return;
    }
    if (draftSkills.length >= 50) { setSkillError("You can save up to 50 skills."); return; }
    setDraftSkills((current) => [...current, skill]);
    setSkillInput("");
  }

  function handleSkillKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      addSkill();
    }
  }

  async function saveSkills() {
    setSavingSkills(true);
    setSkillError("");
    setSkillMessage("");
    try {
      const response = await fetch("/api/student/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skills: draftSkills }),
      });
      const result = await response.json() as { skills?: string[]; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Your skills could not be saved.");
      await refreshAvailability();
      setEditingSkills(false);
      setSkillMessage("Skills saved. Eligibility has been refreshed.");
    } catch (cause) {
      setSkillError(cause instanceof Error ? cause.message : "Your skills could not be saved. Please try again.");
    } finally {
      setSavingSkills(false);
    }
  }

  function chooseResume(file: File | undefined) {
    setError("");
    if (!file) { setResume(null); return; }
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Resume must be a PDF file.");
      return;
    }
    if (file.size === 0 || file.size > MAX_RESUME_SIZE) {
      setError(file.size === 0 ? "Choose a non-empty PDF file." : "Resume must be 5 MB or smaller.");
      return;
    }
    setResume(file);
  }

  async function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const body = new FormData();
      if (resume) body.set("resume", resume);
      const response = await fetch(`/api/internships/${encodeURIComponent(id)}/applications`, { method: "POST", body });
      const result = await response.json() as { error?: string; application?: { status: string }; resumeUrl?: string | null };
      if (!response.ok) {
        setError(result.error ?? "We could not submit your application. Please try again.");
        return;
      }
      setSubmitted(true);
      setResumeUrl(result.resumeUrl ?? null);
      setAvailability((current) => current ? { ...current, alreadyApplied: true, applicationStatus: result.application?.status ?? "Pending" } : current);
    } catch {
      setError("We could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!internship) return <AppShell title="Internship not found"><div className="rounded-xl border border-[#e2e7e1] bg-white p-10 text-center"><h2 className="font-semibold">This opportunity is no longer available.</h2><Link href="/student/internships" className="mt-4 inline-block text-sm font-semibold text-[#176b50]">Back to directory</Link></div></AppShell>;

  const open = getInternshipStatus(internship.deadline) === "Open";
  const displayedOpen = availability?.isOpen ?? open;
  const cgpaCheck = availability?.eligibilityChecks?.find((check) => check.criterion === "CGPA");
  const branchCheck = availability?.eligibilityChecks?.find((check) => check.criterion === "Branch");
  const requirementChecks = availability?.eligibilityChecks?.filter((check) => check.criterion !== "Deadline" && check.criterion !== "CGPA" && check.criterion !== "Branch") ?? [];
  const savedSkills = availability?.student?.skills ?? [];

  return <AppShell title={internship.role} eyebrow="Internship details">
    <Link href="/student/internships" className="mb-6 inline-block text-xs font-semibold text-[#176b50]">← Back to directory</Link>
    <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <div className="rounded-xl border border-[#e2e7e1] bg-white p-7">
        <div className="mb-8 flex items-start justify-between"><div><div className="mb-2 text-sm font-semibold text-[#176b50]">{internship.company}</div><h2 className="text-2xl font-semibold tracking-tight">{internship.role}</h2><p className="mt-2 text-sm text-[#6e786f]">{internship.location} · {internship.stipend}</p></div><StatusBadge status={displayedOpen ? "Open" : "Closed"} /></div>
        <SectionHeading title="About the role" /><p className="mb-8 text-sm leading-7 text-[#5e6b61]">{internship.description} You will partner with experienced mentors, contribute to meaningful projects, and learn how high-performing teams ship work.</p>
        <SectionHeading title="Required skills" /><div className="mb-8 flex flex-wrap gap-2">{internship.skills.map((skill) => <span className="rounded-lg border border-[#dce5de] bg-[#f7faf7] px-3 py-2 text-xs font-medium text-[#405147]" key={skill}>{skill}</span>)}</div>
        <div className="mb-3 flex items-center justify-between"><SectionHeading title="Eligibility requirements" />{!editingSkills && <button type="button" onClick={() => { setDraftSkills([...savedSkills]); setEditingSkills(true); setSkillMessage(""); setSkillError(""); }} className="text-xs font-semibold text-[#176b50] underline">Edit skills</button>}</div>
        <div className="grid gap-3 sm:grid-cols-2"><Requirement label="Eligible branches" value={internship.branches.join(", ")} okay={branchCheck?.eligible === true} /><Requirement label="Minimum CGPA" value={`${internship.minCgpa} / 10`} okay={cgpaCheck?.eligible === true} /></div>
        {availability && <section className="mt-5 rounded-lg border border-[#e2e7e1] bg-[#fafbf9] p-4" aria-live="polite">
          <h3 className="mb-3 text-sm font-semibold">Your eligibility</h3>
          <ul className="space-y-2 text-xs">
            <EligibilityRow label={`CGPA ${availability.student?.cgpa ?? "Not set"} / 10 (minimum ${internship.minCgpa} / 10)`} eligible={cgpaCheck?.eligible === true} reason={cgpaCheck?.reasons.join(" ")} />
            <EligibilityRow label={`Branch: ${availability.student?.branch || "Not set"}`} eligible={branchCheck?.eligible === true} reason={branchCheck?.reasons.join(" ")} />
            {requirementChecks.map((check) => {
              const skillLabel = internship.skills.find((skill) => skill.trim().toLocaleLowerCase() === check.criterion) ?? check.criterion;
              return <EligibilityRow key={check.criterion} label={`Skill: ${skillLabel}`} eligible={check.eligible} reason={check.reasons.join(" ")} />;
            })}
          </ul>
        </section>}
        {editingSkills && <section className="mt-5 rounded-lg border border-[#dce5de] bg-white p-4" aria-label="Edit your skills">
          <h3 className="text-sm font-semibold">Your saved skills</h3>
          <p className="mt-1 text-xs text-[#7b857c]">Only add skills you genuinely have. Your changes update your student profile.</p>
          <div className="my-3 flex flex-wrap gap-2">{draftSkills.length ? draftSkills.map((skill, index) => <span key={`${skill}-${index}`} className="inline-flex items-center gap-2 rounded-lg border border-[#dce5de] bg-[#f7faf7] px-3 py-2 text-xs">{skill}<button type="button" aria-label={`Remove ${skill}`} onClick={() => setDraftSkills((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="font-bold text-[#b94b48]">×</button></span>) : <span className="text-xs text-[#7b857c]">No skills saved yet.</span>}</div>
          <div className="flex gap-2"><input value={skillInput} onChange={(event) => setSkillInput(event.currentTarget.value)} onKeyDown={handleSkillKeyDown} maxLength={40} aria-label="Add a skill" placeholder="Add a skill you have" className="min-w-0 flex-1 rounded-lg border border-[#dfe5df] bg-[#fafbf9] px-3 py-2 text-xs outline-none focus:border-[#176b50]" /><button type="button" onClick={addSkill} className="rounded-lg border border-[#dfe5df] px-3 py-2 text-xs font-semibold text-[#176b50]">Add</button></div>
          {skillError && <p role="alert" className="mt-3 text-xs text-[#b94b48]">{skillError}</p>}
          <div className="mt-4 flex gap-2"><button type="button" disabled={savingSkills} onClick={() => void saveSkills()} className="rounded-lg bg-[#176b50] px-4 py-2 text-xs font-semibold text-white disabled:bg-[#b8c2ba]">{savingSkills ? "Saving…" : "Save changes"}</button><button type="button" disabled={savingSkills} onClick={() => { setEditingSkills(false); setDraftSkills([...savedSkills]); setSkillError(""); }} className="rounded-lg border border-[#dfe5df] px-4 py-2 text-xs font-semibold text-[#526057]">Cancel</button></div>
        </section>}
        {skillMessage && <p role="status" className="mt-3 text-xs text-[#176b50]">{skillMessage}</p>}
      </div>

      <aside><div className="sticky top-6 rounded-xl border border-[#e2e7e1] bg-white p-6">
        <div className="mb-5 text-xs font-bold uppercase tracking-[0.12em] text-[#89948b]">Your application</div>
        <div className="mb-5 rounded-lg bg-[#fafbf9] p-4"><div className="flex justify-between text-xs"><span className="text-[#7b857c]">Application deadline</span><span className="font-semibold">{formatDate(internship.deadline)}</span></div><div className="mt-3 flex justify-between text-xs"><span className="text-[#7b857c]">Your CGPA</span><span className="font-semibold">{availability?.student?.cgpa ?? "—"} / 10</span></div></div>
        {submitted || availability?.alreadyApplied ? <div className="rounded-lg bg-[#e6f2ec] p-4 text-center text-sm font-semibold text-[#176b50]">{submitted ? "Application submitted successfully." : "You have already applied."} Status: {availability?.applicationStatus ?? "Pending"}.{resumeUrl && <a href={resumeUrl} className="mt-2 block text-xs underline">View submitted resume</a>}</div> : <>
          {!formOpen ? <div className="space-y-3">{availability?.canApply && <div><input id="resume-before-application" type="file" accept="application/pdf,.pdf" onChange={(event) => { chooseResume(event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} className="sr-only" /><label htmlFor="resume-before-application" className="block cursor-pointer rounded-lg border border-[#176b50] px-4 py-3 text-center text-sm font-semibold text-[#176b50] hover:bg-[#f7faf7]">{resume ? "Replace resume (PDF)" : "Upload resume (PDF)"}</label><p className="mt-2 text-center text-xs text-[#7b857c]">Optional · PDF up to 5 MB{resume ? ` · Selected: ${resume.name}` : ""}</p>{error && <p role="alert" className="mt-2 text-xs text-[#b94b48]">{error}</p>}</div>}<button disabled={availability?.canApply !== true} onClick={() => setFormOpen(true)} className="w-full rounded-lg bg-[#176b50] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#b8c2ba]">{availability === null ? "Checking availability…" : availability.canApply ? "Apply now" : availability.isOpen ? "Not eligible" : "Applications closed"}</button></div> : <form onSubmit={(event) => void apply(event)} className="space-y-4">
            <div className="rounded-lg border border-[#e2e7e1] bg-[#fafbf9] p-4 text-xs leading-5 text-[#5e6b61]"><div className="mb-2 font-semibold text-[#202a23]">Review your application</div><div>{availability?.student?.name || "Student"} · {availability?.student?.email}</div><div>{availability?.student?.branch || "Branch not set"} · CGPA {availability?.student?.cgpa ?? "—"} / 10</div><div className="mt-2 font-medium text-[#176b50]">{internship.role} at {internship.company}</div></div>
            <div><input id="application-resume" type="file" accept="application/pdf,.pdf" onChange={(event) => { chooseResume(event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} className="sr-only" /><label htmlFor="application-resume" className="block cursor-pointer rounded-lg border border-[#176b50] px-4 py-3 text-center text-sm font-semibold text-[#176b50]">{resume ? "Replace resume (PDF)" : "Upload resume (PDF)"}</label><p className="mt-2 text-xs text-[#7b857c]">Optional · PDF up to 5 MB. {availability?.profileResumeAvailable ? "A profile resume is available." : "No profile resume is saved."}</p>{resume && <p className="mt-2 truncate text-xs text-[#405147]">Selected: {resume.name}</p>}</div>
            {error && <p role="alert" className="rounded-lg bg-[#fcedeb] p-3 text-xs leading-5 text-[#b94b48]">{error}</p>}
            <div className="flex gap-2"><button type="submit" disabled={submitting} className="flex-1 rounded-lg bg-[#176b50] px-3 py-3 text-sm font-semibold text-white disabled:bg-[#b8c2ba]">{submitting ? "Submitting…" : "Submit application"}</button><button type="button" onClick={() => { setFormOpen(false); setError(""); }} className="rounded-lg border border-[#dfe5df] px-3 py-3 text-sm font-semibold text-[#526057]">Cancel</button></div>
          </form>}
          {availabilityError && <p role="alert" className="mt-3 rounded-lg bg-[#fcedeb] p-3 text-xs leading-5 text-[#b94b48]">{availabilityError}</p>}
          {availability && !availability.canApply && availability.reason && <p role="alert" className="mt-3 text-xs leading-5 text-[#b94b48]">{availability.reason}</p>}
        </>}
      </div></aside>
    </div>
  </AppShell>;
}

function EligibilityRow({ label, eligible, reason }: { label: string; eligible: boolean; reason?: string }) {
  return <li className={`flex items-start gap-2 ${eligible ? "text-[#176b50]" : "text-[#b94b48]"}`}><span aria-hidden="true">{eligible ? "✓" : "×"}</span><span>{label}{reason && <span className="ml-1 text-[#b94b48]">{reason}</span>}</span></li>;
}

function Requirement({ label, value, okay }: { label: string; value: string; okay: boolean }) {
  return <div className={`rounded-lg border p-4 ${okay ? "border-[#dce5de] bg-[#f7faf7]" : "border-[#f1d1ce] bg-[#fff8f7]"}`}><div className="mb-2 text-xs text-[#7b857c]">{label}</div><div className={`text-sm font-semibold ${okay ? "text-[#176b50]" : "text-[#b94b48]"}`}>{okay ? "✓ " : "× "}{value}</div></div>;
}
