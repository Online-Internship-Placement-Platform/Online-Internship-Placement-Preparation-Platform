import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));

vi.mock("@/lib/server-auth", () => ({
  getServerRole: vi.fn(),
  isServerAuthConfigured: vi.fn(),
}));

vi.mock("@/components/role-pages", () => ({
  AssessmentsPage: vi.fn(),
}));

import AdminAssessmentsRoute from "@/app/admin/assessments/page";
import SuperAdminAssessmentsRoute from "@/app/super-admin/assessments/page";
import StudentAssessmentsRoute from "@/app/student/assessments/page";
import { requireAssessmentRole } from "@/lib/assessment-route-auth";
import { getServerRole, isServerAuthConfigured } from "@/lib/server-auth";

describe("assessment route authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isServerAuthConfigured).mockReturnValue(true);
  });

  it("redirects unauthenticated users from protected assessment routes", async () => {
    vi.mocked(getServerRole).mockResolvedValue(null);

    await expect(requireAssessmentRole(["admin", "super-admin"])).rejects.toThrow(
      "redirect:/login",
    );
  });

  it("denies students the admin assessment role", async () => {
    vi.mocked(getServerRole).mockResolvedValue("student");

    await expect(requireAssessmentRole(["admin", "super-admin"])).rejects.toThrow(
      "redirect:/login",
    );
  });

  it("allows admins and super-admins the admin assessment role", async () => {
    vi.mocked(getServerRole).mockResolvedValue("admin");
    await expect(requireAssessmentRole(["admin", "super-admin"])).resolves.toBe("admin");

    vi.mocked(getServerRole).mockResolvedValue("super-admin");
    await expect(requireAssessmentRole(["admin", "super-admin"])).resolves.toBe("super-admin");
  });

  it("allows only super-admins the super-admin assessment role", async () => {
    vi.mocked(getServerRole).mockResolvedValue("admin");
    await expect(requireAssessmentRole(["super-admin"])).rejects.toThrow(
      "redirect:/login",
    );

    vi.mocked(getServerRole).mockResolvedValue("super-admin");
    await expect(requireAssessmentRole(["super-admin"])).resolves.toBe("super-admin");
  });

  it("allows students only the student assessment role", async () => {
    vi.mocked(getServerRole).mockResolvedValue("student");
    await expect(requireAssessmentRole(["student"])).resolves.toBe("student");

    vi.mocked(getServerRole).mockResolvedValue("admin");
    await expect(requireAssessmentRole(["student"])).rejects.toThrow(
      "redirect:/login",
    );
  });

  it("redirects when server authentication is not configured", async () => {
    vi.mocked(isServerAuthConfigured).mockReturnValue(false);

    await expect(requireAssessmentRole(["admin", "super-admin"])).rejects.toThrow(
      "redirect:/login",
    );
    expect(getServerRole).not.toHaveBeenCalled();
  });

  it("renders protected routes with server-rendered authorization boundaries", () => {
    expect(AdminAssessmentsRoute()).toBeTruthy();
    expect(SuperAdminAssessmentsRoute()).toBeTruthy();
    expect(StudentAssessmentsRoute()).toBeTruthy();
    expect(getServerRole).not.toHaveBeenCalled();
  });
});
