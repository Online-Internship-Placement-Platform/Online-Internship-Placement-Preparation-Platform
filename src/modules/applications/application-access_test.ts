import { describe, expect, it } from "vitest";
import { applicationResumeFilter } from "./application-access";

describe("application resume ownership filter", () => {
  it("restricts students to their own application", () => {
    expect(applicationResumeFilter(13, 8, false)).toEqual({ id: 13, studentId: 8 });
  });

  it("allows administrators to review resumes across students", () => {
    expect(applicationResumeFilter(13, 8, true)).toEqual({ id: 13 });
  });
});
