
"use client";

import { useState } from "react";
import Link from "next/link";

export default function RequestAdminAccountPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusEmail, setStatusEmail] = useState("");
  const [requestStatus, setRequestStatus] = useState<"PENDING" | "APPROVED" | "REJECTED" | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusError, setStatusError] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);

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
      setStatusEmail(email.trim());
      setRequestStatus("PENDING");
      setStatusMessage("");
      setName("");
      setEmail("");
      setPassword("");
    } catch {
      setMessage("Could not connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function checkStatus(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCheckingStatus(true);
    setRequestStatus(null);
    setStatusMessage("");
    setStatusError(false);
    try {
      const response = await fetch(`/api/auth/account-requests?email=${encodeURIComponent(statusEmail.trim())}`, { cache: "no-store" });
      const data = await response.json() as { status?: "PENDING" | "APPROVED" | "REJECTED"; error?: string };
      if (!response.ok || !data.status) throw new Error(data.error ?? "Could not check request status.");
      setRequestStatus(data.status);
    } catch (error) {
      setStatusError(true);
      setStatusMessage(error instanceof Error ? error.message : "Could not check request status.");
    } finally {
      setCheckingStatus(false);
    }
  }

  async function resubmitRequest() {
    setCheckingStatus(true);
    setStatusMessage("");
    setStatusError(false);
    try {
      const response = await fetch("/api/auth/account-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: statusEmail.trim() }),
      });
      const data = await response.json() as { status?: "PENDING"; message?: string; error?: string };
      if (!response.ok || data.status !== "PENDING") throw new Error(data.error ?? "Could not resubmit request.");
      setRequestStatus(data.status);
      setStatusMessage(data.message ?? "Your request has been resubmitted for review.");
    } catch (error) {
      setStatusError(true);
      setStatusMessage(error instanceof Error ? error.message : "Could not resubmit request.");
    } finally {
      setCheckingStatus(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f6f2] px-6 py-12 text-[#17211b]">
      <section className="mx-auto max-w-xl">
        <h1 className="text-3xl font-bold">Request an Admin Account</h1>
        <p className="mt-3 text-gray-600">
          Submit your details for review by a super-admin.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-5 rounded-xl border border-[#e2e7e1] bg-white p-6"
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
              className="w-full rounded-lg border border-[#dfe5df] px-3 py-2.5 text-sm outline-none focus:border-[#176b50]"
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
              className="w-full rounded-lg border border-[#dfe5df] px-3 py-2.5 text-sm outline-none focus:border-[#176b50]"
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
              className="w-full rounded-lg border border-[#dfe5df] px-3 py-2.5 text-sm outline-none focus:border-[#176b50]"
              placeholder="At least 8 characters"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#176b50] px-4 py-3 text-sm font-semibold text-white hover:bg-[#12563f] disabled:opacity-60"
          >
            {loading ? "Submitting..." : "Submit Admin Request"}
          </button>

          {message && (
            <p role="status" aria-live="polite" className="text-sm">
              {message}
            </p>
          )}
        </form>

        <section className="mt-6 rounded-xl border border-[#e2e7e1] bg-white p-6">
          <h2 className="text-base font-semibold">Check request status</h2>
          <p className="mt-1 text-sm text-[#6e786f]">Enter the email address used when submitting your admin request.</p>
          <form onSubmit={checkStatus} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <label className="sr-only" htmlFor="status-email">Request email</label>
            <input
              id="status-email"
              type="email"
              required
              maxLength={255}
              value={statusEmail}
              onChange={(event) => { setStatusEmail(event.target.value); setRequestStatus(null); setStatusMessage(""); setStatusError(false); }}
              className="min-w-0 flex-1 rounded-lg border border-[#dfe5df] px-3 py-2.5 text-sm outline-none focus:border-[#176b50]"
              placeholder="you@example.com"
            />
            <button type="submit" disabled={checkingStatus} className="rounded-lg border border-[#b9d6c4] px-4 py-2.5 text-sm font-semibold text-[#176b50] hover:bg-[#f7faf7] disabled:opacity-60">
              {checkingStatus ? "Checking…" : "Check status"}
            </button>
          </form>
          {requestStatus && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#e2e7e1] bg-[#fafbf9] p-4">
              <div>
                <p className="text-xs font-medium text-[#7b857c]">Current status</p>
                <span className={`mt-1 inline-flex rounded-md px-2.5 py-1 text-xs font-bold ${requestStatus === "APPROVED" ? "bg-[#e6f2ec] text-[#176b50]" : requestStatus === "REJECTED" ? "bg-[#fcedeb] text-[#b94b48]" : "bg-[#fff4df] text-[#a86618]"}`}>
                  {requestStatus.charAt(0) + requestStatus.slice(1).toLowerCase()}
                </span>
              </div>
              {requestStatus === "REJECTED" && (
                <button type="button" disabled={checkingStatus} onClick={() => void resubmitRequest()} className="rounded-lg bg-[#176b50] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#12563f] disabled:opacity-60">
                  Resubmit request
                </button>
              )}
            </div>
          )}
          {statusMessage && <p role={statusError ? "alert" : "status"} aria-live="polite" className={`mt-3 text-sm ${statusError ? "text-[#b94b48]" : "text-[#176b50]"}`}>{statusMessage}</p>}
        </section>

        <p className="mt-5 text-sm text-[#6e786f]">
          Already have an account? <Link href="/login" className="font-semibold text-[#176b50] hover:underline">Sign in</Link>
        </p>
      </section>
    </main>
  );
}
