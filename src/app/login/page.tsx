
"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Enter your email and password to continue.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "The email or password is incorrect.");
        return;
      }

      if (typeof data.route !== "string") {
        setError("Unable to determine your dashboard.");
        return;
      }

      router.replace(data.route);
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setLoading(false);
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

          <label htmlFor="password" className="mb-2 block text-xs font-semibold">
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
            disabled={loading}
            className="mt-6 w-full rounded-lg bg-[#176b50] px-4 py-3 text-sm font-semibold text-white hover:bg-[#12563f] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>

          <div className="mt-5 space-y-3 text-center text-sm">
            <p className="text-[#7b857c]">
              New to InPlace?{" "}
              <Link
                href="/register"
                className="font-semibold text-[#176b50] hover:underline"
              >
                Create account
              </Link>
            </p>

            <p>
              <Link
                href="/account-status"
                className="font-semibold text-[#176b50] hover:underline"
              >
                Applied for an admin account? Check status
              </Link>
            </p>
          </div>
        </form>
      </div>
    </main>
  );
}
