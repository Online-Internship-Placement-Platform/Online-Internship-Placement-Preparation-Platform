import assert from "node:assert/strict";
import { createLoginHandler } from "./login-handler";
import type { Role } from "@/lib/placement-data";
import { hashPassword, verifyPassword } from "@/lib/password-hash";
import type { LoginUser } from "./authentication";

const password = "a-long-test-password";
const passwordHash = await hashPassword(password);
assert.equal(await verifyPassword(password, passwordHash), true);
assert.equal(await verifyPassword("wrong-password", passwordHash), false);
assert.equal(await verifyPassword(password, null), false);
assert.equal(await verifyPassword(password, "plaintext"), false);

function request(email: string, value: string) {
  return new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: value }),
  });
}

async function handlerFor(user: LoginUser | null) {
  const sessions: Array<{ userId: number; role: Role }> = [];
  const handler = createLoginHandler({
    findUser: async (email) => {
      assert.equal(email, user?.email.toLowerCase() ?? email);
      return user;
    },
    setSession: async (session) => { sessions.push(session); },
  });
  return { handler, sessions };
}

const student: LoginUser = { id: 10, email: "student@example.test", passwordHash, role: "STUDENT" };
const studentHarness = await handlerFor(student);
const studentResponse = await studentHarness.handler(request(" Student@Example.Test ", password));
assert.equal(studentResponse.status, 200);
assert.deepEqual(await studentResponse.json(), { role: "student", route: "/student/dashboard" });
assert.deepEqual(studentHarness.sessions, [{ userId: 10, role: "student" }]);

// The account intentionally has no StudentProfile: admin authentication does not query one.
const administrator: LoginUser = { id: 11, email: "admin@example.test", passwordHash, role: "ADMIN" };
const adminHarness = await handlerFor(administrator);
const adminResponse = await adminHarness.handler(request(administrator.email, password));
assert.equal(adminResponse.status, 200);
assert.deepEqual(await adminResponse.json(), { role: "admin", route: "/admin/dashboard" });
assert.deepEqual(adminHarness.sessions, [{ userId: 11, role: "admin" }]);

const superAdmin = { id: 12, email: "super@example.test", passwordHash, role: "SUPER_ADMIN" as const };
const superAdminHarness = await handlerFor(superAdmin);
const superAdminResponse = await superAdminHarness.handler(request(superAdmin.email, password));
assert.equal(superAdminResponse.status, 200);
assert.deepEqual(await superAdminResponse.json(), { role: "super-admin", route: "/super-admin/dashboard" });
assert.deepEqual(superAdminHarness.sessions, [{ userId: 12, role: "super-admin" }]);

const wrongPassword = await studentHarness.handler(request(student.email, "incorrect"));
assert.equal(wrongPassword.status, 401);
assert.equal(studentHarness.sessions.length, 1);

const unknownHarness = await handlerFor(null);
const unknownEmail = await unknownHarness.handler(request("nobody@example.test", password));
assert.equal(unknownEmail.status, 401);
assert.equal(unknownHarness.sessions.length, 0);

const noHashHarness = await handlerFor({ ...student, passwordHash: null });
assert.equal((await noHashHarness.handler(request(student.email, password))).status, 401);

const databaseFailure = createLoginHandler({
  findUser: async () => { throw new Error("private database details"); },
  setSession: async () => { throw new Error("should not create session"); },
});
const loggedErrors: unknown[][] = [];
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => { loggedErrors.push(args); };
let databaseErrorResponse: Response;
let sessionErrorResponse: Response;
try {
  databaseErrorResponse = await databaseFailure(request(student.email, password));
  const sessionFailure = createLoginHandler({ findUser: async () => student, setSession: async () => { throw new Error("session secret details"); } });
  sessionErrorResponse = await sessionFailure(request(student.email, password));
} finally {
  console.error = originalConsoleError;
}
assert.equal(databaseErrorResponse.status, 503);
assert.deepEqual(await databaseErrorResponse.json(), { error: "Sign in is temporarily unavailable. Please try again." });
assert.equal(sessionErrorResponse.status, 503);
assert.equal(JSON.stringify(loggedErrors).includes("private database details"), false);
assert.equal(JSON.stringify(loggedErrors).includes("session secret details"), false);

console.log("Authentication and login route checks passed.");
