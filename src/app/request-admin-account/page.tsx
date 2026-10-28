
"use client";

import { useState } from "react";
import Link from "next/link";

export default function RequestAdminAccountPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/account-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || data.error || "Request failed. Please try again.");
        return;
      }

      setMessage("Admin account request submitted successfully! Await super-admin approval.");
      setName("");
      setEmail("");
      setPassword("");
    } catch {
      setMessage("Could not connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f6f2] px-6 py-12 text-gray-900">
      <section className="mx-auto max-w-xl">
        <h1 className="text-3xl font-bold">Request an Admin Account</h1>
        <p className="mt-3 text-gray-600">
          Submit your details for review by a super-admin.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <div>
            <label htmlFor="name" className="mb-2 block font-medium">
              Full name
            </label>
            <input
              id="name"
              required
              maxLength={150}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-lg border border-gray-300 p-3"
              placeholder="Test Admin Alpha"
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-2 block font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-gray-300 p-3"
              placeholder="test.admin.alpha.oct27@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              maxLength={72}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-gray-300 p-3"
              placeholder="At least 8 characters"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-emerald-800 p-3 font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Submitting..." : "Submit Admin Request"}
          </button>

          {message && (
            <p role="status" aria-live="polite" className="text-sm">
              {message}
            </p>
          )}
        </form>

        <p className="mt-5 text-sm text-gray-600">
          Already have an account? <Link href="/login" className="underline">Sign in</Link>
        </p>
      </section>
    </main>
  );
}
