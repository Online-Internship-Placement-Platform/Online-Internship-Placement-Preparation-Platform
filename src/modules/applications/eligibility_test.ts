import assert from "node:assert/strict";
import {
  checkEligibility,
  getEligibilityChecks,
  type InternshipEligibilityRequirements,
  type StudentEligibilityProfile,
} from "./eligibility";

const eligibleStudent: StudentEligibilityProfile = {
  cgpa: 8.2,
  branch: " Computer Science ",
  skills: ["TypeScript", " React ", "SQL"],
};

const eligibleInternship: InternshipEligibilityRequirements = {
  minCgpa: 7.5,
  eligibleBranches: ["Information Technology", "computer science"],
  requiredSkills: ["react", " SQL "],
  applicationDeadline: "2030-06-30",
};

const now = new Date("2030-06-01T12:00:00.000Z");

const tests: Array<{ name: string; run: () => void }> = [
  {
    name: "accepts an eligible student and normalizes branch and skill names",
    run: () => assert.deepEqual(checkEligibility(eligibleStudent, eligibleInternship, now), { eligible: true, reasons: [] }),
  },
  {
    name: "reports CGPA below the minimum",
    run: () => {
      const result = checkEligibility({ ...eligibleStudent, cgpa: 7 }, eligibleInternship, now);
      assert.equal(result.eligible, false);
      assert.deepEqual(result.reasons, ["Student CGPA is below the internship minimum."]);
    },
  },
  {
    name: "reports an ineligible branch",
    run: () => {
      const result = checkEligibility({ ...eligibleStudent, branch: "Mechanical Engineering" }, eligibleInternship, now);
      assert.deepEqual(result.reasons, ["Student branch is not eligible for this internship."]);
    },
  },
  {
    name: "accepts any branch when the internship allows all branches",
    run: () => assert.deepEqual(
      checkEligibility(eligibleStudent, { ...eligibleInternship, eligibleBranches: ["Any branch"] }, now),
      { eligible: true, reasons: [] },
    ),
  },
  {
    name: "reports each missing required skill",
    run: () => {
      const result = checkEligibility({ ...eligibleStudent, skills: ["React"] }, eligibleInternship, now);
      assert.deepEqual(result.reasons, ["Student is missing required skill: sql."]);
    },
  },
  {
    name: "returns individual criterion results for the eligibility UI",
    run: () => {
      const checks = getEligibilityChecks(eligibleStudent, eligibleInternship, now);
      assert.equal(checks.find((check) => check.criterion === "CGPA")?.eligible, true);
      assert.equal(checks.find((check) => check.criterion === "Branch")?.eligible, true);
      assert.equal(checks.find((check) => check.criterion === "react")?.eligible, true);
      assert.deepEqual(checks.find((check) => check.criterion === "sql")?.reasons, []);
    },
  },
  {
    name: "does not treat missing profile fields as eligible",
    run: () => {
      const result = checkEligibility(
        { cgpa: Number.NaN, branch: "", skills: [] },
        eligibleInternship,
        now,
      );
      assert.equal(result.eligible, false);
      assert.ok(result.reasons.includes("Student CGPA must be a finite number from 0 to 10."));
      assert.ok(result.reasons.includes("Student branch is required."));
      assert.ok(result.reasons.includes("Student is missing required skill: react."));
    },
  },
  {
    name: "reports an expired deadline",
    run: () => {
      const result = checkEligibility(eligibleStudent, { ...eligibleInternship, applicationDeadline: "2030-05-31" }, now);
      assert.deepEqual(result.reasons, ["Application deadline has passed."]);
    },
  },
  {
    name: "collects multiple simultaneous failures",
    run: () => {
      const result = checkEligibility(
        { cgpa: 6, branch: "Arts", skills: [] },
        { ...eligibleInternship, applicationDeadline: "2030-05-31" },
        now,
      );
      assert.deepEqual(result.reasons, [
        "Student CGPA is below the internship minimum.",
        "Student branch is not eligible for this internship.",
        "Student is missing required skill: react.",
        "Student is missing required skill: sql.",
        "Application deadline has passed.",
      ]);
    },
  },
  {
    name: "reports invalid student and minimum CGPA values and an invalid deadline",
    run: () => {
      const result = checkEligibility(
        { ...eligibleStudent, cgpa: Number.NaN },
        { ...eligibleInternship, minCgpa: 11, applicationDeadline: "not-a-date" },
        now,
      );
      assert.deepEqual(result.reasons, [
        "Student CGPA must be a finite number from 0 to 10.",
        "Internship minimum CGPA must be a finite number from 0 to 10.",
        "Application deadline is invalid.",
      ]);
    },
  },
  {
    name: "treats the exact deadline instant as eligible",
    run: () => {
      const deadline = new Date("2030-06-30T12:00:00.000Z");
      assert.equal(
        checkEligibility(eligibleStudent, { ...eligibleInternship, applicationDeadline: deadline }, deadline).eligible,
        true,
      );
      assert.deepEqual(
        checkEligibility(
          eligibleStudent,
          { ...eligibleInternship, applicationDeadline: deadline },
          new Date(deadline.getTime() + 1),
        ).reasons,
        ["Application deadline has passed."],
      );
    },
  },
  {
    name: "rejects an impossible date-only deadline and an invalid current time",
    run: () => {
      const result = checkEligibility(
        eligibleStudent,
        { ...eligibleInternship, applicationDeadline: "2030-02-30" },
        new Date(Number.NaN),
      );
      assert.deepEqual(result.reasons, ["Application deadline is invalid.", "Current date/time is invalid."]);
    },
  },
];

for (const test of tests) {
  test.run();
  console.log(`✓ ${test.name}`);
}

console.log(`\n${tests.length} eligibility tests passed.`);
