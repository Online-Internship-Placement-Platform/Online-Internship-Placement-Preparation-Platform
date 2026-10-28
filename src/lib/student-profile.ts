import type { Student, StudentResume } from "@/lib/placement-data";
import { getStudentById, getStudents, replaceStudent } from "@/lib/student-store";

export type StudentProfileDraft = Pick<Student, "name" | "email" | "branch" | "cgpa" | "yearOfStudy" | "skills" | "resume">;
export type ResumeFileInput = { name: string; type: string; size: number };
export type ProfileUpdateResult =
  | { ok: true; profile: Student }
  | { ok: false; errors: Record<string, string>; profile: Student | null };

const MAX_RESUME_SIZE = 5 * 1024 * 1024;

export function addSkill(skills: readonly string[], skill: string): string[] {
  return [...skills, skill];
}

export function editSkill(skills: readonly string[], previous: string, next: string): string[] {
  return skills.map((skill) => skill.trim().toLowerCase() === previous.trim().toLowerCase() ? next : skill);
}

export function removeSkill(skills: readonly string[], skillToRemove: string): string[] {
  return skills.filter((skill) => skill.trim().toLowerCase() !== skillToRemove.trim().toLowerCase());
}

function validateResume(file: ResumeFileInput): string | null {
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return "Choose a PDF file.";
  }
  if (!Number.isFinite(file.size) || file.size < 0 || file.size > MAX_RESUME_SIZE) {
    return "Resume must be 5 MB or smaller.";
  }
  return null;
}

export function updateStudentProfile(
  id: string,
  draft: StudentProfileDraft,
  resumeFile?: ResumeFileInput,
): ProfileUpdateResult {
  const previous = getStudentById(id);
  if (!previous) return { ok: false, errors: { profile: "Student profile not found." }, profile: null };

  const errors: Record<string, string> = {};
  const name = draft.name.trim();
  const email = draft.email.trim().toLowerCase();
  const branch = draft.branch.trim();
  const skills = Array.isArray(draft.skills) ? draft.skills.map((skill) => skill.trim()) : [];

  if (!name) errors.name = "Name is required.";
  if (!email) errors.email = "Email is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email address.";
  else if (getStudents().some((student) => student.id !== id && student.email.trim().toLowerCase() === email)) {
    errors.email = "This email is already used by another student.";
  }
  if (!branch) errors.branch = "Branch is required.";
  if (!Number.isFinite(draft.cgpa) || draft.cgpa < 0 || draft.cgpa > 10) errors.cgpa = "CGPA must be between 0 and 10.";
  if (!Number.isInteger(draft.yearOfStudy) || draft.yearOfStudy < 1 || draft.yearOfStudy > 4) {
    errors.yearOfStudy = "Academic year must be from 1 to 4.";
  }
  if (skills.length === 0 || skills.some((skill) => !skill)) errors.skills = "Add at least one non-empty skill.";
  else if (new Set(skills.map((skill) => skill.toLowerCase())).size !== skills.length) {
    errors.skills = "Skills must be unique.";
  }

  if (resumeFile) {
    const resumeError = validateResume(resumeFile);
    if (resumeError) errors.resume = resumeError;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors, profile: previous };

  const resume: StudentResume | null = resumeFile
    ? { fileName: resumeFile.name.trim(), sizeBytes: resumeFile.size }
    : draft.resume ? { ...draft.resume } : null;
  const updated: Student = {
    ...previous,
    name,
    email,
    branch,
    cgpa: draft.cgpa,
    yearOfStudy: draft.yearOfStudy,
    skills,
    resume,
  };
  const saved = replaceStudent(id, updated);
  return saved ? { ok: true, profile: saved } : { ok: false, errors: { profile: "Student profile could not be saved." }, profile: previous };
}
