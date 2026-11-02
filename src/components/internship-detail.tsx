"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { AppShell, SectionHeading, StatusBadge } from "@/components/app-shell";
import { formatDate } from "@/lib/placement-data";

type EligibilityCheck = { criterion: string; eligible: boolean; reasons: string[] };
type ApplicationAvailability = {
  internship?: {
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
  };
  canApply: boolean;
  isOpen: boolean;
  alreadyApplied: boolean;
  applicationStatus?: string;
  reason?: string;
  eligibilityReasons?: string[];
  eligibilityChecks?: EligibilityCheck[];
  profileResumeAvailable?: boolean;
  student?: { name: string | null; email: string; branch: string | null; cgpa: number | null };
};

const MAX_RESUME_SIZE = 5 * 1024 * 1024;

export function InternshipDetail({ id }: { id: string }) {
  const [availability, setAvailability] = useState<ApplicationAvailability | null>(null);
  const [availabilityError, setAvailabilityError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [resume, setResume] = useState<File | null>(null);
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`/api/internships/${encodeURIComponent(id)}/applications`)
      .then(async (response) => {
        const result = await response.json() as ApplicationAvailability & { error?: string };
        if (!response.ok) throw new Error(result.error ?? "Could not check application availability.");
        if (active) {
          setAvailability(result);
        }
      })
      .catch((cause: unknown) => {
        if (active) setAvailabilityError(cause instanceof Error ? cause.message : "Could not check application availability.");
      });
    return () => { active = false; };
  }, [id]);

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

  const internship = availability?.internship;
  if (!internship) return <AppShell title="Internship details" eyebrow="Opportunities"><div className="rounded-xl border border-[#e2e7e1] bg-white p-10 text-center"><h2 className="font-semibold">{availabilityError || "Loading internship details…"}</h2><Link href="/student/internships" className="mt-4 inline-block text-sm font-semibold text-[#176b50]">Back to directory</Link></div></AppShell>;

  const displayedOpen = availability?.isOpen ?? false;
  const cgpaCheck = availability?.eligibilityChecks?.find((check) => check.criterion === "CGPA");
  const branchCheck = availability?.eligibilityChecks?.find((check) => check.criterion === "Branch");

  return <AppShell title={internship.role} eyebrow="Internship details">
    <Link href="/student/internships" className="mb-6 inline-block text-xs font-semibold text-[#176b50]">← Back to directory</Link>
    <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <div className="rounded-xl border border-[#e2e7e1] bg-white p-7">
        <div className="mb-8 flex items-start justify-between"><div><div className="mb-2 text-sm font-semibold text-[#176b50]">{internship.company}</div><h2 className="text-2xl font-semibold tracking-tight">{internship.role}</h2><p className="mt-2 text-sm text-[#6e786f]">{internship.domain}</p></div><StatusBadge status={displayedOpen ? "Open" : "Closed"} /></div>
        <SectionHeading title="About the role" /><p className="mb-8 whitespace-pre-wrap text-sm leading-7 text-[#5e6b61]">{internship.description || "No description has been added yet."}</p>
        <SectionHeading title="Opportunity details" /><div className="mb-8 grid gap-3 sm:grid-cols-2"><Requirement label="Monthly stipend" value={new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(internship.stipendPerMonth)} okay /><Requirement label="Work type" value={internship.type === "on-site" ? "On-site" : internship.type[0].toUpperCase() + internship.type.slice(1)} okay />{internship.type !== "remote" && <Requirement label="Location" value={internship.location || "Not provided"} okay />}</div>
        <SectionHeading title="Skills mentioned by employer" /><p className="-mt-5 mb-3 text-xs text-[#7b857c]">For reference only; skill match is not used to determine application eligibility.</p><div className="mb-8 flex flex-wrap gap-2">{internship.requiredSkills.map((skill) => <span className="rounded-lg border border-[#dce5de] bg-[#f7faf7] px-3 py-2 text-xs font-medium text-[#405147]" key={skill}>{skill}</span>)}</div>
        <SectionHeading title="Eligibility requirements" />
        <div className="grid gap-3 sm:grid-cols-2"><Requirement label="Eligible branches" value={internship.eligibleBranches.join(", ")} okay={branchCheck?.eligible === true} /><Requirement label="Minimum CGPA" value={`${internship.minCgpa} / 10`} okay={cgpaCheck?.eligible === true} /></div>
        {availability && <section className="mt-5 rounded-lg border border-[#e2e7e1] bg-[#fafbf9] p-4" aria-live="polite">
          <h3 className="mb-3 text-sm font-semibold">Your eligibility</h3>
          <ul className="space-y-2 text-xs">
            <EligibilityRow label={`CGPA ${availability.student?.cgpa ?? "Not set"} / 10 (minimum ${internship.minCgpa} / 10)`} eligible={cgpaCheck?.eligible === true} reason={cgpaCheck?.reasons.join(" ")} />
            <EligibilityRow label={`Branch: ${availability.student?.branch || "Not set"}`} eligible={branchCheck?.eligible === true} reason={branchCheck?.reasons.join(" ")} />
          </ul>
        </section>}
      </div>

      <aside><div className="sticky top-6 rounded-xl border border-[#e2e7e1] bg-white p-6">
        <div className="mb-5 text-xs font-bold uppercase tracking-[0.12em] text-[#89948b]">Your application</div>
        <div className="mb-5 rounded-lg bg-[#fafbf9] p-4"><div className="flex justify-between text-xs"><span className="text-[#7b857c]">Application deadline</span><span className="font-semibold">{formatDate(internship.applicationDeadline)}</span></div><div className="mt-3 flex justify-between text-xs"><span className="text-[#7b857c]">Your CGPA</span><span className="font-semibold">{availability?.student?.cgpa ?? "—"} / 10</span></div></div>
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
