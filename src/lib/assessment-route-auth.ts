import "server-only";

import { redirect } from "next/navigation";
import type { Role } from "@/lib/placement-data";
import { getServerRole, isServerAuthConfigured } from "@/lib/server-auth";

export async function requireAssessmentRole(allowedRoles: readonly Role[]) {
  if (!isServerAuthConfigured()) redirect("/login");

  const role = await getServerRole();
  if (!role || !allowedRoles.includes(role)) redirect("/login");

  return role;
}
