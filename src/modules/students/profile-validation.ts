const academicYearValues = [1, 2, 3, 4] as const;

type ValidationMode = "create" | "update";

export function validateStudentProfile(
  values: Record<string, unknown>,
  mode: ValidationMode,
): string | null {
  const fields = ["name", "branch", "cgpa", "year"] as const;

  for (const field of fields) {
    const supplied = Object.hasOwn(values, field);
    if (mode === "create" && !supplied) return `${field[0].toUpperCase()}${field.slice(1)} is required.`;
    if (!supplied) continue;

    const value = values[field];
    if (field === "name" || field === "branch") {
      if (typeof value !== "string" || value.trim().length === 0 || value.trim().length > 100) {
        return `${field[0].toUpperCase()}${field.slice(1)} must be a non-empty string of at most 100 characters.`;
      }
    } else if (field === "cgpa") {
      if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 10) {
        return "CGPA must be a number from 0 to 10.";
      }
    } else if (typeof value !== "number" || !Number.isInteger(value) || !academicYearValues.includes(value as (typeof academicYearValues)[number])) {
      return "Academic year must be an integer from 1 to 4.";
    }
  }

  return null;
}
