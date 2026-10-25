import assert from "node:assert/strict";
import { validateStudentProfile } from "./profile-validation";

const completeProfile = { name: "A student", branch: "Computer Science", cgpa: 8.5, year: 3 };

for (const year of [1, 2, 3, 4]) {
  assert.equal(validateStudentProfile({ ...completeProfile, year }, "create"), null);
}

for (const year of [0, 5, 2.5, "3", null, undefined]) {
  assert.equal(validateStudentProfile({ ...completeProfile, year }, "create"), "Academic year must be an integer from 1 to 4.");
}

assert.equal(validateStudentProfile({ ...completeProfile, year: undefined }, "create"), "Academic year must be an integer from 1 to 4.");
for (const field of ["name", "branch", "cgpa", "year"] as const) {
  const incompleteProfile = { ...completeProfile };
  delete incompleteProfile[field];
  assert.equal(validateStudentProfile(incompleteProfile, "create"), `${field[0].toUpperCase()}${field.slice(1)} is required.`);
}
assert.equal(validateStudentProfile({ name: "A student", branch: "Computer Science", cgpa: 8.5, year: 3.2 }, "update"), "Academic year must be an integer from 1 to 4.");
assert.equal(validateStudentProfile({ cgpa: "8.5" }, "update"), "CGPA must be a number from 0 to 10.");
assert.equal(validateStudentProfile({ name: "  " }, "update"), "Name must be a non-empty string of at most 100 characters.");
assert.equal(validateStudentProfile({ year: 4 }, "update"), null);

console.log("Student profile validation checks passed.");
