
import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, verifySession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function requireRole(
  request: NextRequest,
  allowedRoles: ("student" | "admin" | "super-admin")[],
) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) {
    return {
      session: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  // Read the current role from the database, not just the signed token.
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, role: true },
  });

  const roleMap = {
    STUDENT: "student",
    ADMIN: "admin",
    SUPER_ADMIN: "super-admin",
  } as const;

  if (!user || !allowedRoles.includes(roleMap[user.role])) {
    return {
      session: null,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return {
    session: { userId: user.id, email: user.email, role: roleMap[user.role] },
    response: null,
  };
}
