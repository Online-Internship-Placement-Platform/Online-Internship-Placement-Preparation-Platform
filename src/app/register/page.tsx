
"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

type AccountType = "student" | "admin" | "super-admin";

const branches = [
  "Computer Science",
  "Information Technology",
  "Statistics",
  "Electronics and Communication",
  "Mechanical Engineering",
  "Other",
];

export default function RegisterPage() {
  const [accountType, setAccountType] = useState<AccountType>("student");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [branch, setBranch] = useState("");
  const [cgpa, setCgpa] = useState("");
  const [year, setYear] = useState("");
  const [skills, setSkills] = useState("");
  const [resume, setResume] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

   
async function submit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  setError("");
  setMessage("");

  if (!name.trim() || !email.trim() || !password) {
    setError("Please complete your name, email and password.");
    return;
  }

  if (password.length < 8) {
    setError("Password must contain at least 8 characters.");
    return;
  }

  if (accountType === "super-admin") {
    setError("Super-admin accounts cannot be created through public registration.");
    return;
  }

  if (accountType === "student") {
    const grade = Number(cgpa);
    const studyYear = Number(year);

    if (
      !branch ||
      !year ||
      cgpa === "" ||
      !Number.isFinite(grade) ||
      grade < 0 ||
      grade > 10 ||
      !Number.isInteger(studyYear) ||
      studyYear < 1 ||
      studyYear > 5
    ) {
      setError("Enter a valid branch, year of study and CGPA between 0 and 10.");
      return;
    }

    if (resume && resume.size > 5 * 1024 * 1024) {
      setError("Resume must be no larger than 5 MB.");
      return;
    }

    if (
      resume &&
      (resume.type !== "application/pdf" ||
        !resume.name.toLowerCase().endsWith(".pdf"))
    ) {
      setError("Resume must be a PDF file.");
      return;
    }
  }

  setMessage("Submitting registration...");

  try {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        password,
        accountType,
        branch,
        cgpa,
        year,
        skills,
      }),
    });

    const result = (await response.json()) as {
      message?: string;
      error?: string;
    };

    if (!response.ok) {
      setMessage("");
      setError(result.error ?? "Registration failed.");
      return;
    }

    setMessage(result.message ?? "Registration submitted successfully.");
    setPassword("");
  } catch {
    setMessage("");
    setError("Unable to reach the server. Please try again.");
  }
}


  const inputClass =
    "w-full rounded-lg border border-[#dce3dc] px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-[#176b50]";

  return (
    <main className="min-h-screen bg-[#f5f6f2] px-5 py-12">
      <div className="mx-auto max-w-xl">
        <header className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#176b50] font-bold text-white">
            IP
          </div>
          <h1 className="text-2xl font-semibold">Create an account</h1>
          <p className="mt-2 text-sm text-[#7b857c]">
            Join the InPlace placement preparation portal
          </p>
        </header>

        <form
          onSubmit={submit}
          className="space-y-5 rounded-2xl border border-[#e2e7e1] bg-white p-6 shadow-xl shadow-black/10"
        >
          <div>
            <label
              htmlFor="accountType"
              className="mb-2 block text-sm font-semibold"
            >
              Account type
            </label>
            <select
              id="accountType"
              value={accountType}
              onChange={(event) => {
                setAccountType(event.target.value as AccountType);
                setError("");
                setMessage("");
              }}
              className={inputClass}
            >
              <option value="student">Student</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div>
            <label htmlFor="name" className="mb-2 block text-sm font-semibold">
              Full name
            </label>
            <input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              autoComplete="name"
              className={inputClass}
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-semibold">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              className={inputClass}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-semibold"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className={inputClass}
              placeholder="At least 8 characters"
            />
          </div>

          {accountType === "student" && (
            <>
              <div>
                <label
                  htmlFor="branch"
                  className="mb-2 block text-sm font-semibold"
                >
                  Branch
                </label>
                <select
                  id="branch"
                  value={branch}
                  onChange={(event) => setBranch(event.target.value)}
                  required
                  className={inputClass}
                >
                  <option value="">Select your branch</option>
                  {branches.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="cgpa"
                  className="mb-2 block text-sm font-semibold"
                >
                  CGPA (0–10)
                </label>
                <input
                  id="cgpa"
                  type="number"
                  min="0"
                  max="10"
                  step="0.01"
                  value={cgpa}
                  onChange={(event) => setCgpa(event.target.value)}
                  required
                  className={inputClass}
                  placeholder="e.g. 8.5"
                />
              </div>

              <div>
                <label
                  htmlFor="year"
                  className="mb-2 block text-sm font-semibold"
                >
                  Year of study
                </label>
                <select
                  id="year"
                  value={year}
                  onChange={(event) => setYear(event.target.value)}
                  required
                  className={inputClass}
                >
                  <option value="">Select year</option>
                  <option value="1">1st year</option>
                  <option value="2">2nd year</option>
                  <option value="3">3rd year</option>
                  <option value="4">4th year</option>                  
                </select>
              </div>

              <div>
                <label
                  htmlFor="skills"
                  className="mb-2 block text-sm font-semibold"
                >
                  Skills
                </label>
                <input
                  id="skills"
                  value={skills}
                  onChange={(event) => setSkills(event.target.value)}
                  className={inputClass}
                  placeholder="Python, SQL, React (comma-separated)"
                />
                <p className="mt-1 text-xs text-[#7b857c]">
                  Enter your skills separated by commas.
                </p>
              </div>

              <div>
                <label
                  htmlFor="resume"
                  className="mb-2 block text-sm font-semibold"
                >
                  Resume (optional PDF, max 5 MB)
                </label>
                <input
                  id="resume"
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(event) =>
                    setResume(event.target.files?.[0] ?? null)
                  }
                  className={`${inputClass} file:mr-3 file:rounded-md file:border-0 file:bg-[#edf5ef] file:px-3 file:py-2`}
                />
              </div>
            </>
          )}

          {error && (
            <p
              role="alert"
              className="rounded-lg bg-[#fcedeb] px-3 py-2 text-sm text-[#b94b48]"
            >
              {error}
            </p>
          )}

          {message && (
            <p
              role="status"
              className="rounded-lg bg-[#edf7f0] px-3 py-2 text-sm text-[#176b50]"
            >
              {message}
            </p>
          )}

          <button
            type="submit"
            className="w-full rounded-lg bg-[#176b50] px-4 py-3 text-sm font-semibold text-white hover:bg-[#12563f]"
          >
            {accountType === "student"
              ? "Create student account"
              : "Submit approval request"}
          </button>

          <p className="text-center text-sm text-[#7b857c]">
            Already registered?{" "}
            <Link
              href="/login"
              className="font-semibold text-[#176b50] hover:underline"
            >
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
