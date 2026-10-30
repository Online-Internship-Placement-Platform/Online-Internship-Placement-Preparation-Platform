import assert from "node:assert/strict";
import { parseInternshipInput } from "./internship-validation";

const validInput = {
  company: "Example Co",
  role: "Engineering Intern",
  domain: "Software Development",
  applicationDeadline: "2030-06-30",
  minCgpa: 7.5,
  eligibleBranches: "Computer Science\nInformation Technology",
  requiredSkills: "React, TypeScript",
  published: false,
  acceptingApplications: false,
};

assert.deepEqual(parseInternshipInput(validInput), {
  ok: true,
  data: {
    company: "Example Co",
    role: "Engineering Intern",
    domain: "Software Development",
    applicationDeadline: "2030-06-30",
    minCgpa: 7.5,
    eligibleBranches: ["Computer Science", "Information Technology"],
    requiredSkills: ["React", "TypeScript"],
    published: false,
    acceptingApplications: false,
  },
});
assert.equal(parseInternshipInput({ ...validInput, published: undefined }).ok, false);
assert.equal(parseInternshipInput({ ...validInput, acceptingApplications: true, published: false }).ok, true);
assert.equal(parseInternshipInput({ ...validInput, applicationDeadline: "2030-02-30" }).ok, false);
assert.equal(parseInternshipInput({ ...validInput, minCgpa: 10.5 }).ok, false);
console.log("Internship input validation checks passed.");
