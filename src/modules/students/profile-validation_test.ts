import assert from "node:assert/strict";
import { validateStudentProfile } from "./profile-validation";

const completeProfile = { name: "A student", branch: "Computer Science", cgpa: 8.5, yearOfStudy: "THIRD" };

for (const yearOfStudy of ["FIRST", "SECOND", "THIRD", "FOURTH"] as const) {
  assert.equal(validateStudentProfile({ ...completeProfile, yearOfStudy }, "create"), null);
}

for (const yearOfStudy of ["0", "FIFTH", 3, null, undefined]) {
  assert.equal(validateStudentProfile({ ...completeProfile, yearOfStudy }, "create"), "Academic year must be FIRST, SECOND, THIRD, or FOURTH.");
}

assert.equal(validateStudentProfile({ ...completeProfile, yearOfStudy: undefined }, "create"), "Academic year must be FIRST, SECOND, THIRD, or FOURTH.");
for (const field of ["name", "branch", "cgpa", "yearOfStudy"] as const) {
  const incompleteProfile = { ...completeProfile };
  delete incompleteProfile[field];
  assert.equal(validateStudentProfile(incompleteProfile, "create"), `${field[0].toUpperCase()}${field.slice(1)} is required.`);
}
assert.equal(validateStudentProfile({ name: "A student", branch: "Computer Science", cgpa: 8.5, yearOfStudy: "YEAR_3" }, "update"), "Academic year must be FIRST, SECOND, THIRD, or FOURTH.");
assert.equal(validateStudentProfile({ cgpa: "8.5" }, "update"), "CGPA must be a number from 0 to 10.");
assert.equal(validateStudentProfile({ name: "  " }, "update"), "Name must be a non-empty string of at most 100 characters.");
assert.equal(validateStudentProfile({ yearOfStudy: "FOURTH" }, "update"), null);

console.log("Student profile validation checks passed.");
