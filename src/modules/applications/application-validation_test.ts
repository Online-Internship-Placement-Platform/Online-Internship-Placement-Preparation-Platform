import { describe, expect, it } from "vitest";
import { parseAdminApplicationFilters, parseApplicationId, parseApplicationStatus } from "./application-validation";

describe("application request validation", () => {
  it("accepts positive safe integer IDs and rejects malformed or unsafe IDs", () => {
    expect(parseApplicationId("12")).toBe(12);
    for (const invalid of ["", "0", "-1", "1.5", " 2", "9007199254740992"]) {
      expect(parseApplicationId(invalid)).toBeNull();
    }
  });

  it("accepts canonical application statuses and rejects unknown values", () => {
    expect(parseApplicationStatus(" Shortlisted ")).toBe("Shortlisted");
    expect(parseApplicationStatus(" Unknown ")).toBeNull();
    expect(parseApplicationStatus(3)).toBeNull();
  });

  it("trims admin filters and uses an empty status when none is requested", () => {
    expect(parseAdminApplicationFilters(new URLSearchParams("internshipId=int-001&studentName=Sam&status=Pending"))).toEqual({
      filters: { internshipId: "int-001", studentName: "Sam", status: "Pending" },
    });
    expect(parseAdminApplicationFilters(new URLSearchParams("internshipId=%20int-001%20&studentName=%20Sam%20"))).toEqual({
      filters: { internshipId: "int-001", studentName: "Sam", status: "" },
    });
  });

  it("rejects invalid statuses and student-name searches longer than 100 characters", () => {
    expect(parseAdminApplicationFilters(new URLSearchParams("status=invalid"))).toEqual({
      error: "Choose a valid application status.",
    });
    expect(parseAdminApplicationFilters(new URLSearchParams(`studentName=${"a".repeat(101)}`))).toEqual({
      error: "Student name search must be 100 characters or fewer.",
    });
  });
});
