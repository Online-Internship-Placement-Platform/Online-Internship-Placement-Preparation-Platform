import type { Role } from "../../../generated/prisma/client";
import { hashPassword, verifyPassword } from "@/lib/password-hash";

export type DemoStudentProfile = {
  branch: string;
  cgpa: number;
  yearOfStudy: "FIRST" | "SECOND" | "THIRD" | "FOURTH";
  skills: string[];
};

export type DemoAccount = {
  email: string;
  name: string;
  password: string;
  role: Role;
  studentProfile?: DemoStudentProfile;
};

export type ExistingDemoUser = {
  id: number;
  role: Role;
  passwordHash: string | null;
  studentProfile: { id: number } | null;
};

export type DemoAccountStore = {
  findByEmail(email: string): Promise<ExistingDemoUser | null>;
  createAccount(data: {
    email: string;
    name: string;
    role: Role;
    passwordHash: string;
    studentProfile?: DemoStudentProfile;
  }): Promise<void>;
  updatePasswordHash(
    id: number,
    passwordHash: string,
    role: Role,
    previousPasswordHash: string | null,
  ): Promise<void>;
  createStudentProfile(userId: number, profile: DemoStudentProfile): Promise<void>;
};

export type DemoAccountSeedResult = "created" | "completed" | "unchanged" | "role-mismatch";

/** Creates a demo account or fills only missing demo authentication/profile data. */
export async function ensureDemoAccount(
  store: DemoAccountStore,
  account: DemoAccount,
): Promise<DemoAccountSeedResult> {
  const existing = await store.findByEmail(account.email);
  if (!existing) {
    await store.createAccount({
      email: account.email,
      name: account.name,
      role: account.role,
      passwordHash: await hashPassword(account.password),
      ...(account.studentProfile ? { studentProfile: account.studentProfile } : {}),
    });
    return "created";
  }

  // A matching email with another role may belong to a real account. Leave it
  // entirely unchanged rather than escalating or reclassifying that account.
  if (existing.role !== account.role) return "role-mismatch";

  let changed = false;
  const passwordMatches = await verifyPassword(account.password, existing.passwordHash);
  if (!passwordMatches) {
    await store.updatePasswordHash(
      existing.id,
      await hashPassword(account.password),
      account.role,
      existing.passwordHash,
    );
    changed = true;
  }
  if (account.studentProfile && !existing.studentProfile) {
    await store.createStudentProfile(existing.id, account.studentProfile);
    changed = true;
  }
  return changed ? "completed" : "unchanged";
}

export const demoAccounts: DemoAccount[] = [
  {
    email: "student@gmail.com",
    name: "Demo Student",
    password: "student",
    role: "STUDENT",
    studentProfile: {
      branch: "Computer Science",
      cgpa: 8.6,
      yearOfStudy: "THIRD",
      skills: ["React", "TypeScript", "SQL", "Figma"],
    },
  },
  { email: "admin@gmail.com", name: "Demo Admin", password: "admin", role: "ADMIN" },
  { email: "superadmin@gmail.com", name: "Demo Super Admin", password: "superadmin", role: "SUPER_ADMIN" },
];
