
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AppShell } from "@/components/app-shell";

type Profile = {
  name: string | null;
  email: string;
  branch: string | null;
  cgpa: number | null;
  yearOfStudy: "FIRST" | "SECOND" | "THIRD" | "FOURTH";
  skills: string[];
};

export default function ProfileView() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [skillsText, setSkillsText] = useState("");
  const [name, setName] = useState("");
  const [branch, setBranch] = useState("");
  const [cgpa, setCgpa] = useState("");
  const [yearOfStudy, setYearOfStudy] = useState("");
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<"success" | "error">("success");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch("/api/student/profile", { cache: "no-store" })
      .then(async (response) => {
        const result = (await response.json()) as {
          profile?: Profile;
          error?: string;
        };

        if (!response.ok || !result.profile) {
          throw new Error(result.error ?? "Profile is unavailable.");
        }

        setProfile(result.profile);
        setSkillsText(result.profile.skills.join(", "));
        setName(result.profile.name ?? "");
        setBranch(result.profile.branch ?? "");
        setCgpa(
          result.profile.cgpa === null ? "" : String(result.profile.cgpa),
        );
        setYearOfStudy(result.profile.yearOfStudy);
      })
      .catch((error: unknown) => {
        setMessageKind("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "Profile is unavailable.",
        );
      })
      .finally(() => setLoading(false));
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setMessageKind("success");

    try {
      const skills = skillsText
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean);

      const response = await fetch("/api/student/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          branch,
          cgpa: cgpa.trim() ? Number(cgpa) : null,
          yearOfStudy,
          skills,
        }),
      });

      const result = (await response.json()) as Partial<Profile> & {
        error?: string;
      };

      if (!response.ok || !result.skills) {
        throw new Error(result.error ?? "Profile could not be saved.");
      }

      setProfile((current) =>
        current
          ? {
              ...current,
              name: result.name ?? current.name,
              branch: result.branch ?? current.branch,
              cgpa: result.cgpa ?? current.cgpa,
              yearOfStudy:
                result.yearOfStudy ?? current.yearOfStudy,
              skills: result.skills!,
            }
          : current,
      );

      setSkillsText(result.skills.join(", "));
      setMessage("Profile saved.");
    } catch (error) {
      setMessageKind("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Profile could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteAccount() {
    const confirmed = window.confirm(
      "Permanently delete your student account and associated profile? This cannot be undone.",
    );

    if (!confirmed) return;

    setDeleting(true);
    setMessage("");
    setMessageKind("success");

    try {
      const response = await fetch("/api/auth/delete-account", {
        method: "DELETE",
      });

      const result = (await response.json()) as {
        error?: string;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(result.error ?? "Account deletion failed.");
      }

      // The deletion API clears the server session itself.
      // Redirect directly instead of requiring a second logout request.
      window.location.assign("/login");
    } catch (error) {
      setMessageKind("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Account deletion failed.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AppShell title="Student profile" eyebrow="Student workspace">
      <div className="max-w-2xl rounded-xl border border-[#e2e7e1] bg-white p-6">
        {loading ? (
          <p role="status" className="text-sm text-[#7b857c]">
            Loading profile…
          </p>
        ) : profile ? (
          <>
            <h2 className="text-sm font-bold">Profile details</h2>
            <p className="mt-1 text-xs text-[#7b857c]">
              Name, branch, CGPA, and academic year are required for student
              profiles.
            </p>

            <form onSubmit={save} className="mt-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Name"
                  value={name}
                  onChange={setName}
                  required
                />
                <Detail label="Email" value={profile.email} />
                <Field
                  label="Branch"
                  value={branch}
                  onChange={setBranch}
                  required
                />

                <label className="block text-xs font-medium text-[#526057]">
                  CGPA
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="any"
                    required
                    value={cgpa}
                    onChange={(event) => setCgpa(event.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-[#e2e7e1] px-3 py-2.5 text-sm text-[#17211b] outline-none focus:ring-2 focus:ring-[#176b50]"
                  />
                </label>

                <label className="block text-xs font-medium text-[#526057]">
                  Academic year
                  <select
                    required
                    value={yearOfStudy}
                    onChange={(event) => setYearOfStudy(event.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-[#e2e7e1] px-3 py-2.5 text-sm text-[#17211b] outline-none focus:ring-2 focus:ring-[#176b50]"
                  >
                    <option value="FIRST">Year 1</option>
                    <option value="SECOND">Year 2</option>
                    <option value="THIRD">Year 3</option>
                    <option value="FOURTH">Year 4</option>
                  </select>
                </label>
              </div>

              <label
                htmlFor="profile-skills"
                className="mt-5 block text-xs font-medium text-[#526057]"
              >
                Skills
              </label>
              <p className="mt-1 text-xs text-[#7b857c]">
                Separate skills with commas.
              </p>
              <input
                id="profile-skills"
                value={skillsText}
                onChange={(event) => setSkillsText(event.target.value)}
                className="mt-2 w-full rounded-lg border border-[#e2e7e1] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#176b50]"
              />

              <button
                type="submit"
                disabled={saving || deleting}
                className="mt-4 rounded-lg bg-[#176b50] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save profile"}
              </button>
            </form>
          </>
        ) : (
          <p role="alert" className="text-sm text-[#7b857c]">
            {message}
          </p>
        )}

        {message && profile && (
          <p
            role={messageKind === "error" ? "alert" : "status"}
            className={`mt-3 text-xs ${
              messageKind === "error"
                ? "text-[#b94b48]"
                : "text-[#176b50]"
            }`}
          >
            {message}
          </p>
        )}

        {!loading && profile && (
          <section className="mt-8 border-t border-red-200 pt-5">
            <h2 className="text-sm font-bold text-red-700">
              Delete account
            </h2>
            <p className="mt-1 text-xs text-[#7b857c]">
              Permanently delete your student account and associated profile.
              This action cannot be undone.
            </p>

            <button
              type="button"
              disabled={deleting || saving}
              onClick={() => void deleteAccount()}
              className="mt-3 rounded-lg border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-700 disabled:opacity-60"
            >
              {deleting ? "Deleting…" : "Delete my account"}
            </button>
          </section>
        )}
      </div>
    </AppShell>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div>
      <dt className="text-xs text-[#7b857c]">{label}</dt>
      <dd className="mt-1 text-sm font-medium">
        {value || "Not provided"}
      </dd>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required: boolean;
}) {
  return (
    <label className="block text-xs font-medium text-[#526057]">
      {label}
      <input
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 w-full rounded-lg border border-[#e2e7e1] px-3 py-2.5 text-sm text-[#17211b] outline-none focus:ring-2 focus:ring-[#176b50]"
      />
    </label>
  );
}
