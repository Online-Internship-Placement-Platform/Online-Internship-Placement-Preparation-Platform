import assert from "node:assert/strict";
import {
  checkEligibility,
  evaluateStudentEligibility,
  getEligibilityChecks,
  isInternshipOpenForApplications,
  type InternshipEligibilityRequirements,
  type StudentEligibilityProfile,
} from "./eligibility";

const eligibleStudent: StudentEligibilityProfile = {
  cgpa: 8.2,
  branch: " Computer Science ",
};

const eligibleInternship: InternshipEligibilityRequirements = {
  minCgpa: 7.5,
  eligibleBranches: ["Information Technology", "computer science"],
  applicationDeadline: "2030-06-30",
};

const now = new Date("2030-06-01T12:00:00.000Z");

const tests: Array<{ name: string; run: () => void }> = [
  {
    name: "reports availability as open before the deadline",
    run: () => assert.equal(
      isInternshipOpenForApplications(true, true, "2030-06-30", new Date("2030-06-30T12:00:00.000Z")),
      true,
    ),
  },
  {
    name: "reports availability as open at the deadline boundary",
    run: () => assert.equal(
      isInternshipOpenForApplications(true, true, new Date("2030-06-30T12:00:00.000Z"), new Date("2030-06-30T12:00:00.000Z")),
      true,
    ),
  },
  {
    name: "reports availability as closed after the deadline",
    run: () => assert.equal(
      isInternshipOpenForApplications(true, true, "2030-06-30", new Date("2030-07-01T00:00:00.000Z")),
      false,
    ),
  },
  {
    name: "reports availability as closed for invalid deadlines",
    run: () => assert.equal(isInternshipOpenForApplications(true, true, "2030-02-30", now), false),
  },
  {
    name: "accepts an eligible student using branch and CGPA",
    run: () => assert.deepEqual(checkEligibility(eligibleStudent, eligibleInternship, now), { eligible: true, status: "eligible", reasons: [] }),
  },
  {
    name: "reports CGPA below the minimum",
    run: () => {
      const result = checkEligibility({ ...eligibleStudent, cgpa: 7 }, eligibleInternship, now);
      assert.equal(result.eligible, false);
      assert.equal(result.status, "ineligible");
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
      { eligible: true, status: "eligible", reasons: [] },
    ),
  },
  {
    name: "does not use student or employer skills as eligibility criteria",
    run: () => {
      const studentWithNoMatchingSkills = { ...eligibleStudent, skills: [] };
      const internshipWithSkillRequirements = { ...eligibleInternship, requiredSkills: ["Rust", "Go"] };
      const result = checkEligibility(studentWithNoMatchingSkills, internshipWithSkillRequirements, now);
      assert.deepEqual(result, { eligible: true, status: "eligible", reasons: [] });
      assert.deepEqual(getEligibilityChecks(studentWithNoMatchingSkills, internshipWithSkillRequirements, now).map((check) => check.criterion), ["CGPA", "Branch", "Deadline"]);
    },
  },
  {
    name: "returns CGPA, branch, and deadline results for the eligibility UI",
    run: () => {
      const checks = getEligibilityChecks(eligibleStudent, eligibleInternship, now);
      assert.equal(checks.find((check) => check.criterion === "CGPA")?.eligible, true);
      assert.equal(checks.find((check) => check.criterion === "Branch")?.eligible, true);
      assert.equal(checks.find((check) => check.criterion === "Deadline")?.eligible, true);
      assert.equal(checks.length, 3);
    },
  },
  {
    name: "does not treat missing profile fields as eligible",
    run: () => {
      const result = checkEligibility(
        { cgpa: Number.NaN, branch: "" },
        eligibleInternship,
        now,
      );
      assert.equal(result.eligible, false);
      assert.equal(result.status, "undetermined");
      assert.ok(result.reasons.includes("Student CGPA must be a finite number from 0 to 10."));
      assert.ok(result.reasons.includes("Student branch is required."));
    },
  },
  {
    name: "treats a genuinely missing profile as undetermined",
    run: () => assert.deepEqual(
      evaluateStudentEligibility(null, eligibleInternship, now).eligibility,
      { eligible: false, status: "undetermined", reasons: ["Your student profile could not be retrieved."] },
    ),
  },
  {
    name: "uses each internship's own CGPA requirement without checking skills",
    run: () => {
      const stricter = { ...eligibleInternship, minCgpa: 8.5, requiredSkills: ["React", "Python"] };
      const studentWithoutMatchingSkills = { ...eligibleStudent, skills: [] };
      const result = evaluateStudentEligibility(studentWithoutMatchingSkills, stricter, now).eligibility;
      assert.equal(result.status, "ineligible");
      assert.ok(result.reasons.includes("Student CGPA is below the internship minimum."));
      assert.equal(result.reasons.some((reason) => reason.includes("skill")), false);
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
        { cgpa: 6, branch: "Arts" },
        { ...eligibleInternship, applicationDeadline: "2030-05-31" },
        now,
      );
      assert.deepEqual(result.reasons, [
        "Student CGPA is below the internship minimum.",
        "Student branch is not eligible for this internship.",
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
