
"use client";

import { useEffect, useState } from "react";

type AccountRequest = {
  id: number;
  name: string;
  email: string;
  createdAt: string;
};

export default function AccountRequestsPage() {
  const [requests, setRequests] = useState<AccountRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchRequests() {
      try {
        const response = await fetch("/api/admin/account-requests", {
          signal: controller.signal,
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Could not load requests.");
        }

        setRequests(data.requests);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;

        setMessage(
          error instanceof Error ? error.message : "Could not load requests."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void fetchRequests();

    return () => controller.abort();
  }, []);

  async function loadRequests() {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/account-requests");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Could not load requests.");
      }

      setRequests(data.requests);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not load requests."
      );
    } finally {
      setLoading(false);
    }
  }

  async function decide(id: number, decision: "approve" | "reject") {
    setBusyId(id);
    setMessage("");

    try {
      const response = await fetch(
        `/api/admin/account-requests/${id}/${decision}`,
        { method: "POST" }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Action failed.");
      }

      setMessage(data.message ?? "Request processed successfully.");
      await loadRequests();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action failed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl p-6">
      <h1 className="text-2xl font-semibold">Admin Account Requests</h1>
      <p className="mt-2 text-sm text-gray-600">
        Review and approve or reject requests to create administrator accounts.
      </p>

      {message && (
        <p role="status" className="my-4 text-sm">
          {message}
        </p>
      )}

      {loading ? (
        <p className="mt-6">Loading requests…</p>
      ) : requests.length === 0 ? (
        <p className="mt-6">No pending admin account requests.</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {requests.map((request) => (
            <li key={request.id} className="rounded-lg border p-4">
              <p className="font-medium">{request.name}</p>
              <p className="text-sm text-gray-600">{request.email}</p>
              <p className="mt-1 text-xs text-gray-500">
                Requested {new Date(request.createdAt).toLocaleString()}
              </p>

              <div className="mt-4 flex gap-3">
                <button
                  className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
                  disabled={busyId !== null}
                  onClick={() => void decide(request.id, "approve")}
                >
                  {busyId === request.id ? "Processing…" : "Approve"}
                </button>

                <button
                  className="rounded border px-4 py-2 disabled:opacity-50"
                  disabled={busyId !== null}
                  onClick={() => void decide(request.id, "reject")}
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
