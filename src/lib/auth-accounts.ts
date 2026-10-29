import "server-only";

import type { Role } from "@/lib/placement-data";

type AuthAccount = {
  email: string;
  password: string;
  role: Role;
};

const demoAccounts: AuthAccount[] = [
  { email: "student@gmail.com", password: "student", role: "student" },
  { email: "admin@gmail.com", password: "admin", role: "admin" },
  { email: "superadmin@gmail.com", password: "superadmin", role: "super-admin" },
];

export function getDemoAccount(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  return demoAccounts.find(
    (account) => account.email === normalizedEmail && account.password === password,
  );
}
