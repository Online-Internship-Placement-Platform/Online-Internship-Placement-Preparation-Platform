
"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Role } from "@/lib/placement-data";
import { AppShell } from "@/components/app-shell";

const inputClass = "w-full rounded-lg border border-[#dfe5df] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#176b50]";
const labelClass = "mb-1.5 block text-xs font-semibold text-[#526057]";

type ProfileRecord = {
  id: number;
  name: string | null;
  email: string;
  role: Role;
  branch?: string | null;
  cgpa?: number | null;
  yearOfStudy?: "FIRST" | "SECOND" | "THIRD" | "FOURTH" | null;
  skills?: string[];
  resumeFileName?: string | null;
};

type StudentDraft = {
  branch: string;
  cgpa: number;
  yearOfStudy: "FIRST" | "SECOND" | "THIRD" | "FOURTH";
  skills: string[];
};

function makeDraft(profile: ProfileRecord | null): StudentDraft {
  return {
    branch: profile?.branch ?? "",
    cgpa: profile?.cgpa ?? 0,
    yearOfStudy: profile?.yearOfStudy ?? "FIRST",
    skills: profile?.skills ? [...profile.skills] : [],
  };
}

function formatAcademicYear(value: "FIRST" | "SECOND" | "THIRD" | "FOURTH") {
  const map = {
    FIRST: "1st Year",
    SECOND: "2nd Year",
    THIRD: "3rd Year",
    FOURTH: "4th Year",
  } as const;
  return map[value];
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[#e2e7e1] bg-white p-5 md:p-6">
      <h2 className="mb-5 text-sm font-bold">{title}</h2>
      {children}
    </section>
  );
}

