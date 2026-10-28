
"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Role } from "@/lib/placement-data";
import { getDashboardRoute } from "@/lib/auth-shared";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function redirectIfAuthenticated() {
      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
        });
        if (!response.ok) return;

        const data = (await response.json()) as {
          user?: { role?: unknown };
        };
        const role = data.user?.role;

        if (
          !cancelled &&
          (role === "student" ||
            role === "admin" ||
            role === "super-admin")
        ) {
          router.replace(getDashboardRoute(role as Role));
        }
      } catch {
        // Keep the sign-in form available if session validation is unavailable.
      }
    }

    void redirectIfAuthenticated();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim() || !password) {
      setError("Enter your email and password to continue.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const result = (await response.json()) as {
        error?: string;
        route?: string;
      };

      if (!response.ok || typeof result.route !== "string") {
        setError(result.error ?? "Sign in failed. Please try again.");
        return;
      }

      router.replace(result.route);
    } catch {
      setError("Sign in is temporarily unavailable. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f6f2] px-6 py-12">
      <div className="w-full max-w-[420px]">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#176b50] text-lg font-bold text-white">
            IP
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome to InPlace
          </h1>
          <p className="mt-2 text-sm text-[#7b857c]">
            Sign in to your placement workspace
          </p>
        </div>

        <form
          onSubmit={submit}
          className="rounded-2xl border border-[#e2e7e1] bg-white p-6 shadow-xl shadow-black/10"
          noValidate
        >
          <label htmlFor="email" className="mb-2 block text-xs font-semibold">
            Email
          </label>
          <input
            id="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setError("");
            }}
            type="email"
            autoComplete="email"
            required
            className="mb-5 w-full rounded-lg border px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-[#176b50]"
            placeholder="you@example.com"
          />

          <label
            htmlFor="password"
            className="mb-2 block text-xs font-semibold"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError("");
              }}
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              className="w-full rounded-lg border px-3 py-3 pr-20 text-sm outline-none focus:ring-2 focus:ring-[#176b50]"
              placeholder="Enter password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#176b50]"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          {error && (
            <p
              role="alert"
              className="mt-4 rounded-lg bg-[#fcedeb] px-3 py-2 text-xs font-medium text-[#b94b48]"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 w-full rounded-lg bg-[#176b50] px-4 py-3 text-sm font-semibold text-white hover:bg-[#12563f] disabled:cursor-wait disabled:opacity-70"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>

          <div className="mt-5 border-t border-[#e8ece7] pt-5 text-center text-sm">
            <p className="text-[#69746b]">
              New student?{" "}
              <Link
                href="/register"
                className="font-semibold text-[#176b50] hover:underline"
              >
                Create an account
              </Link>
            </p>

            <p className="mt-3 text-[#69746b]">
              Need an admin account?{" "}
              <Link
                href="/request-admin-account"
                className="font-semibold text-[#176b50] hover:underline"
              >
                Request access
              </Link>
            </p>
          </div>
        </form>

        <div className="mt-5 text-center text-sm">
          <Link
            href="/super-admin/account-requests"
            className="font-medium text-[#69746b] hover:text-[#176b50] hover:underline"
          >
            Super Admin portal
          </Link>
          <p className="mt-1 text-xs text-[#899189]">
            Authorized super-admins only
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-[#899189]">
          InPlace · Internship and Placement Preparation
        </p>
      </div>
    </main>
  );
}
