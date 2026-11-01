export const INTERNSHIP_DOMAINS = [
  "Software Development",
  "Data & Analytics",
  "Design",
  "Business",
  "Other",
] as const;

export type InternshipInput = {
  company: string;
  role: string;
  domain: (typeof INTERNSHIP_DOMAINS)[number];
  stipendPerMonth: number;
  type: "remote" | "hybrid" | "on-site";
  location: string | null;
  description: string;
  applicationDeadline: string;
  minCgpa: number;
  eligibleBranches: string[];
  requiredSkills: string[];
  published: boolean;
  acceptingApplications: boolean;
};

function parseTextList(value: unknown): string[] | null {
  if (typeof value !== "string") return null;
  const entries = value.split(/[\n,;]/).map((entry) => entry.trim()).filter(Boolean);
  if (entries.length > 50 || entries.some((entry) => entry.length > 100)) return null;
  return [...new Map(entries.map((entry) => [entry.toLocaleLowerCase(), entry])).values()];
}

export function parseInternshipInput(value: unknown):
  | { ok: true; data: InternshipInput }
  | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Provide internship details." };
  }
  const input = value as Record<string, unknown>;
  const company = typeof input.company === "string" ? input.company.trim() : "";
  const role = typeof input.role === "string" ? input.role.trim() : "";
  if (!company || company.length > 191) return { ok: false, error: "Company is required and must be 191 characters or fewer." };
  if (!role || role.length > 191) return { ok: false, error: "Role is required and must be 191 characters or fewer." };
  if (typeof input.domain !== "string" || !INTERNSHIP_DOMAINS.includes(input.domain as InternshipInput["domain"])) {
    return { ok: false, error: "Choose a valid internship domain." };
  }
  const stipendPerMonth = typeof input.stipendPerMonth === "number" ? input.stipendPerMonth : Number(input.stipendPerMonth);
  if (!Number.isFinite(stipendPerMonth) || stipendPerMonth < 0 || stipendPerMonth > 1_000_000_000) {
    return { ok: false, error: "Monthly stipend must be a non-negative amount." };
  }
  if (typeof input.type !== "string" || !["remote", "hybrid", "on-site"].includes(input.type)) {
    return { ok: false, error: "Choose remote, hybrid, or on-site as the internship type." };
  }
  const location = typeof input.location === "string" ? input.location.trim() : "";
  if (input.type !== "remote" && (!location || location.length > 191)) {
    return { ok: false, error: "Location is required for hybrid and on-site internships and must be 191 characters or fewer." };
  }
  const description = typeof input.description === "string" ? input.description.trim() : "";
  if (!description || description.length > 20_000) return { ok: false, error: "Description is required and must be 20,000 characters or fewer." };
  if (typeof input.applicationDeadline !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(input.applicationDeadline)) {
    return { ok: false, error: "Choose a valid application deadline." };
  }
  const deadline = new Date(`${input.applicationDeadline}T00:00:00.000Z`);
  if (Number.isNaN(deadline.getTime()) || deadline.toISOString().slice(0, 10) !== input.applicationDeadline) {
    return { ok: false, error: "Choose a valid application deadline." };
  }
  const minCgpa = typeof input.minCgpa === "number" ? input.minCgpa : Number(input.minCgpa);
  if (!Number.isFinite(minCgpa) || minCgpa < 0 || minCgpa > 10) return { ok: false, error: "Minimum CGPA must be from 0 to 10." };
  const eligibleBranches = parseTextList(input.eligibleBranches);
  if (!eligibleBranches || eligibleBranches.length === 0) return { ok: false, error: "Enter at least one eligible branch (or Any branch)." };
  const requiredSkills = parseTextList(input.requiredSkills);
  if (!requiredSkills) return { ok: false, error: "Enter valid required skills." };
  if (typeof input.published !== "boolean" || typeof input.acceptingApplications !== "boolean") {
    return { ok: false, error: "Set publication and application status explicitly." };
  }
  return {
    ok: true,
    data: {
      company, role, domain: input.domain as InternshipInput["domain"],
      stipendPerMonth, type: input.type as InternshipInput["type"],
      location: input.type === "remote" ? null : location,
      description,
      applicationDeadline: input.applicationDeadline,
      minCgpa, eligibleBranches, requiredSkills,
      published: input.published,
      acceptingApplications: input.acceptingApplications,
    },
  };
}
