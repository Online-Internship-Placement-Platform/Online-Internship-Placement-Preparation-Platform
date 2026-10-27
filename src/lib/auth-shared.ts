import type { Role } from "@/lib/placement-data";

export function getDashboardRoute(role: Role) {
  const routes: Record<Role, string> = {
    student: "/student/dashboard",
    admin: "/admin/dashboard",
    "super-admin": "/super-admin/dashboard",
  };
  return routes[role];
}
