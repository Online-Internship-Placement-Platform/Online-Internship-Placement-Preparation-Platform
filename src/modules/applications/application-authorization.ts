import type { Role } from "@/lib/placement-data";

export function isApplicationStudentRole(role: Role): boolean {
  return role === "student";
}

export function isApplicationAdminRole(role: Role): boolean {
  return role === "admin" || role === "super-admin";
}
