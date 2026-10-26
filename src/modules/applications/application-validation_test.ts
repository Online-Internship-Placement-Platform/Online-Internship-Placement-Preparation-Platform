import assert from "node:assert/strict";
import { isApplicationAdminRole, isApplicationStudentRole } from "./application-authorization";
import { parseAdminApplicationFilters, parseApplicationId, parseApplicationStatus } from "./application-validation";

assert.equal(parseApplicationId("12"), 12);
assert.equal(parseApplicationId("0"), null);
assert.equal(parseApplicationId("1.5"), null);
assert.equal(parseApplicationId("9007199254740992"), null);

assert.equal(parseApplicationStatus("Shortlisted"), "Shortlisted");
assert.equal(parseApplicationStatus(" Unknown "), null);
assert.equal(parseApplicationStatus(3), null);

const filters = parseAdminApplicationFilters(new URLSearchParams("internshipId=int-001&studentName=Sam&status=Pending"));
assert.deepEqual(filters, {
  filters: { internshipId: "int-001", studentName: "Sam", status: "Pending" },
});
assert.deepEqual(parseAdminApplicationFilters(new URLSearchParams("status=invalid")), {
  error: "Choose a valid application status.",
});
assert.deepEqual(parseAdminApplicationFilters(new URLSearchParams(`studentName=${"a".repeat(101)}`)), {
  error: "Student name search must be 100 characters or fewer.",
});

assert.equal(isApplicationStudentRole("student"), true);
assert.equal(isApplicationStudentRole("admin"), false);
assert.equal(isApplicationAdminRole("admin"), true);
assert.equal(isApplicationAdminRole("super-admin"), true);
assert.equal(isApplicationAdminRole("student"), false);

console.log("Application validation and authorization checks passed.");
