"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteAccountButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleDelete() {
    const confirmed = window.confirm(
      "Are you sure you want to permanently delete your account? This action cannot be undone.",
    );

    if (!confirmed) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/delete-account", {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Unable to delete your account.");
        return;
      }

      router.replace("/login");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-8 rounded-xl border border-red-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-red-700">Danger zone</h2>
      <p className="mt-2 text-sm text-gray-600">
        Permanently delete your account and its associated data.
      </p>

      <button
        type="button"
        onClick={handleDelete}
        disabled={loading}
        className="mt-4 rounded-lg border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Deleting..." : "Delete My Account"}
      </button>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}
    </section>
  );
}
