import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDemoAccount: vi.fn(), createRoleSession: vi.fn(), clearRoleSession: vi.fn(),
  getServerRole: vi.fn(), isServerAuthConfigured: vi.fn(),
}));
vi.mock("@/lib/auth-accounts", () => ({ getDemoAccount: mocks.getDemoAccount }));
vi.mock("@/lib/server-auth", () => ({
  createRoleSession: mocks.createRoleSession, clearRoleSession: mocks.clearRoleSession,
  getServerRole: mocks.getServerRole, isServerAuthConfigured: mocks.isServerAuthConfigured,
}));

import { getSignedInRole, signIn, signOut } from "@/lib/auth-actions";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isServerAuthConfigured.mockReturnValue(true);
  mocks.getDemoAccount.mockReturnValue({ email: "student@gmail.com", role: "student" });
  mocks.createRoleSession.mockResolvedValue(undefined);
  mocks.clearRoleSession.mockResolvedValue(undefined);
});

describe("legacy demo sign-in actions", () => {
  it("validates credentials, authentication configuration, and account lookup", async () => {
    expect(await signIn("  ", "password")).toEqual({ success: false, error: "Enter your email and password to continue." });
    expect(await signIn("student@gmail.com", "")).toEqual({ success: false, error: "Enter your email and password to continue." });
    mocks.isServerAuthConfigured.mockReturnValueOnce(false);
    expect((await signIn("student@gmail.com", "student")).error).toContain("Server authentication is not configured.");
    mocks.getDemoAccount.mockReturnValueOnce(undefined);
    expect(await signIn("student@gmail.com", "wrong")).toEqual({ success: false, error: "The email or password is incorrect." });
    expect(mocks.createRoleSession).not.toHaveBeenCalled();
  });

  it("creates a role session for valid demo credentials and forwards session helpers", async () => {
    expect(await signIn(" STUDENT@gmail.com ", "student")).toEqual({ success: true, role: "student" });
    expect(mocks.createRoleSession).toHaveBeenCalledWith("student", "student@gmail.com");
    mocks.getServerRole.mockResolvedValue("admin");
    expect(await getSignedInRole()).toBe("admin");
    await signOut();
    expect(mocks.clearRoleSession).toHaveBeenCalledOnce();
  });
});
