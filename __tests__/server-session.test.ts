// @vitest-environment node

import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  token: undefined as string | undefined,
  findUnique: vi.fn(),
  connection: vi.fn(),
  cookies: vi.fn(),
}));

vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("next/server", () => ({ connection: mocks.connection }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique: mocks.findUnique } } }));

import { getServerSession } from "@/lib/server-session";

const sessionSecret = "test-session-secret-at-least-32-characters-long";
const legacySecret = "test-legacy-secret-at-least-32-characters-long";

function signedToken(payload: unknown, secret = sessionSecret) {
  const value = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret).update(value).digest("base64url");
  return `${value}.${signature}`;
}

function legacyToken(role: string, email: string, expiresAt: number, secret = legacySecret) {
  const signature = createHmac("sha256", secret).update(`${role}.${email}.${expiresAt}`).digest("base64url");
  return `${role}.${email}.${expiresAt}.${signature}`;
}

function setToken(token: string | undefined) {
  mocks.token = token;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.SESSION_SECRET = sessionSecret;
  process.env.AUTH_SESSION_SECRET = legacySecret;
  mocks.token = undefined;
  mocks.cookies.mockResolvedValue({ get: () => mocks.token ? { value: mocks.token } : undefined });
  mocks.connection.mockResolvedValue(undefined);
  mocks.findUnique.mockResolvedValue({ id: 7, role: "STUDENT" });
});

describe("verified server sessions", () => {
  it("rejects a missing or malformed cookie", async () => {
    expect(await getServerSession()).toBeNull();
    setToken("only-one-part");
    expect(await getServerSession()).toBeNull();
    setToken("a.b.extra");
    expect(await getServerSession()).toBeNull();
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("rejects a missing, weak, or mismatched signing secret and bad signatures", async () => {
    setToken("encoded.bad-signature");
    expect(await getServerSession()).toBeNull();
    setToken(signedToken({ userId: 7, role: "student", expiresAt: Date.now() / 1000 + 60 }));
    delete process.env.SESSION_SECRET;
    expect(await getServerSession()).toBeNull();
    process.env.SESSION_SECRET = "short";
    expect(await getServerSession()).toBeNull();
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("rejects invalid payload shapes, identities, roles, and expired sessions", async () => {
    const now = Math.floor(Date.now() / 1000);
    for (const payload of [
      null,
      [],
      { userId: 0, role: "student", expiresAt: now + 60 },
      { userId: 7.5, role: "student", expiresAt: now + 60 },
      { userId: 7, role: "visitor", expiresAt: now + 60 },
      { userId: 7, role: "student", expiresAt: "tomorrow" },
      { userId: 7, role: "student", expiresAt: now },
    ]) {
      setToken(signedToken(payload));
      expect(await getServerSession()).toBeNull();
    }
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("checks the current database role and handles missing users and lookup failures", async () => {
    const expiresAt = Math.floor(Date.now() / 1000) + 120;
    setToken(signedToken({ userId: 7, role: "student", expiresAt }));
    expect(await getServerSession()).toEqual({ userId: 7, role: "student" });
    expect(mocks.connection).toHaveBeenCalledOnce();
    expect(mocks.findUnique).toHaveBeenCalledWith({ where: { id: 7 }, select: { role: true } });

    mocks.findUnique.mockResolvedValueOnce(null);
    expect(await getServerSession()).toBeNull();
    mocks.findUnique.mockResolvedValueOnce({ id: 7, role: "UNRECOGNIZED" });
    expect(await getServerSession()).toBeNull();
    mocks.findUnique.mockRejectedValueOnce({ code: "DB_UNAVAILABLE", secret: "private" });
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(await getServerSession()).toBeNull();
    expect(error).toHaveBeenCalledWith("Session account lookup failed.", { errorCode: "DB_UNAVAILABLE" });
    error.mockRestore();
  });

  it("rejects malformed signed payload JSON", async () => {
    const value = Buffer.from("not-json").toString("base64url");
    const signature = createHmac("sha256", sessionSecret).update(value).digest("base64url");
    setToken(`${value}.${signature}`);
    expect(await getServerSession()).toBeNull();
  });
});

describe("legacy server sessions", () => {
  it("accepts a valid legacy cookie only after checking its signature and current account role", async () => {
    const expiresAt = Math.floor(Date.now() / 1000) + 60;
    setToken(legacyToken("admin", "name.with.dots@example.test", expiresAt));
    mocks.findUnique.mockResolvedValue({ id: 8, role: "ADMIN" });
    expect(await getServerSession()).toEqual({ userId: 8, role: "admin" });
    expect(mocks.connection).toHaveBeenCalledOnce();
    expect(mocks.findUnique).toHaveBeenCalledWith({
      where: { email: "name.with.dots@example.test" }, select: { id: true, role: true },
    });
  });

  it("rejects legacy cookies with invalid configuration, format, role, expiry, signature, or account", async () => {
    const future = Math.floor(Date.now() / 1000) + 60;
    const valid = legacyToken("student", "student@example.test", future);
    for (const token of [
      "student.email",
      legacyToken("guest", "student@example.test", future),
      legacyToken("student", "", future),
      legacyToken("student", "student@example.test", Math.floor(Date.now() / 1000)),
      legacyToken("student", "student@example.test", future + 60 * 60 * 24),
      `${valid.slice(0, valid.lastIndexOf("."))}.invalid`,
    ]) {
      setToken(token);
      expect(await getServerSession()).toBeNull();
    }
    setToken(valid);
    mocks.findUnique.mockResolvedValueOnce(null);
    expect(await getServerSession()).toBeNull();
    setToken(valid);
    mocks.findUnique.mockResolvedValueOnce({ id: 7, role: "ADMIN" });
    expect(await getServerSession()).toBeNull();
    expect(mocks.findUnique).toHaveBeenCalledTimes(2);
  });

  it("ignores legacy cookies when the legacy secret is absent or a placeholder", async () => {
    const token = legacyToken("student", "student@example.test", Math.floor(Date.now() / 1000) + 60);
    setToken(token);
    process.env.AUTH_SESSION_SECRET = "replace-with-a-random-secret-and-something-long-enough";
    expect(await getServerSession()).toBeNull();
    process.env.AUTH_SESSION_SECRET = "short";
    expect(await getServerSession()).toBeNull();
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });
});
