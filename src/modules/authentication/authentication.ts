import type { Role as DatabaseRole } from "../../../generated/prisma/client";
import type { Role as SessionRole } from "@/lib/placement-data";
import { verifyPassword } from "@/lib/password-hash";

export type LoginUser = {
  id: number;
  email: string;
  passwordHash: string | null;
  role: DatabaseRole;
};

export type LoginIdentity = { userId: number; email: string; role: SessionRole };

export function toSessionRole(role: DatabaseRole): SessionRole | null {
  switch (role) {
    case "STUDENT": return "student";
    case "ADMIN": return "admin";
    case "SUPER_ADMIN": return "super-admin";
    default: return null;
  }
}

/** Credentials with no stored hash are intentionally rejected. */
export async function authenticateUser(
  email: string,
  password: string,
  findUser: (normalizedEmail: string) => Promise<LoginUser | null>,
): Promise<LoginIdentity | null> {
  const user = await findUser(email.trim().toLowerCase());
  if (!user || !await verifyPassword(password, user.passwordHash)) return null;
  const role = toSessionRole(user.role);
  if (!role) return null;
  return { userId: user.id, email: user.email, role };
}
