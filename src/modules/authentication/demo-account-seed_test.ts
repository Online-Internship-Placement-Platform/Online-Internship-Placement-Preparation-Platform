import assert from "node:assert/strict";
import { verifyPassword } from "@/lib/password-hash";
import { authenticateUser } from "./authentication";
import { demoAccounts, ensureDemoAccount, type DemoAccountStore, type ExistingDemoUser } from "./demo-account-seed";

function memoryStore(initial: Array<ExistingDemoUser & { email: string }> = []) {
  const users = new Map(initial.map((user) => [user.email, structuredClone(user)]));
  const profiles: Array<{ userId: number; branch: string; cgpa: number; yearOfStudy: string; skills: string[] }> = [];
  let nextId = 20;
  const store: DemoAccountStore = {
    findByEmail: async (email) => {
      const user = users.get(email);
      return user ? structuredClone(user) : null;
    },
    createAccount: async (data) => {
      const id = nextId++;
      const profile = data.studentProfile ? { id: profiles.length + 1 } : null;
      users.set(data.email, { id, email: data.email, role: data.role, passwordHash: data.passwordHash, studentProfile: profile });
      if (data.studentProfile) profiles.push({ userId: id, ...structuredClone(data.studentProfile) });
    },
    updatePasswordHash: async (id, passwordHash, role, previousPasswordHash) => {
      const user = [...users.values()].find((item) => item.id === id);
      assert.ok(user);
      assert.equal(user.role, role);
      assert.equal(user.passwordHash, previousPasswordHash);
      user.passwordHash = passwordHash;
    },
    createStudentProfile: async (userId, profile) => {
      const user = [...users.values()].find((item) => item.id === userId);
      assert.ok(user);
      user.studentProfile = { id: profiles.length + 1 };
      profiles.push({ userId, ...structuredClone(profile) });
    },
  };
  return { store, users, profiles };
}

const created = memoryStore();
for (const account of demoAccounts) assert.equal(await ensureDemoAccount(created.store, account), "created");
assert.equal(created.users.size, 3);
const student = created.users.get("student@gmail.com");
assert.ok(student?.passwordHash);
assert.equal(await verifyPassword("student", student.passwordHash), true);
assert.ok(student.studentProfile);
assert.deepEqual(created.profiles[0], {
  userId: student.id,
  branch: "Computer Science",
  cgpa: 8.6,
  yearOfStudy: "THIRD",
  skills: ["React", "TypeScript", "SQL", "Figma"],
});
for (const email of ["admin@gmail.com", "superadmin@gmail.com"]) {
  const account = created.users.get(email);
  assert.ok(account?.passwordHash);
  assert.equal(account.studentProfile, null);
}
for (const [email, expectedRole] of [
  ["student@gmail.com", "student"],
  ["admin@gmail.com", "admin"],
  ["superadmin@gmail.com", "super-admin"],
] as const) {
  const account = created.users.get(email)!;
  const identity = await authenticateUser(email, demoAccounts.find((item) => item.email === email)!.password, async () => ({
    id: account.id,
    email,
    passwordHash: account.passwordHash,
    role: account.role,
  }));
  assert.equal(identity?.role, expectedRole);
  assert.equal(await authenticateUser(email, "wrong-password", async () => ({
    id: account.id,
    email,
    passwordHash: account.passwordHash,
    role: account.role,
  })), null);
}
for (const account of demoAccounts) assert.equal(await ensureDemoAccount(created.store, account), "unchanged");

const existingHash = created.users.get("student@gmail.com")!.passwordHash;
const existingProfile = structuredClone(created.profiles[0]);
const incompleteStudent = memoryStore([{ id: 1, email: "student@gmail.com", role: "STUDENT", passwordHash: null, studentProfile: null }]);
assert.equal(await ensureDemoAccount(incompleteStudent.store, demoAccounts[0]), "completed");
const completedStudent = incompleteStudent.users.get("student@gmail.com")!;
assert.ok(await verifyPassword("student", completedStudent.passwordHash));
assert.ok(completedStudent.studentProfile);

const badHash = memoryStore([{ id: 3, email: "admin@gmail.com", role: "ADMIN", passwordHash: "invalid-hash", studentProfile: null }]);
assert.equal(await ensureDemoAccount(badHash.store, demoAccounts[1]), "completed");
const repairedAdmin = badHash.users.get("admin@gmail.com")!;
assert.equal(repairedAdmin.id, 3);
assert.equal(repairedAdmin.role, "ADMIN");
assert.equal(await verifyPassword("admin", repairedAdmin.passwordHash), true);
assert.equal(await ensureDemoAccount(badHash.store, demoAccounts[1]), "unchanged");

const mismatched = memoryStore([{ id: 2, email: "student@gmail.com", role: "ADMIN", passwordHash: null, studentProfile: null }]);
assert.equal(await ensureDemoAccount(mismatched.store, demoAccounts[0]), "role-mismatch");
assert.equal(mismatched.users.get("student@gmail.com")?.passwordHash, null);
assert.equal(mismatched.profiles.length, 0);
assert.ok(existingHash);
assert.equal(existingProfile.branch, "Computer Science");

console.log("Demo account seed behavior checks passed.");
