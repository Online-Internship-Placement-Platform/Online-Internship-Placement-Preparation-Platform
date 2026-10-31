import { describe, expect, it } from "vitest";
import {
  checkEligibility,
  type InternshipEligibilityRequirements,
  type StudentEligibilityProfile,
} from "@/modules/applications/eligibility";

const now = new Date("2030-06-01T12:00:00.000Z");

const internship: InternshipEligibilityRequirements = {
  minCgpa: 7.5,
  eligibleBranches: ["Computer Science", "Information Technology"],
  requiredSkills: ["React", "SQL"],
  applicationDeadline: "2030-06-30",
};

const knownProfiles: Array<{
  name: string;
  profile: StudentEligibilityProfile;
  expectedStatus: "eligible" | "ineligible";
}> = [
  {
    name: "CGPA exactly at the minimum",
    profile: { cgpa: 7.5, branch: "Computer Science", skills: ["React", "SQL"] },
    expectedStatus: "eligible",
  },
  {
    name: "a higher-CGPA student from another allowed branch",
    profile: { cgpa: 9.1, branch: "Information Technology", skills: ["SQL", "React", "TypeScript"] },
    expectedStatus: "eligible",
  },
  {
    name: "CGPA just below the minimum",
    profile: { cgpa: 7.499, branch: "Computer Science", skills: ["React", "SQL"] },
    expectedStatus: "ineligible",
  },
  {
    name: "an unlisted branch",
    profile: { cgpa: 8.4, branch: "Mechanical Engineering", skills: ["React", "SQL"] },
    expectedStatus: "ineligible",
  },
  {
    name: "a missing required skill",
    profile: { cgpa: 8.4, branch: "Computer Science", skills: ["React"] },
    expectedStatus: "ineligible",
  },
  {
    name: "multiple failed requirements",
    profile: { cgpa: 6.2, branch: "Arts", skills: [] },
    expectedStatus: "ineligible",
  },
];

describe("internship eligibility reliability (TC-34)", () => {
  it.each(knownProfiles)("consistently evaluates $name", ({ profile, expectedStatus }) => {
    const results = Array.from({ length: 10 }, () => checkEligibility(profile, internship, now));

    expect(results[0].status).toBe(expectedStatus);
    expect(results[0].eligible).toBe(expectedStatus === "eligible");
    for (const result of results.slice(1)) {
      expect(result).toEqual(results[0]);
    }
  });

  it("keeps the exact CGPA boundary inclusive and just-below boundary ineligible", () => {
    const atMinimum = checkEligibility(knownProfiles[0].profile, internship, now);
    const belowMinimum = checkEligibility(knownProfiles[2].profile, internship, now);

    expect(atMinimum).toEqual({ eligible: true, status: "eligible", reasons: [] });
    expect(belowMinimum).toMatchObject({
      eligible: false,
      status: "ineligible",
      reasons: ["Student CGPA is below the internship minimum."],
    });
  });

  it.each([
    { label: "capitalized array values", skills: ["REACT", "sql"] },
    { label: "delimited values with whitespace", skills: " React ; SQL " },
    { label: "JSON-encoded values", skills: '["react", "SQL"]' },
  ])("returns the same eligibility for $label", ({ skills }) => {
    const profile: StudentEligibilityProfile = {
      cgpa: 8.2,
      branch: " computer science ",
      skills,
    };
    const results = Array.from({ length: 10 }, () => checkEligibility(profile, internship, now));

    expect(results[0]).toEqual({ eligible: true, status: "eligible", reasons: [] });
    for (const result of results.slice(1)) {
      expect(result).toEqual(results[0]);
    }
  });
});
