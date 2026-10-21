import "server-only";
import type { Role } from "@/lib/placement-data";

export type AuthAccount = { email: string; password: string; role: Role; route: string };

export const authAccounts: AuthAccount[] = [
  { email: "student@gmail.com", password: "student", role: "student", route: "/student/dashboard" },
  { email: "admin@gmail.com", password: "admin", role: "admin", route: "/admin/dashboard" },
  { email: "superadmin@gmail.com", password: "superadmin", role: "super-admin", route: "/super-admin/dashboard" },
];

export function getAccount(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  return authAccounts.find((account) => account.email === normalizedEmail && account.password === password);
}

