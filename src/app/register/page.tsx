
"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const form = new FormData(event.currentTarget);
      form.set("yearOfStudy", form.get("year") ?? "");

      const response = await fetch("/api/auth/register", {
        method: "POST",
        body: form,
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error ?? "Registration failed.");
        return;
      }

      setMessage(result.message ?? "Account created successfully.");
      event.currentTarget.reset();
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-lg px-6 py-12">
      <h1 className="text-3xl font-bold">Create your InPlace account</h1>
      <p className="mt-2 text-gray-600">
        Register as a student to get started.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <label className="block">
          <span className="mb-1 block">Full name</span>
          <input name="name" required maxLength={100} className="w-full rounded border p-3" />
        </label>

        <label className="block">
          <span className="mb-1 block">Email</span>
          <input name="email" type="email" required maxLength={255} className="w-full rounded border p-3" />
        </label>

        <label className="block">
          <span className="mb-1 block">Password</span>
          <input name="password" type="password" required minLength={8} maxLength={72} className="w-full rounded border p-3" />
        </label>

        <label className="block">
          <span className="mb-1 block">Branch</span>
          <input name="branch" required maxLength={100} className="w-full rounded border p-3" />
        </label>

        <label className="block">
          <span className="mb-1 block">CGPA (0–10)</span>
          <input name="cgpa" type="number" required min={0} max={10} step="any" className="w-full rounded border p-3" />
        </label>

        <label className="block">
          <span className="mb-1 block">Year of study</span>
          <select name="year" required defaultValue="" className="w-full rounded border p-3">
            <option value="" disabled>Select year</option>
            <option value="FIRST">First year</option>
            <option value="SECOND">Second year</option>
            <option value="THIRD">Third year</option>
            <option value="FOURTH">Fourth year</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block">Skills (comma-separated)</span>
          <input name="skills" placeholder="Python, SQL, React" className="w-full rounded border p-3" />
        </label>

        <label className="block">
          <span className="mb-1 block">Resume (PDF, optional)</span>
          <input name="resume" type="file" accept="application/pdf,.pdf" className="w-full rounded border p-3" />
        </label>

        {error && <p role="alert" className="text-red-600">{error}</p>}
        {message && <p role="status" className="text-green-700">{message}</p>}

        <button disabled={loading} className="w-full rounded bg-black p-3 text-white disabled:opacity-50">
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-sm">
        Already registered? <Link href="/login" className="underline">Sign in</Link>
      </p>
    </main>
  );
}
