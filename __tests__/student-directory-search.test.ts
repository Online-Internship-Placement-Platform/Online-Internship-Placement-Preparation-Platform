import { describe, expect, it } from "vitest";
import { filterStudents, getStudentSkillOptions, searchSkillOptions, type StudentSearchCriteria } from "@/lib/student-search";
import type { Student } from "@/lib/placement-data";

const fixture: Student[] = [
  { id: "a", name: "Aarav Mehta", email: "aarav.mehta@university.edu", branch: "Computer Science", cgpa: 8.6, yearOfStudy: 3, skills: ["React", "SQL", "TypeScript"], avatar: "AM", resume: null },
  { id: "b", name: "Ishita Shah", email: "ishita.shah@university.edu", branch: "Information Technology", cgpa: 8.0, yearOfStudy: 3, skills: ["React", "SQL", "Python"], avatar: "IS", resume: null },
  { id: "c", name: "Kabir Rao", email: "kabir.rao@university.edu", branch: "Computer Science", cgpa: 7.4, yearOfStudy: 4, skills: ["Node.js", "TypeScript"], avatar: "KR", resume: null },
  { id: "d", name: "Maya Iyer", email: "maya.iyer@university.edu", branch: "Design", cgpa: 9.2, yearOfStudy: 2, skills: ["Figma", "React"], avatar: "MI", resume: null },
  { id: "e", name: "Leena Das", email: "leena.das@university.edu", branch: "Computer Science", cgpa: 8.0, yearOfStudy: 2, skills: ["React", "SQL"], avatar: "LD", resume: null },
];

function matchingIds(criteria: StudentSearchCriteria): string[] {
  return filterStudents(fixture, criteria).map((student) => student.id);
}

describe("filterStudents", () => {
  it("builds skill filter options from student-entered skills, not a fixed catalog", () => {
    const customSkill = "Quantum Sketching";
    const studentsWithCustomSkill = [{ ...fixture[0], skills: [...fixture[0].skills, customSkill] }];
    expect(getStudentSkillOptions(studentsWithCustomSkill)).toContain(customSkill);
    expect(filterStudents(studentsWithCustomSkill, { skills: [customSkill] })).toHaveLength(1);
  });

  it("deduplicates skill options case-insensitively and ignores blanks", () => {
    const studentsWithDuplicates = [
      { ...fixture[0], skills: ["React", "   "] },
      { ...fixture[1], skills: ["react", "Rust"] },
    ];
    expect(getStudentSkillOptions(studentsWithDuplicates)).toEqual(["React", "Rust"]);
  });

  it("searches skill options case-insensitively and limits the rendered matches", () => {
    const options = ["React", "React Native", "Redux", "Rust"];
    expect(searchSkillOptions(options, "REACT")).toEqual(["React", "React Native"]);
    expect(searchSkillOptions(options, "r", 2)).toEqual(["React", "React Native"]);
    expect(searchSkillOptions(options, "  ")).toEqual([]);
  });

  it("matches a name substring case-insensitively", () => {
    expect(matchingIds({ name: "AARAV" })).toEqual(["a"]);
  });

  it("returns an empty list for a name miss", () => {
    expect(matchingIds({ name: "zzz" })).toEqual([]);
  });

  it("matches an email substring", () => {
    expect(matchingIds({ email: "UNIVERSITY.EDU" })).toEqual(["a", "b", "c", "d", "e"]);
    expect(matchingIds({ email: "ishita" })).toEqual(["b"]);
  });

  it("matches branch exactly", () => {
    expect(matchingIds({ branch: "Computer Science" })).toEqual(["a", "c", "e"]);
  });

  it("uses inclusive CGPA bounds", () => {
    expect(matchingIds({ minCgpa: 8, maxCgpa: 8.6 })).toEqual(["a", "b", "e"]);
  });

  it("requires every selected skill with case-insensitive comparison", () => {
    expect(matchingIds({ skills: ["react", "SQL"] })).toEqual(["a", "b", "e"]);
  });

  it("combines name, branch, CGPA, year, and skills as AND filters", () => {
    expect(matchingIds({ name: "a", branch: "Computer Science", minCgpa: 8, maxCgpa: 9, yearOfStudy: 3, skills: ["React", "SQL"] })).toEqual(["a"]);
  });

  it("returns every record in a new array when criteria are empty", () => {
    const result = filterStudents(fixture, { name: "  ", email: "", branch: "All branches", minCgpa: "", maxCgpa: "", yearOfStudy: "All years", skills: [] });
    expect(result).toHaveLength(fixture.length);
    expect(result).not.toBe(fixture);
  });

  it("returns an empty list for an impossible filter combination", () => {
    expect(matchingIds({ branch: "Design", minCgpa: 10, skills: ["SQL"] })).toEqual([]);
  });

  it("does not mutate the source list or student records", () => {
    const before = structuredClone(fixture);
    const originalReferences = [...fixture];
    filterStudents(fixture, { name: "a", skills: ["React"] });
    expect(fixture).toEqual(before);
    expect(fixture[0]).toBe(originalReferences[0]);
  });

  it("treats a missing skills list as having no skills", () => {
    const withMissingSkills = [{ ...fixture[0], skills: undefined } as unknown as Student];
    expect(filterStudents(withMissingSkills, { skills: ["React"] })).toEqual([]);
  });
});
