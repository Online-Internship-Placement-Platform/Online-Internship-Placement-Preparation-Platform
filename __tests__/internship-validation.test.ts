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