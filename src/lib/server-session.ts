import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { toSessionRole } from "@/modules/authentication/authentication";
import type { Role } from "@/lib/placement-data";

const COOKIE_NAME = "inplace-server-session";
const SESSION_LIFETIME_SECONDS = 60 * 60 * 24 * 7;

export type ServerSession = { userId: number; role: Role };

function sessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be configured with at least 32 characters.");
  }
  return secret;
}

function sign(value: string) {
  return createHmac("sha256", sessionSecret()).update(value).digest("base64url");
}

export async function setServerSession(session: ServerSession) {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_LIFETIME_SECONDS;
  const value = Buffer.from(JSON.stringify({ ...session, expiresAt })).toString("base64url");
  const token = `${value}.${sign(value)}`;
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_LIFETIME_SECONDS,
  });
}

export async function clearServerSession() {
  (await cookies()).delete(COOKIE_NAME);
}

export async function getServerSession(): Promise<ServerSession | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const [value, signature, extra] = token.split(".");
  if (!value || !signature || extra) return null;

  let expected: string;
  try {
    expected = sign(value);
  } catch {
    return null;
  }
  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (receivedBuffer.length !== expectedBuffer.length || !timingSafeEqual(receivedBuffer, expectedBuffer)) return null;

  try {
    const payload: unknown = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (typeof payload !== "object" || payload === null) return null;
    const record = payload as Record<string, unknown>;
    if (
      !Number.isInteger(record.userId) || (record.userId as number) <= 0 ||
      (record.role !== "student" && record.role !== "admin" && record.role !== "super-admin") ||
      typeof record.expiresAt !== "number" ||
      record.expiresAt <= Math.floor(Date.now() / 1000)
    ) return null;

    try {
      const user = await prisma.user.findUnique({ where: { id: record.userId as number }, select: { role: true } });
      const role = user ? toSessionRole(user.role) : null;
      if (!role) return null;
      return { userId: record.userId as number, role };
    } catch (error) {
      const errorCode = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "unknown";
      console.error("Session account lookup failed.", { errorCode });
      return null;
    }
  } catch {
    return null;
  }
}
