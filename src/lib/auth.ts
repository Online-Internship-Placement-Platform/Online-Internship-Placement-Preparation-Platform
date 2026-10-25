
import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@/lib/placement-data";

export const AUTH_COOKIE = "inplace-session";

const secretValue = process.env.SESSION_SECRET;

const secret = new TextEncoder().encode(
  secretValue || "development-only-secret-change-before-production-32"
);

export type SessionPayload = {
  userId: number;
  email: string;
  role: Role;
};

export async function createSession(payload: SessionPayload) {
  return new SignJWT({
    email: payload.email,
    role: payload.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(payload.userId))
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret);
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    const userId = Number(payload.sub);

    if (
      !Number.isInteger(userId) ||
      userId <= 0 ||
      typeof payload.email !== "string" ||
      !["student", "admin", "super-admin"].includes(String(payload.role))
    ) {
      return null;
    }

    return {
      userId,
      email: payload.email,
      role: payload.role as Role,
    };
  } catch {
    return null;
  }
}

export function getDashboardRoute(role: Role) {
  switch (role) {
    case "student":
      return "/student/dashboard";
    case "admin":
      return "/admin/dashboard";
    case "super-admin":
      return "/super-admin/dashboard";
    default:
      return "/login";
  }
}
