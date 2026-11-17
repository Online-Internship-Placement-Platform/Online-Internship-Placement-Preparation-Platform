// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import { authenticateUser, toSessionRole, type LoginUser } from "@/modules/authentication/authentication";
import { createLoginHandler } from "@/modules/authentication/login-handler";
import { hashPassword, verifyPassword } from "@/lib/password-hash";

const validPassword = "valid-test-password-123";
const request = (body: string) => new Request("http://localhost/api/auth/login", {
  method: "POST", headers: { "Content-Type": "application/json" }, body,
});
const jsonRequest = (body: unknown) => request(JSON.stringify(body));

describe("password hash and account authentication", () => {
  it("verifies current hashes and rejects absent, malformed, truncated, and incorrect hashes", async () => {
    const hash = await hashPassword(validPassword);
    expect(hash.split("$")).toHaveLength(6);
    expect(await verifyPassword(validPassword, hash)).toBe(true);
    expect(await verifyPassword("wrong password", hash)).toBe(false);
    expect(await verifyPassword(validPassword, null)).toBe(false);
    expect(await verifyPassword(validPassword, "plaintext")).toBe(false);
    expect(await verifyPassword(validPassword, hash.replace("scrypt$16384", "bcrypt$16384"))).toBe(false);
    expect(await verifyPassword(validPassword, hash.replace("$16384$", "$32768$"))).toBe(false);
    expect(await verifyPassword(validPassword, "scrypt$16384$8$1$bad$bad")).toBe(false);
    expect(await verifyPassword(validPassword, "scrypt$16384$8$1$YWJj$YWJj")).toBe(false);
  });

  it("normalizes lookup email and maps supported database roles", async () => {
    const hash = await hashPassword(validPassword);
    const user: LoginUser = { id: 9, email: "student@example.test", passwordHash: hash, role: "STUDENT" };
    const findUser = vi.fn().mockResolvedValue(user);
    expect(toSessionRole("STUDENT")).toBe("student");
    expect(toSessionRole("ADMIN")).toBe("admin");
    expect(toSessionRole("SUPER_ADMIN")).toBe("super-admin");
    expect(toSessionRole("UNKNOWN" as LoginUser["role"])).toBeNull();
    expect(await authenticateUser("  STUDENT@EXAMPLE.TEST ", validPassword, findUser)).toEqual({
      userId: 9, email: "student@example.test", role: "student",
    });
    expect(findUser).toHaveBeenCalledWith("student@example.test");
  });

  it("rejects unknown accounts, accounts without hashes, incorrect passwords and unsupported roles", async () => {
    const hash = await hashPassword(validPassword);
    expect(await authenticateUser("missing@example.test", validPassword, async () => null)).toBeNull();
    expect(await authenticateUser("nohash@example.test", validPassword, async () => ({ id: 1, email: "nohash@example.test", passwordHash: null, role: "STUDENT" }))).toBeNull();
    expect(await authenticateUser("student@example.test", "wrong", async () => ({ id: 2, email: "student@example.test", passwordHash: hash, role: "STUDENT" }))).toBeNull();
    expect(await authenticateUser("invalid@example.test", validPassword, async () => ({ id: 3, email: "invalid@example.test", passwordHash: hash, role: "UNKNOWN" as LoginUser["role"] }))).toBeNull();
  });
});

describe("login handler request and failure paths", () => {
  it("rejects malformed JSON, non-object bodies, invalid credentials and oversized values", async () => {
    const findUser = vi.fn().mockResolvedValue(null);
    const setSession = vi.fn();
    const post = createLoginHandler({ findUser, setSession });
    expect((await post(request("{"))).status).toBe(400);
    expect((await post(jsonRequest(null))).status).toBe(400);
    expect((await post(jsonRequest({ email: 1, password: "secret" }))).status).toBe(400);
    expect((await post(jsonRequest({ email: "", password: "secret" }))).status).toBe(400);
    expect((await post(jsonRequest({ email: "student@example.test", password: "" }))).status).toBe(400);
    expect((await post(jsonRequest({ email: "a".repeat(256), password: "secret" }))).status).toBe(400);
    expect((await post(jsonRequest({ email: "student@example.test", password: "p".repeat(1025) }))).status).toBe(400);
    expect((await post(jsonRequest({ email: "student@example.test", password: "secret" }))).status).toBe(401);
    expect(setSession).not.toHaveBeenCalled();
  });

  it("returns role-aware success and a generic 503 for lookup or session failures", async () => {
    const hash = await hashPassword(validPassword);
    const findUser = vi.fn().mockResolvedValue({ id: 12, email: "admin@example.test", passwordHash: hash, role: "ADMIN" });
    const setSession = vi.fn().mockResolvedValue(undefined);
    const post = createLoginHandler({ findUser, setSession });
    const success = await post(jsonRequest({ email: "ADMIN@example.test", password: validPassword }));
    expect(success.status).toBe(200);
    expect(await success.json()).toEqual({ role: "admin", route: "/admin/dashboard" });
    expect(setSession).toHaveBeenCalledWith({ userId: 12, role: "admin" });

    const logger = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const lookupFailure = createLoginHandler({ findUser: async () => { throw { code: "DB_DOWN" }; }, setSession });
      const firstError = await lookupFailure(jsonRequest({ email: "admin@example.test", password: validPassword }));
      expect(firstError.status).toBe(503);
      expect(logger).toHaveBeenLastCalledWith("Login failed during account lookup or session creation.", { errorCode: "DB_DOWN" });
      const sessionFailure = createLoginHandler({ findUser: async () => ({ id: 12, email: "admin@example.test", passwordHash: hash, role: "ADMIN" }), setSession: async () => { throw "session failed"; } });
      const secondError = await sessionFailure(jsonRequest({ email: "admin@example.test", password: validPassword }));
      expect(secondError.status).toBe(503);
      expect(await secondError.json()).toEqual({ error: "Sign in is temporarily unavailable. Please try again." });
    } finally {
      logger.mockRestore();
    }
  });
});
