export interface StudentEligibilityProfile {
  cgpa: number;
  branch: string;
  skills: readonly string[];
}

export interface InternshipEligibilityRequirements {
  minCgpa: number;
  eligibleBranches: readonly string[];
  requiredSkills: readonly string[];
  applicationDeadline: string | Date;
}

export interface EligibilityResult {
  eligible: boolean;
  reasons: string[];
}

const CGPA_MIN = 0;
const CGPA_MAX = 10;

function isValidCgpa(value: number): boolean {
  return Number.isFinite(value) && value >= CGPA_MIN && value <= CGPA_MAX;
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeStringList(values: unknown): string[] | null {
  if (!Array.isArray(values) || !values.every((value) => typeof value === "string" && value.trim().length > 0)) {
    return null;
  }

  return values.map(normalizeName);
}

function parseDeadline(value: string | Date): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  const deadlineValue = value.trim();

  // Date-only deadlines remain valid through the end of that UTC calendar day.
  if (/^\d{4}-\d{2}-\d{2}$/.test(deadlineValue)) {
    const deadline = new Date(`${deadlineValue}T23:59:59.999Z`);
    return deadline.toISOString().slice(0, 10) === deadlineValue ? deadline : null;
  }

  const deadline = new Date(deadlineValue);
  return Number.isNaN(deadline.getTime()) ? null : deadline;
}

/** Checks a student's profile against an internship's eligibility requirements. */
export function checkEligibility(
  student: StudentEligibilityProfile,
  internship: InternshipEligibilityRequirements,
  now: Date = new Date(),
): EligibilityResult {
  const reasons: string[] = [];

  const studentCgpaIsValid = isValidCgpa(student.cgpa);
  if (!studentCgpaIsValid) {
    reasons.push("Student CGPA must be a finite number from 0 to 10.");
  }

  const minimumCgpaIsValid = isValidCgpa(internship.minCgpa);
  if (!minimumCgpaIsValid) {
    reasons.push("Internship minimum CGPA must be a finite number from 0 to 10.");
  } else if (studentCgpaIsValid && student.cgpa < internship.minCgpa) {
    reasons.push("Student CGPA is below the internship minimum.");
  }

  const studentBranch = typeof student.branch === "string" ? normalizeName(student.branch) : "";
  const eligibleBranches = normalizeStringList(internship.eligibleBranches);

  if (studentBranch.length === 0) {
    reasons.push("Student branch is required.");
  }

  if (eligibleBranches === null || eligibleBranches.length === 0) {
    reasons.push("Internship must list at least one eligible branch.");
  } else if (studentBranch.length > 0 && !eligibleBranches.includes(studentBranch)) {
    reasons.push("Student branch is not eligible for this internship.");
  }

  const studentSkills = normalizeStringList(student.skills);
  if (studentSkills === null) {
    reasons.push("Student skills must be a valid list of skill names.");
  }

  const requiredSkills = normalizeStringList(internship.requiredSkills);
  if (requiredSkills === null) {
    reasons.push("Internship required skills must be a valid list of skill names.");
  } else if (studentSkills !== null) {
    for (const skill of requiredSkills) {
      if (!studentSkills.includes(skill)) {
        reasons.push(`Student is missing required skill: ${skill}.`);
      }
    }
  }

  const deadline = parseDeadline(internship.applicationDeadline);
  if (deadline === null) {
    reasons.push("Application deadline is invalid.");
  }

  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    reasons.push("Current date/time is invalid.");
  } else if (deadline !== null && now.getTime() > deadline.getTime()) {
    reasons.push("Application deadline has passed.");
  }

  return {
    eligible: reasons.length === 0,
    reasons,
  };
}
