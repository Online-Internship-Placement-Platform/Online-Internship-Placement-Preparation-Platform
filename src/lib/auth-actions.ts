"use server";

import type { Role } from "@/lib/placement-data";
import { getDemoAccount } from "@/lib/auth-accounts";
import {
  clearRoleSession,
  createRoleSession,
  getServerRole,
  isServerAuthConfigured,
} from "@/lib/server-auth";

export type SignInResult =
  | { success: true; role: Role }
  | { success: false; error: string };

export async function signIn(email: string, password: string): Promise<SignInResult> {
  if (!email.trim() || !password) {
    return { success: false, error: "Enter your email and password to continue." };
  }

  if (!isServerAuthConfigured()) {
    return {
      success: false,
      error: "Server authentication is not configured. Set AUTH_SESSION_SECRET to a random value with at least 32 characters.",
    };
  }

  const account = getDemoAccount(email, password);
  if (!account) {
    return { success: false, error: "The email or password is incorrect." };
  }

  await createRoleSession(account.role, account.email);
  return { success: true, role: account.role };
}

export async function getSignedInRole() {
  return getServerRole();
}

export async function signOut() {
  await clearRoleSession();
}
