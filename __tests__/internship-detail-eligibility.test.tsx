import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a>,
}));

vi.mock("@/components/app-shell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
  SectionHeading: ({ title }: { title: string }) => <h2>{title}</h2>,
  StatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}));

import { InternshipDetail } from "@/components/internship-detail";

describe("InternshipDetail eligibility", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        internship: {
          id: "internship-1",
          company: "Example Labs",
          role: "Engineer Intern",
          domain: "Software Development",
          stipendPerMonth: 0,
          type: "remote",
          location: null,
          description: "Build software.",
          applicationDeadline: "2030-06-30",
          minCgpa: 7,
          eligibleBranches: ["Computer Science"],
          requiredSkills: ["Rust"],
        },
        canApply: true,
        isOpen: true,
        alreadyApplied: false,
        eligibilityChecks: [
          { criterion: "CGPA", eligible: true, reasons: [] },
          { criterion: "Branch", eligible: true, reasons: [] },
          { criterion: "Deadline", eligible: true, reasons: [] },
        ],
        student: { name: "Alex Sample", email: "alex@example.test", branch: "Computer Science", cgpa: 8.5 },
      }),
    } as Response));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows employer-listed skills as informational and does not render skill eligibility controls", async () => {
    render(<InternshipDetail id="internship-1" />);

    expect(await screen.findByText("Skills mentioned by employer")).toBeDefined();
    expect(screen.getByText("For reference only; skill match is not used to determine application eligibility.")).toBeDefined();
    expect(screen.getByText("Rust")).toBeDefined();
    expect(screen.queryByText("Skill: Rust")).toBeNull();
    expect(screen.queryByRole("button", { name: "Edit skills" })).toBeNull();
    expect((screen.getByRole("button", { name: "Apply now" }) as HTMLButtonElement).disabled).toBe(false);
  });
});
