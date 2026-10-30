"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";

type AccountRequest = {
  id: number;
  name: string;
  email: string;
  createdAt: string;
};

type Feedback = { kind: "success" | "error"; message: string } | null;

export default function AccountRequestsView() {
  const [requests, setRequests] = useState<AccountRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const loadRequests = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch("/api/admin/account-requests", {
        cache: "no-store",
        ...(signal ? { signal } : {}),
      });
      const data = await response.json() as { requests?: AccountRequest[]; error?: string };
      if (!response.ok || !Array.isArray(data.requests)) {
        throw new Error(data.error ?? "Could not load pending requests.");
      }
      if (!signal?.aborted) setRequests(data.requests);
    } catch (error) {
      if (signal?.aborted) return;
      setLoadError(error instanceof Error ? error.message : "Could not load pending requests.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => loadRequests(controller.signal));
    return () => controller.abort();
  }, [loadRequests]);

  async function decide(id: number, decision: "approve" | "reject") {
    setBusyId(id);
    setFeedback(null);

    try {
      const response = await fetch(`/api/admin/account-requests/${id}/${decision}`, { method: "POST" });
      const data = await response.json() as { message?: string; error?: string };
      if (!response.ok) throw new Error(data.error ?? "The request could not be processed.");

      setFeedback({ kind: "success", message: data.message ?? `Request ${decision === "approve" ? "approved" : "rejected"}.` });
      setLoading(true);
      await loadRequests();
    } catch (error) {
      setFeedback({ kind: "error", message: error instanceof Error ? error.message : "The request could not be processed." });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AppShell role="super-admin" title="Admin account requests" eyebrow="Administration">
      <div className="mx-auto w-full max-w-5xl space-y-5">
        <section className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-[#e2e7e1] bg-white p-5 md:p-6">
          <div>
            <p className="text-sm text-[#6e786f]">Review requests for administrator access and decide who can join the platform.</p>
            <p className="mt-1 text-xs text-[#9aa49b]">Only pending requests are shown here.</p>
          </div>
          {!loading && !loadError && (
            <span className="rounded-lg bg-[#f1f5f1] px-3 py-2 text-xs font-semibold text-[#526057]">
              {requests.length} pending {requests.length === 1 ? "request" : "requests"}
            </span>
          )}
        </section>

        {feedback && (
          <p
            role={feedback.kind === "error" ? "alert" : "status"}
            className={`rounded-lg border px-4 py-3 text-sm ${feedback.kind === "error" ? "border-[#f1d1ce] bg-[#fff8f7] text-[#b94b48]" : "border-[#b9d6c4] bg-[#f1f8f3] text-[#176b50]"}`}
          >
            {feedback.message}
          </p>
        )}

        {loadError ? (
          <section className="rounded-xl border border-[#f1d1ce] bg-white p-8 text-center">
            <p role="alert" className="text-sm text-[#b94b48]">{loadError}</p>
            <button
              type="button"
              onClick={() => { setLoading(true); setLoadError(""); void loadRequests(); }}
              className="mt-4 rounded-lg border border-[#dfe5df] px-4 py-2.5 text-sm font-semibold text-[#526057] hover:bg-[#fafbf9]"
            >
              Try again
            </button>
          </section>
        ) : loading ? (
          <section className="rounded-xl border border-[#e2e7e1] bg-white p-10 text-center text-sm text-[#6e786f]" role="status">
            Loading account requests…
          </section>
        ) : requests.length === 0 ? (
          <section className="rounded-xl border border-[#e2e7e1] bg-white p-10 text-center">
            <div aria-hidden="true" className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#e6f2ec] text-lg font-bold text-[#176b50]">✓</div>
            <h2 className="text-sm font-semibold text-[#344238]">You’re all caught up</h2>
            <p className="mt-1 text-xs text-[#7b857c]">There are no pending admin account requests.</p>
          </section>
        ) : (
          <ul className="grid gap-4 lg:grid-cols-2" aria-label="Pending admin account requests">
            {requests.map((request) => (
              <li key={request.id}>
                <article className="flex h-full flex-col rounded-xl border border-[#e2e7e1] bg-white p-5 md:p-6">
                  <div className="flex items-start gap-3">
                    <div aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e6f2ec] text-sm font-bold text-[#176b50]">
                      {request.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "A"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-sm font-semibold text-[#202a23]">{request.name}</h2>
                      <p className="mt-1 break-all text-xs text-[#6e786f]">{request.email}</p>
                    </div>
                    <span className="shrink-0 rounded-md bg-[#fff4df] px-2 py-1 text-[10px] font-bold text-[#a86618]">Pending</span>
                  </div>

                  <p className="mt-5 text-xs text-[#89948b]">
                    Requested {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(request.createdAt))}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2 border-t border-[#edf0ec] pt-4">
                    <button
                      type="button"
                      disabled={busyId !== null}
                      onClick={() => void decide(request.id, "approve")}
                      className="rounded-lg bg-[#176b50] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#12563f] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {busyId === request.id ? "Processing…" : "Approve request"}
                    </button>
                    <button
                      type="button"
                      disabled={busyId !== null}
                      onClick={() => void decide(request.id, "reject")}
                      className="rounded-lg border border-[#f1d1ce] bg-white px-4 py-2.5 text-xs font-semibold text-[#b94b48] hover:bg-[#fff8f7] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {busyId === request.id ? "Processing…" : "Reject"}
                    </button>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
