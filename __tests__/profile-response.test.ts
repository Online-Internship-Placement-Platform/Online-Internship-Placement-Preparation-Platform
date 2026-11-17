import { describe, expect, it } from "vitest";
import { studentProfileResponse } from "@/modules/students/profile-response";

describe("student profile response projection", () => {
  it("returns common student fields with only valid string skills", () => {
    expect(studentProfileResponse({
      id: 7, name: null, email: "student@example.test",
      studentProfile: { branch: "CS", cgpa: 8.1, yearOfStudy: "THIRD", skills: ["SQL", 2, "React"] },
    })).toEqual({ id: 7, name: null, email: "student@example.test", branch: "CS", cgpa: 8.1, yearOfStudy: "THIRD", skills: ["SQL", "React"] });
  });

  it("returns null without a student profile and an empty list for non-array skills", () => {
    expect(studentProfileResponse({ id: 3, name: "Admin", email: "admin@example.test", studentProfile: null })).toBeNull();
    expect(studentProfileResponse({
      id: 8, name: "Student", email: "student@example.test",
      studentProfile: { branch: "IT", cgpa: 7, yearOfStudy: "SECOND", skills: "invalid" },
    })?.skills).toEqual([]);
  });
});
