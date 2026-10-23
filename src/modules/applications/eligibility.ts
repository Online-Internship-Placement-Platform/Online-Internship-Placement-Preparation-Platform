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

export interface EligibilityCheck {
  criterion: string;
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
  const checks = getEligibilityChecks(student, internship, now);
  const reasons = checks.flatMap((check) => check.reasons);
  return { eligible: checks.every((check) => check.eligible), reasons };
}

/** Returns criterion-level results for displaying the same checks used by submission. */
export function getEligibilityChecks(
  student: StudentEligibilityProfile,
  internship: InternshipEligibilityRequirements,
  now: Date = new Date(),
): EligibilityCheck[] {
  const checks: EligibilityCheck[] = [];

  const studentCgpaIsValid = isValidCgpa(student.cgpa);
  const minimumCgpaIsValid = isValidCgpa(internship.minCgpa);
  const cgpaReasons: string[] = [];
  if (!studentCgpaIsValid) cgpaReasons.push("Student CGPA must be a finite number from 0 to 10.");
  if (!minimumCgpaIsValid) cgpaReasons.push("Internship minimum CGPA must be a finite number from 0 to 10.");
  else if (studentCgpaIsValid && student.cgpa < internship.minCgpa) cgpaReasons.push("Student CGPA is below the internship minimum.");
  checks.push({ criterion: "CGPA", eligible: cgpaReasons.length === 0, reasons: cgpaReasons });

  const studentBranch = typeof student.branch === "string" ? normalizeName(student.branch) : "";
  const eligibleBranches = normalizeStringList(internship.eligibleBranches);
  const branchReasons: string[] = [];
  if (studentBranch.length === 0) branchReasons.push("Student branch is required.");
  if (eligibleBranches === null || eligibleBranches.length === 0) branchReasons.push("Internship must list at least one eligible branch.");
  else if (studentBranch.length > 0 && !eligibleBranches.includes("any branch") && !eligibleBranches.includes(studentBranch)) branchReasons.push("Student branch is not eligible for this internship.");
  checks.push({ criterion: "Branch", eligible: branchReasons.length === 0, reasons: branchReasons });

  const studentSkills = normalizeStringList(student.skills);
  const requiredSkills = normalizeStringList(internship.requiredSkills);
  if (studentSkills === null) {
    checks.push({ criterion: "Skills", eligible: false, reasons: ["Student skills must be a valid list of skill names."] });
  } else if (requiredSkills === null) {
    checks.push({ criterion: "Skills", eligible: false, reasons: ["Internship required skills must be a valid list of skill names."] });
  } else if (requiredSkills.length === 0) {
    checks.push({ criterion: "Skills", eligible: true, reasons: [] });
  } else {
    for (const skill of requiredSkills) {
      const eligible = studentSkills.includes(skill);
      checks.push({ criterion: skill, eligible, reasons: eligible ? [] : [`Student is missing required skill: ${skill}.`] });
    }
  }

  const deadline = parseDeadline(internship.applicationDeadline);
  const deadlineReasons: string[] = [];
  if (deadline === null) deadlineReasons.push("Application deadline is invalid.");
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    deadlineReasons.push("Current date/time is invalid.");
  } else if (deadline !== null && now.getTime() > deadline.getTime()) {
    deadlineReasons.push("Application deadline has passed.");
  }
  checks.push({ criterion: "Deadline", eligible: deadlineReasons.length === 0, reasons: deadlineReasons });

  return checks;
}
