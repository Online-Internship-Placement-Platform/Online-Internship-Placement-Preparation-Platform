import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { Role } from "@/lib/placement-data";

const SESSION_COOKIE = "inplace-server-session";
const SESSION_DURATION_SECONDS = 60 * 60 * 8;

function getSessionSecret() {
  const secret = process.env.AUTH_SESSION_SECRET;
  return secret &&
    secret.length >= 32 &&
    !secret.includes("replace-with-a-random-secret")
    ? secret
    : null;
}

export function isServerAuthConfigured() {
  return getSessionSecret() !== null;
}

function signSession(role: Role, email: string, expiresAt: number, secret: string) {
  return createHmac("sha256", secret)
    .update(`${role}.${email}.${expiresAt}`)
    .digest("base64url");
}

export async function createRoleSession(role: Role, email: string) {
  const secret = getSessionSecret();
  if (!secret) {
    throw new Error("AUTH_SESSION_SECRET must contain at least 32 characters.");
  }

  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS;
  const value = `${role}.${email}.${expiresAt}.${signSession(role, email, expiresAt, secret)}`;
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function clearRoleSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

type SessionPayload = { role: Role; email: string };

export async function getServerSession(): Promise<SessionPayload | null> {
  const secret = getSessionSecret();
  if (!secret) return null;

  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!value) return null;

  // Format: role.email.expiresAt.signature
  // email may contain dots so we split from the end: last part is signature,
  // second-to-last is expiresAt, third-to-last is reconstructed as email,
  // first part is role.
  const parts = value.split(".");
  if (parts.length < 4) return null;

  const signature = parts[parts.length - 1];
  const expiresAtText = parts[parts.length - 2];
  const role = parts[0];
  // email is everything between role and expiresAt (may contain dots)
  const email = parts.slice(1, parts.length - 2).join(".");

  if (!signature || !email) return null;
  if (role !== "student" && role !== "admin" && role !== "super-admin") return null;

  const expiresAt = Number(expiresAtText);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) {
    return null;
  }

  const expected = Buffer.from(signSession(role, email, expiresAt, secret));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return null;
  }

  return { role, email };
}

export async function getServerRole(): Promise<Role | null> {
  const session = await getServerSession();
  return session?.role ?? null;
}

export async function getServerEmail(): Promise<string | null> {
  const session = await getServerSession();
  return session?.email ?? null;
}