export function ProfileView({ role }: { role: Role }) {
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [draft, setDraft] = useState<StudentDraft>(makeDraft(null));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [resumeBusy, setResumeBusy] = useState(false);
  const [resumeError, setResumeError] = useState("");
  const [resumeSuccess, setResumeSuccess] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      setLoading(true);
      setError("");
      setSuccess("");
      try {
        const response = await fetch("/api/profile", { cache: "no-store" });
        const result = (await response.json()) as { profile?: ProfileRecord; error?: string };
        if (!response.ok || !result.profile) {
          throw new Error(result.error ?? "Unable to load profile.");
        }

        if (!cancelled) {
          const nextProfile = result.profile as ProfileRecord;
          setProfile(nextProfile);
          setDraft(makeDraft(nextProfile));
          setEditing(false);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load profile.");
          setProfile(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, [role]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (role !== "student") return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branch: draft.branch,
          cgpa: draft.cgpa,
          yearOfStudy: draft.yearOfStudy,
          skills: draft.skills,
        }),
      });

      const result = (await response.json()) as { profile?: ProfileRecord; error?: string };
      if (!response.ok || !result.profile) {
        throw new Error(result.error ?? "Unable to save profile.");
      }

      setProfile(result.profile);
      setDraft(makeDraft(result.profile));
      setEditing(false);
      setSuccess("Profile updated successfully.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save profile.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadResume(file: File | undefined) {
    setResumeError("");
    setResumeSuccess("");
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf") || (file.type && file.type !== "application/pdf")) {
      setResumeError("Choose a PDF file.");
      return;
    }
    if (file.size === 0 || file.size > 5 * 1024 * 1024) {
      setResumeError(file.size === 0 ? "Choose a non-empty PDF file." : "Resume must be 5 MB or smaller.");
      return;
    }

    const body = new FormData();
    body.set("resume", file);
    setResumeBusy(true);
    try {
      const response = await fetch("/api/profile/resume", { method: "POST", body });
      const result = await response.json() as { resumeFileName?: string; error?: string };
      if (!response.ok || !result.resumeFileName) {
        throw new Error(result.error ?? "Resume could not be uploaded.");
      }
      setProfile((current) => current ? { ...current, resumeFileName: result.resumeFileName } : current);
      setResumeSuccess("Resume uploaded successfully.");
    } catch (uploadError) {
      setResumeError(uploadError instanceof Error ? uploadError.message : "Resume could not be uploaded.");
    } finally {
      setResumeBusy(false);
    }
  }

  const title = role === "student" ? "My profile" : role === "admin" ? "Admin profile" : "Super admin profile";
  const eyebrow = role === "student" ? "Student workspace" : "Administration";

  return (
    <AppShell role={role} title={title} eyebrow={eyebrow}>
      {loading && <p className="text-sm text-[#6e786f]">Loading profile…</p>}
      {error && <p role="alert" className="mb-5 rounded-lg border border-[#f1d1ce] bg-[#fff8f7] px-4 py-3 text-sm text-[#b94b48]">{error}</p>}
      {success && <p role="status" className="mb-5 rounded-lg border border-[#b9d6c4] bg-[#f1f8f3] px-4 py-3 text-sm text-[#176b50]">{success}</p>}

      {!loading && profile && (
        <form onSubmit={saveProfile} className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-[#6e786f]">Keep account information consistent and review your role-specific details.</p>
            </div>
            {role === "student" && !editing && (
              <button type="button" onClick={() => setEditing(true)} className="rounded-lg bg-[#176b50] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#12563f]">
                Edit profile
              </button>
            )}
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Section title="Account details">
              <div className="space-y-4">
                <div>
                  <div className={labelClass}>Full name</div>
                  <p className="min-h-10 rounded-lg bg-[#fafbf9] px-3 py-2.5 text-sm text-[#17211b]">{profile.name ?? "Not provided"}</p>
                </div>
                <div>
                  <div className={labelClass}>Email address</div>
                  <p className="min-h-10 rounded-lg bg-[#fafbf9] px-3 py-2.5 text-sm text-[#17211b]">{profile.email}</p>
                </div>
              </div>
            </Section>

            {role === "student" && (
              <Section title="Academic information">
                {editing ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className={labelClass} htmlFor="branch">Branch</label>
                      <input id="branch" className={inputClass} value={draft.branch} onChange={(event) => setDraft((current) => ({ ...current, branch: event.target.value }))} />
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="cgpa">CGPA (0–10)</label>
                      <input id="cgpa" type="number" min="0" max="10" step="0.01" className={inputClass} value={draft.cgpa} onChange={(event) => setDraft((current) => ({ ...current, cgpa: Number(event.target.value) }))} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelClass} htmlFor="yearOfStudy">Academic year</label>
                      <select id="yearOfStudy" className={inputClass} value={draft.yearOfStudy} onChange={(event) => setDraft((current) => ({ ...current, yearOfStudy: event.target.value as StudentDraft["yearOfStudy"] }))}>
                        {(["FIRST", "SECOND", "THIRD", "FOURTH"] as const).map((year) => (
                          <option key={year} value={year}>{formatAcademicYear(year)}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <div className={labelClass}>Branch</div>
                      <p className="min-h-10 rounded-lg bg-[#fafbf9] px-3 py-2.5 text-sm text-[#17211b]">{profile.branch ?? "Not provided"}</p>
                    </div>
                    <div>
                      <div className={labelClass}>CGPA</div>
                      <p className="min-h-10 rounded-lg bg-[#fafbf9] px-3 py-2.5 text-sm text-[#17211b]">{profile.cgpa !== null && profile.cgpa !== undefined ? `${profile.cgpa.toFixed(1)} / 10` : "Not provided"}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <div className={labelClass}>Academic year</div>
                      <p className="min-h-10 rounded-lg bg-[#fafbf9] px-3 py-2.5 text-sm text-[#17211b]">{profile.yearOfStudy ? formatAcademicYear(profile.yearOfStudy) : "Not provided"}</p>
                    </div>
                  </div>
                )}
              </Section>
            )}
          </div>

          {role === "student" && (
            <Section title="Skills">
              {editing ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {draft.skills.length === 0 && <p className="text-sm text-[#6e786f]">No skills added yet.</p>}
                    {draft.skills.map((skill, index) => (
                      <div key={`${skill}-${index}`} className="flex items-center gap-1 rounded-lg border border-[#dce5de] bg-[#f7faf7] p-1">
                        <input
                          aria-label={`Skill ${index + 1}`}
                          className="w-28 bg-transparent px-2 py-1 text-xs outline-none"
                          value={skill}
                          onChange={(event) => setDraft((current) => ({
                            ...current,
                            skills: current.skills.map((currentSkill, currentIndex) => currentIndex === index ? event.target.value : currentSkill),
                          }))}
                        />
                        <button
                          type="button"
                          aria-label={`Remove ${skill || `skill ${index + 1}`}`}
                          onClick={() => setDraft((current) => ({ ...current, skills: current.skills.filter((_, currentIndex) => currentIndex !== index) }))}
                          className="rounded px-2 py-1 text-xs font-semibold text-[#b94b48] hover:bg-[#fcedeb]"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      className={inputClass}
                      placeholder="Add a skill"
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") return;
                        event.preventDefault();
                        const value = (event.currentTarget as HTMLInputElement).value.trim();
                        if (!value) return;
                        setDraft((current) => ({ ...current, skills: [...current.skills, value] }));
                        (event.currentTarget as HTMLInputElement).value = "";
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(!profile.skills || profile.skills.length === 0) && <p className="text-sm text-[#6e786f]">No skills listed yet.</p>}
                  {profile.skills?.map((skill) => (
                    <span key={skill} className="rounded-lg border border-[#dce5de] bg-[#f7faf7] px-3 py-2 text-xs font-medium text-[#405147]">{skill}</span>
                  ))}
                </div>
              )}
            </Section>
          )}

          {role === "student" && editing && (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button type="submit" className="rounded-lg bg-[#176b50] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#12563f]" disabled={saving}>
                {saving ? "Saving…" : "Save profile"}
              </button>
              <button type="button" onClick={() => { setDraft(makeDraft(profile)); setEditing(false); setError(""); setSuccess(""); }} className="rounded-lg border border-[#dfe5df] bg-white px-4 py-2.5 text-sm font-semibold text-[#526057]">
                Cancel
              </button>
            </div>
          )}

          {role === "student" && (
            <Section title="Resume">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[#344238]">{profile.resumeFileName ?? "No resume uploaded"}</p>
                  <p className="mt-1 text-xs text-[#7b857c]">PDF file · up to 5 MB</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {profile.resumeFileName && (
                    <a href="/api/profile/resume" className="rounded-lg border border-[#dfe5df] bg-white px-4 py-2.5 text-sm font-semibold text-[#176b50] hover:bg-[#f7faf7]">
                      Download resume
                    </a>
                  )}
                  <label className={`cursor-pointer rounded-lg bg-[#176b50] px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-[#12563f] ${resumeBusy ? "pointer-events-none opacity-60" : ""}`}>
                    {resumeBusy ? "Uploading…" : profile.resumeFileName ? "Replace resume" : "Upload resume"}
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      className="sr-only"
                      aria-label={profile.resumeFileName ? "Replace resume PDF" : "Upload resume PDF"}
                      disabled={resumeBusy}
                      onChange={(event) => {
                        void uploadResume(event.currentTarget.files?.[0]);
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                </div>
              </div>
              {resumeError && <p role="alert" className="mt-3 text-xs text-[#b94b48]">{resumeError}</p>}
              {resumeSuccess && <p role="status" className="mt-3 text-xs text-[#176b50]">{resumeSuccess}</p>}
            </Section>
          )}
        </form>
      )}
    </AppShell>
  );
}
