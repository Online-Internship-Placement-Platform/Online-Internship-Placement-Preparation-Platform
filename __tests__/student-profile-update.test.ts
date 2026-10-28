import { afterEach, describe, expect, it } from "vitest";
import { getStudentById, replaceStudent } from "@/lib/student-store";
import {
  addSkill,
  editSkill,
  removeSkill,
  updateStudentProfile,
  type StudentProfileDraft,
} from "@/lib/student-profile";

const originalStudent = getStudentById("stu-001")!;
const baseline: StudentProfileDraft = {
  name: originalStudent.name,
  email: originalStudent.email,
  branch: originalStudent.branch,
  cgpa: originalStudent.cgpa,
  yearOfStudy: originalStudent.yearOfStudy,
  skills: [...originalStudent.skills],
  resume: originalStudent.resume,
};

function draft(overrides: Partial<StudentProfileDraft> = {}): StudentProfileDraft {
  return { ...baseline, skills: [...baseline.skills], ...overrides };
}

afterEach(() => {
  replaceStudent("stu-001", originalStudent);
});

describe("updateStudentProfile", () => {
  it("accepts a valid personal, academic, and skills update", () => {
    const result = updateStudentProfile("stu-001", draft({
      name: "Aarav M. Mehta",
      email: "aarav.m@university.edu",
      branch: "Computer Science & Engineering",
      cgpa: 9.1,
      yearOfStudy: 4,
      skills: ["React", "TypeScript", "SQL", "Figma", "Next.js"],
    }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.profile).toMatchObject({ name: "Aarav M. Mehta", email: "aarav.m@university.edu", branch: "Computer Science & Engineering", cgpa: 9.1, yearOfStudy: 4, skills: expect.arrayContaining(["Next.js"]) });
  });

  it("rejects an empty name without changing the saved record", () => {
    const result = updateStudentProfile("stu-001", draft({ name: "  " }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.name).toBeTruthy();
    expect(getStudentById("stu-001")?.name).toBe(originalStudent.name);
  });

  it.each(["not-an-email", "missing-domain@", "@university.edu"])("rejects invalid email %s", (email) => {
    const result = updateStudentProfile("stu-001", draft({ email }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.email).toBeTruthy();
    expect(getStudentById("stu-001")?.email).toBe(originalStudent.email);
  });

  it("rejects a duplicate email without case sensitivity", () => {
    const result = updateStudentProfile("stu-001", draft({ email: " ISHITA.SHAH@UNIVERSITY.EDU " }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.email).toMatch(/already used/i);
    expect(getStudentById("stu-001")?.email).toBe(originalStudent.email);
  });

  it("allows keeping the student's own email with whitespace and casing", () => {
    const result = updateStudentProfile("stu-001", draft({ email: ` ${originalStudent.email.toUpperCase()} ` }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.profile.email).toBe(originalStudent.email);
  });

  it.each([-0.1, 10.1, Number.NaN, Number.POSITIVE_INFINITY])("rejects invalid CGPA %s", (cgpa) => {
    const result = updateStudentProfile("stu-001", draft({ cgpa }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.cgpa).toBeTruthy();
    expect(getStudentById("stu-001")?.cgpa).toBe(originalStudent.cgpa);
  });

  it.each([0, 5, 1.5])("rejects invalid academic year %s", (yearOfStudy) => {
    const result = updateStudentProfile("stu-001", draft({ yearOfStudy }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.yearOfStudy).toBeTruthy();
  });

  it("rejects a blank branch", () => {
    const result = updateStudentProfile("stu-001", draft({ branch: " " }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.branch).toBeTruthy();
  });

  it("adds, edits, and removes skills from a draft list", () => {
    const added = addSkill(baseline.skills, "Next.js");
    const edited = editSkill(added, "React", "React.js");
    const removed = removeSkill(edited, "SQL");
    expect(removed).toEqual(["React.js", "TypeScript", "Figma", "Next.js"]);
  });

  it("rejects blank or duplicate skills and leaves the saved list unchanged", () => {
    for (const skills of [[...baseline.skills, "  "], [...baseline.skills, "react"]]) {
      const result = updateStudentProfile("stu-001", draft({ skills }));
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors.skills).toBeTruthy();
      expect(getStudentById("stu-001")?.skills).toEqual(originalStudent.skills);
    }
  });

  it("applies multiple valid changes atomically", () => {
    const result = updateStudentProfile("stu-001", draft({ name: "Aarav Mehta Updated", cgpa: 9.4, skills: [...baseline.skills, "Next.js"] }));
    expect(result.ok).toBe(true);
    expect(getStudentById("stu-001")).toMatchObject({ name: "Aarav Mehta Updated", cgpa: 9.4, skills: expect.arrayContaining(["Next.js"]) });
  });

  it("rejects a multi-field update atomically and returns field errors", () => {
    const result = updateStudentProfile("stu-001", draft({ name: "Aarav Changed", cgpa: 11 }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.cgpa).toBeTruthy();
      expect(result.profile).toMatchObject({ name: originalStudent.name, cgpa: originalStudent.cgpa });
    }
    expect(getStudentById("stu-001")).toMatchObject({ name: originalStudent.name, cgpa: originalStudent.cgpa });
  });

  it("validates optional PDF resume type and size", () => {
    const invalidType = updateStudentProfile("stu-001", draft(), { name: "portfolio.docx", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: 1024 });
    expect(invalidType.ok).toBe(false);
    const tooLarge = updateStudentProfile("stu-001", draft(), { name: "portfolio.pdf", type: "application/pdf", size: 5 * 1024 * 1024 + 1 });
    expect(tooLarge.ok).toBe(false);
    const valid = updateStudentProfile("stu-001", draft(), { name: "portfolio.pdf", type: "application/pdf", size: 1024 });
    expect(valid.ok).toBe(true);
  });
});
