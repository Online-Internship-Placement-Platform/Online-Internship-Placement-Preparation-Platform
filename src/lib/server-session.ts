import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { toSessionRole } from "@/modules/authentication/authentication";
import type { Role } from "@/lib/placement-data";

const COOKIE_NAME = "inplace-server-session";
const SESSION_LIFETIME_SECONDS = 60 * 60 * 24 * 7;
const LEGACY_SESSION_LIFETIME_SECONDS = 60 * 60 * 8;

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

function legacySessionSecret() {
  const secret = process.env.AUTH_SESSION_SECRET;
  return secret && secret.length >= 32 && !secret.includes("replace-with-a-random-secret") ? secret : null;
}

function signLegacySession(role: string, email: string, expiresAt: number, secret: string) {
  return createHmac("sha256", secret).update(`${role}.${email}.${expiresAt}`).digest("base64url");
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

  // Older sign-in actions issued role.email.expiresAt.signature cookies. Accept
  // those only when their signature is valid and the current database role
  // still matches, so every API can use this one session reader safely.
  const legacySecret = legacySessionSecret();
  if (legacySecret) {
    const parts = token.split(".");
    if (parts.length >= 4) {
      await connection();
      const role = parts[0];
      const email = parts.slice(1, -2).join(".");
      const expiresAt = Number(parts.at(-2));
      const signature = parts.at(-1);
      if (
        (role === "student" || role === "admin" || role === "super-admin") && email &&
        Number.isSafeInteger(expiresAt) && expiresAt > Math.floor(Date.now() / 1000) &&
        expiresAt <= Math.floor(Date.now() / 1000) + LEGACY_SESSION_LIFETIME_SECONDS && signature
      ) {
        const expected = Buffer.from(signLegacySession(role, email, expiresAt, legacySecret));
        const received = Buffer.from(signature);
        if (expected.length === received.length && timingSafeEqual(expected, received)) {
          try {
            const user = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } });
            const currentRole = user ? toSessionRole(user.role) : null;
            if (user && currentRole === role) return { userId: user.id, role: currentRole };
          } catch {
            return null;
          }
        }
      }
    }
  }

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
    // Session expiry is time-dependent. Defer validation until request time so
    // Cache Components never evaluate Date.now() while prerendering a page.
    await connection();
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
