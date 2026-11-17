// @vitest-environment node

import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  token: undefined as string | undefined,
  set: vi.fn(), delete: vi.fn(),
  cookies: vi.fn(), findUnique: vi.fn(), getVerifiedSession: vi.fn(),
}));
vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique: mocks.findUnique } } }));
vi.mock("@/lib/server-session", () => ({ getServerSession: mocks.getVerifiedSession }));

import { clearRoleSession, createRoleSession, getServerEmail, getServerRole, getServerSession, isServerAuthConfigured } from "@/lib/server-auth";

const validSecret = "auth-session-secret-with-at-least-32-characters";
function signedLegacy(role: string, email: string, expires: number, secret = validSecret) {
  const signature = createHmac("sha256", secret).update(`${role}.${email}.${expires}`).digest("base64url");
  return `${role}.${email}.${expires}.${signature}`;
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.SESSION_SECRET;
  process.env.AUTH_SESSION_SECRET = validSecret;
  process.env.NODE_ENV = "test";
  mocks.token = undefined;
  mocks.set.mockReset();
  mocks.delete.mockReset();
  mocks.cookies.mockResolvedValue({
    get: () => mocks.token ? { value: mocks.token } : undefined,
    set: mocks.set,
    delete: mocks.delete,
  });
  mocks.getVerifiedSession.mockResolvedValue(null);
  mocks.findUnique.mockResolvedValue({ email: "user@example.test" });
});

describe("role session creation and configuration", () => {
  it("recognizes a usable current or legacy secret and rejects placeholders", () => {
    delete process.env.AUTH_SESSION_SECRET;
    expect(isServerAuthConfigured()).toBe(false);
    process.env.AUTH_SESSION_SECRET = "short";
    expect(isServerAuthConfigured()).toBe(false);
    process.env.SESSION_SECRET = "server-session-secret-long-enough-123456";
    expect(isServerAuthConfigured()).toBe(true);
    delete process.env.SESSION_SECRET;
    process.env.AUTH_SESSION_SECRET = validSecret;
    expect(isServerAuthConfigured()).toBe(true);
    process.env.AUTH_SESSION_SECRET = `replace-with-a-random-secret-${validSecret}`;
    expect(isServerAuthConfigured()).toBe(false);
  });

  it("creates and clears secure production role cookies and rejects missing secrets", async () => {
    process.env.AUTH_SESSION_SECRET = "short";
    await expect(createRoleSession("student", "student@example.test")).rejects.toThrow("AUTH_SESSION_SECRET must contain at least 32 characters.");
    process.env.AUTH_SESSION_SECRET = validSecret;
    process.env.NODE_ENV = "production";
    await createRoleSession("admin", "admin@example.test");
    expect(mocks.set).toHaveBeenCalledWith("inplace-server-session", expect.stringMatching(/^admin\.admin@example\.test\.\d+\./), expect.objectContaining({
      httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 8,
    }));
    await clearRoleSession();
    expect(mocks.delete).toHaveBeenCalledWith("inplace-server-session");
  });
});

describe("server role session readers", () => {
  it("prefers a verified server session and resolves its current email", async () => {
    mocks.getVerifiedSession.mockResolvedValue({ userId: 5, role: "super-admin" });
    mocks.findUnique.mockResolvedValue({ email: "root@example.test" });
    expect(await getServerSession()).toEqual({ role: "super-admin", email: "root@example.test" });
    expect(mocks.findUnique).toHaveBeenCalledWith({ where: { id: 5 }, select: { email: true } });
    mocks.findUnique.mockResolvedValueOnce(null);
    expect(await getServerSession()).toBeNull();
  });

  it("accepts correctly signed legacy sessions with dotted emails", async () => {
    const expires = Math.floor(Date.now() / 1000) + 60;
    mocks.token = signedLegacy("student", "person.with.dots@example.test", expires);
    expect(await getServerSession()).toEqual({ role: "student", email: "person.with.dots@example.test" });
    expect(await getServerRole()).toBe("student");
    expect(await getServerEmail()).toBe("person.with.dots@example.test");
  });

  it("rejects empty, malformed, unsupported, expired, and incorrectly signed legacy sessions", async () => {
    const future = Math.floor(Date.now() / 1000) + 60;
    const valid = signedLegacy("admin", "admin@example.test", future);
    for (const token of [
      undefined,
      "malformed.token",
      signedLegacy("other", "admin@example.test", future),
      signedLegacy("admin", "", future),
      signedLegacy("admin", "admin@example.test", Math.floor(Date.now() / 1000)),
      `${valid.slice(0, valid.lastIndexOf("."))}.wrong-signature`,
    ]) {
      mocks.token = token;
      expect(await getServerSession()).toBeNull();
    }
    process.env.AUTH_SESSION_SECRET = "replace-with-a-random-secret-and-more-characters";
    mocks.token = valid;
    expect(await getServerSession()).toBeNull();
    expect(await getServerRole()).toBeNull();
    expect(await getServerEmail()).toBeNull();
  });
});
