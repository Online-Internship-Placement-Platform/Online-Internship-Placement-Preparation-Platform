import type { Role } from "@/lib/placement-data";

export const AUTH_STORAGE_KEY = "inplace-auth-session";

const dashboardRoutes: Record<Role, string> = {
  student: "/student/dashboard",
  admin: "/admin/dashboard",
  "super-admin": "/super-admin/dashboard",
};

export function isRole(value: string | null): value is Role {
  return value === "student" || value === "admin" || value === "super-admin";
}

export function getDashboardRoute(role: Role) {
  return dashboardRoutes[role];
}
