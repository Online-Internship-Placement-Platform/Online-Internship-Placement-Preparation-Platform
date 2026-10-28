import type { Student } from "@/lib/placement-data";

export type StudentSearchCriteria = {
  name?: string;
  email?: string;
  branch?: string;
  minCgpa?: number | string;
  maxCgpa?: number | string;
  yearOfStudy?: number | string;
  skills?: readonly string[];
};

function parseBound(value: number | string | undefined): number | undefined {
  if (value === undefined || value === "" || (typeof value === "string" && value.trim() === "")) return undefined;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalize(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

/** Builds filter options from the skills students actually have, including user-entered skills. */
export function getStudentSkillOptions(students: readonly Student[]): string[] {
  const uniqueSkills = new Map<string, string>();
  for (const student of students) {
    for (const rawSkill of Array.isArray(student.skills) ? student.skills : []) {
      const skill = rawSkill.trim();
      const normalized = skill.toLowerCase();
      if (normalized && !uniqueSkills.has(normalized)) uniqueSkills.set(normalized, skill);
    }
  }
  return [...uniqueSkills.values()].sort((first, second) => first.localeCompare(second));
}

/** Returns a bounded set of skill choices so large catalogs stay quick to browse. */
export function searchSkillOptions(options: readonly string[], query: string, limit = 50): string[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery || !Number.isInteger(limit) || limit < 1) return [];
  return options
    .filter((skill) => skill.toLowerCase().includes(normalizedQuery))
    .slice(0, limit);
}

type SearchableStudent = Pick<Student, "name" | "email" | "branch" | "cgpa" | "yearOfStudy" | "skills">;

export function filterStudents<T extends SearchableStudent>(students: readonly T[], criteria: StudentSearchCriteria): T[] {
  const name = normalize(criteria.name);
  const email = normalize(criteria.email);
  const branch = criteria.branch?.trim();
  const minCgpa = parseBound(criteria.minCgpa);
  const maxCgpa = parseBound(criteria.maxCgpa);
  const year = criteria.yearOfStudy === undefined || criteria.yearOfStudy === "" || criteria.yearOfStudy === "All years"
    ? undefined
    : Number(criteria.yearOfStudy);
  const requiredSkills = (criteria.skills ?? []).map((skill) => skill.trim().toLowerCase()).filter(Boolean);

  return students.filter((student) => {
    if (name && !student.name.toLowerCase().includes(name)) return false;
    if (email && !student.email.toLowerCase().includes(email)) return false;
    if (branch && branch !== "All branches" && student.branch !== branch) return false;
    if (minCgpa !== undefined && student.cgpa < minCgpa) return false;
    if (maxCgpa !== undefined && student.cgpa > maxCgpa) return false;
    if (year !== undefined && Number.isFinite(year) && student.yearOfStudy !== year) return false;
    const skills = Array.isArray(student.skills) ? student.skills.map((skill) => skill.trim().toLowerCase()) : [];
    if (!requiredSkills.every((skill) => skills.includes(skill))) return false;
    return true;
  });
}
