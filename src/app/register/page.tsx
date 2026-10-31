
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

  const inputClassName = "h-11 w-full rounded-lg border border-[#dfe5df] bg-[#fafbf9] px-3 text-sm text-[#17211b] outline-none transition focus:border-[#176b50] focus:ring-2 focus:ring-[#176b50]/15";
  const labelClassName = "mb-1.5 block text-xs font-semibold text-[#526057]";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f6f2] px-4 py-8 sm:px-6 sm:py-10">
      <div className="w-full max-w-[560px]">
        <header className="mb-6 text-center sm:mb-7">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#176b50] text-lg font-bold text-white shadow-sm">
            IP
          </div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#89948b]">
            Student registration
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-[#17211b] sm:text-[28px]">
            Create your InPlace account
          </h1>
          <p className="mt-2 text-sm text-[#7b857c]">
            Register as a student to get started.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-[#e2e7e1] bg-white p-5 shadow-xl shadow-black/5 sm:p-7"
        >
          <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2 sm:gap-y-5">
            <label className="block sm:col-span-2">
              <span className={labelClassName}>Full name</span>
              <input name="name" required maxLength={100} autoComplete="name" placeholder="Your full name" className={inputClassName} />
            </label>

            <label className="block sm:col-span-2">
              <span className={labelClassName}>Email</span>
              <input name="email" type="email" required maxLength={255} autoComplete="email" placeholder="you@example.com" className={inputClassName} />
            </label>

            <label className="block sm:col-span-2">
              <span className={labelClassName}>Password</span>
              <input name="password" type="password" required minLength={8} maxLength={72} autoComplete="new-password" placeholder="Create a password" className={inputClassName} />
            </label>

            <label className="block">
              <span className={labelClassName}>Branch</span>
              <input name="branch" required maxLength={100} placeholder="e.g. Computer Science" className={inputClassName} />
            </label>

            <label className="block">
              <span className={labelClassName}>CGPA (0–10)</span>
              <input name="cgpa" type="number" required min={0} max={10} step="any" placeholder="e.g. 8.5" className={inputClassName} />
            </label>

            <label className="block">
              <span className={labelClassName}>Year of study</span>
              <select name="year" required defaultValue="" className={inputClassName}>
                <option value="" disabled>Select year</option>
                <option value="FIRST">First year</option>
                <option value="SECOND">Second year</option>
                <option value="THIRD">Third year</option>
                <option value="FOURTH">Fourth year</option>
              </select>
            </label>

            <label className="block">
              <span className={labelClassName}>Skills (comma-separated)</span>
              <input name="skills" placeholder="Python, SQL, React" className={inputClassName} />
            </label>

            <label className="block sm:col-span-2">
              <span className={labelClassName}>Resume (PDF, optional)</span>
              <input
                name="resume"
                type="file"
                accept="application/pdf,.pdf"
                className="block min-h-11 w-full cursor-pointer rounded-lg border border-[#dfe5df] bg-[#fafbf9] text-sm text-[#526057] file:mr-3 file:h-10 file:border-0 file:border-r file:border-[#dfe5df] file:bg-[#f1f4f0] file:px-3 file:text-xs file:font-semibold file:text-[#526057] hover:file:bg-[#e6f2ec] focus:outline-none focus:ring-2 focus:ring-[#176b50]/20"
              />
            </label>
          </div>

          {error && <p role="alert" className="mt-5 rounded-lg bg-[#fcedeb] px-3 py-2.5 text-xs font-medium text-[#b94b48]">{error}</p>}
          {message && <p role="status" className="mt-5 rounded-lg bg-[#e6f2ec] px-3 py-2.5 text-xs font-medium text-[#176b50]">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 h-11 w-full rounded-lg bg-[#176b50] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#12563f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176b50] disabled:cursor-wait disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>

          <p className="mt-5 border-t border-[#edf0ec] pt-5 text-center text-sm text-[#6e786f]">
            Already registered?{" "}
            <Link href="/login" className="font-semibold text-[#176b50] hover:text-[#12563f] hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
