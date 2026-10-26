import assert from "node:assert/strict";
import { studentProfileResponse } from "./profile-response";

const response = studentProfileResponse({
  id: 42,
  name: "Student Example",
  email: "student@example.test",
  studentProfile: {
    branch: "Computer Science",
    cgpa: 8.4,
    yearOfStudy: "THIRD",
    skills: ["TypeScript", "SQL", 4],
  },
});
assert.deepEqual(response, {
  id: 42,
  name: "Student Example",
  email: "student@example.test",
  branch: "Computer Science",
  cgpa: 8.4,
  yearOfStudy: "THIRD",
  skills: ["TypeScript", "SQL"],
});
assert.equal(studentProfileResponse({ id: 43, name: "Admin", email: "admin@example.test", studentProfile: null }), null);
assert.equal(studentProfileResponse({
  id: 44,
  name: null,
  email: "student@example.test",
  studentProfile: { branch: "Computer Science", cgpa: 8.4, yearOfStudy: "THIRD", skills: [] },
})?.name, null);

console.log("Student profile response checks passed.");
