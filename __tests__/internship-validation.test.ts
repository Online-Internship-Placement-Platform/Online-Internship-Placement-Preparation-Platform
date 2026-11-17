import { describe, expect, it } from "vitest";
import { parseInternshipInput } from "@/modules/internships/internship-validation";

const validInput = {
  company: "Example Co",
  role: "Frontend Intern",
  domain: "Software Development",
  stipendPerMonth: 15000,
  type: "remote",
  location: null,
  description: "Build and test product features.",
  applicationDeadline: "2030-06-30",
  minCgpa: 7.5,
  eligibleBranches: "Computer Science",
  requiredSkills: "React",
  published: false,
  acceptingApplications: false,
};

describe("parseInternshipInput location and compensation", () => {
  it("clears location for remote internships", () => {
    const result = parseInternshipInput({ ...validInput, location: "should be removed" });
    expect(result).toMatchObject({ ok: true, data: { type: "remote", location: null, stipendPerMonth: 15000 } });
  });

  it("requires a location for hybrid and on-site internships", () => {
    expect(parseInternshipInput({ ...validInput, type: "hybrid", location: "" })).toMatchObject({ ok: false });
    expect(parseInternshipInput({ ...validInput, type: "on-site", location: "Bengaluru" })).toMatchObject({
      ok: true,
      data: { type: "on-site", location: "Bengaluru" },
    });
  });

  it("rejects negative stipends and unsupported work types", () => {
    expect(parseInternshipInput({ ...validInput, stipendPerMonth: -1 })).toMatchObject({ ok: false });
    expect(parseInternshipInput({ ...validInput, type: "flexible" })).toMatchObject({ ok: false });
  });

  it("rejects missing or whitespace-only descriptions", () => {
    expect(parseInternshipInput({ ...validInput, description: "" })).toMatchObject({ ok: false });
    expect(parseInternshipInput({ ...validInput, description: "  \n  " })).toMatchObject({ ok: false });
  });
});

describe("parseInternshipInput validation edges", () => {
  it.each([null, [], "not an object"]) ("rejects a non-object payload: %j", (value) => {
    expect(parseInternshipInput(value)).toEqual({ ok: false, error: "Provide internship details." });
  });

  it("trims required text fields and enforces their maximum lengths", () => {
    expect(parseInternshipInput({ ...validInput, company: "  Example Co  ", role: "  Frontend Intern  " })).toMatchObject({
      ok: true, data: { company: "Example Co", role: "Frontend Intern" },
    });
    expect(parseInternshipInput({ ...validInput, company: " ".repeat(2) })).toMatchObject({ ok: false, error: "Company is required and must be 191 characters or fewer." });
    expect(parseInternshipInput({ ...validInput, company: "c".repeat(192) })).toMatchObject({ ok: false });
    expect(parseInternshipInput({ ...validInput, role: " " })).toMatchObject({ ok: false, error: "Role is required and must be 191 characters or fewer." });
    expect(parseInternshipInput({ ...validInput, role: "r".repeat(192) })).toMatchObject({ ok: false });
    expect(parseInternshipInput({ ...validInput, domain: null })).toMatchObject({ ok: false, error: "Choose a valid internship domain." });
  });

  it("rejects non-finite and out-of-range stipend and CGPA values while accepting numeric strings", () => {
    for (const stipendPerMonth of ["not a number", -1, 1_000_000_001]) {
      expect(parseInternshipInput({ ...validInput, stipendPerMonth })).toMatchObject({ ok: false, error: "Monthly stipend must be a non-negative amount." });
    }
    expect(parseInternshipInput({ ...validInput, stipendPerMonth: "0" })).toMatchObject({ ok: true, data: { stipendPerMonth: 0 } });
    for (const minCgpa of ["not a number", -0.1, 10.1]) {
      expect(parseInternshipInput({ ...validInput, minCgpa })).toMatchObject({ ok: false, error: "Minimum CGPA must be from 0 to 10." });
    }
    expect(parseInternshipInput({ ...validInput, minCgpa: "10" })).toMatchObject({ ok: true, data: { minCgpa: 10 } });
  });

  it("validates on-site locations, descriptions, and calendar deadlines", () => {
    expect(parseInternshipInput({ ...validInput, type: "on-site", location: null })).toMatchObject({ ok: false, error: expect.stringContaining("Location is required") });
    expect(parseInternshipInput({ ...validInput, type: "hybrid", location: "x".repeat(192) })).toMatchObject({ ok: false, error: expect.stringContaining("Location is required") });
    expect(parseInternshipInput({ ...validInput, description: 1 })).toMatchObject({ ok: false, error: expect.stringContaining("Description is required") });
    expect(parseInternshipInput({ ...validInput, description: "d".repeat(20_001) })).toMatchObject({ ok: false, error: expect.stringContaining("Description is required") });
    expect(parseInternshipInput({ ...validInput, applicationDeadline: 20300630 })).toMatchObject({ ok: false, error: "Choose a valid application deadline." });
    expect(parseInternshipInput({ ...validInput, applicationDeadline: "2030-02-30" })).toMatchObject({ ok: false, error: "Choose a valid application deadline." });
  });

  it("normalizes list values and rejects missing, oversized, or wrongly typed lists", () => {
    expect(parseInternshipInput({ ...validInput, eligibleBranches: "Computer Science, computer science; IT\n" })).toMatchObject({
      ok: true, data: { eligibleBranches: ["computer science", "IT"] },
    });
    expect(parseInternshipInput({ ...validInput, eligibleBranches: "  " })).toMatchObject({ ok: false, error: "Enter at least one eligible branch (or Any branch)." });
    expect(parseInternshipInput({ ...validInput, eligibleBranches: 7 })).toMatchObject({ ok: false });
    expect(parseInternshipInput({ ...validInput, eligibleBranches: Array.from({ length: 51 }, (_, i) => `Branch ${i}`).join(",") })).toMatchObject({ ok: false });
    expect(parseInternshipInput({ ...validInput, eligibleBranches: "x".repeat(101) })).toMatchObject({ ok: false });
    expect(parseInternshipInput({ ...validInput, requiredSkills: null })).toMatchObject({ ok: false, error: "Enter valid required skills." });
    expect(parseInternshipInput({ ...validInput, requiredSkills: "React, react, SQL" })).toMatchObject({ ok: true, data: { requiredSkills: ["react", "SQL"] } });
    expect(parseInternshipInput({ ...validInput, requiredSkills: "x".repeat(101) })).toMatchObject({ ok: false });
  });

  it("requires explicit boolean publication flags", () => {
    expect(parseInternshipInput({ ...validInput, published: "false" })).toMatchObject({ ok: false, error: "Set publication and application status explicitly." });
    expect(parseInternshipInput({ ...validInput, acceptingApplications: null })).toMatchObject({ ok: false });
  });
});
