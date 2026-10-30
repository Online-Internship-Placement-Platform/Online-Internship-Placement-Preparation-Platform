import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/app-shell", () => ({
  AppShell: ({ children, role }: { children: React.ReactNode; role: string }) => <div data-role={role}>{children}</div>,
}));

import AccountRequestsView from "@/components/account-requests-view";

const pendingRequest = {
  id: 25,
  name: "Jordan Example",
  email: "jordan@example.test",
  createdAt: "2026-10-28T12:00:00.000Z",
};

describe("AccountRequestsView", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("loads pending requests in the super-admin view", async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ requests: [pendingRequest] }) } as Response);

    render(<AccountRequestsView />);

    expect(await screen.findByText("Jordan Example")).toBeDefined();
    expect(screen.getByText("jordan@example.test")).toBeDefined();
    expect(screen.getByText("1 pending request")).toBeDefined();
    expect(screen.getByRole("button", { name: "Approve request" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Reject" })).toBeDefined();
    expect(document.querySelector('[data-role="super-admin"]')).not.toBeNull();
  });

  it.each(["approve", "reject"] as const)("sends the %s decision and refreshes the list", async (decision) => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ requests: [pendingRequest] }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ message: `Admin account ${decision === "approve" ? "approved" : "rejected"}.` }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ requests: [] }) } as Response);

    render(<AccountRequestsView />);
    const action = decision === "approve" ? "Approve request" : "Reject";
    fireEvent.click(await screen.findByRole("button", { name: action }));

    expect(await screen.findByText("You’re all caught up")).toBeDefined();
    expect(await screen.findByText(`Admin account ${decision === "approve" ? "approved" : "rejected"}.`)).toBeDefined();
    expect(fetchMock).toHaveBeenNthCalledWith(2, `/api/admin/account-requests/25/${decision}`, { method: "POST" });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("shows a loading error and supports retry", async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock
      .mockRejectedValueOnce(new Error("Network unavailable"))
      .mockResolvedValueOnce({ ok: true, json: async () => ({ requests: [] }) } as Response);

    render(<AccountRequestsView />);
    expect((await screen.findByRole("alert")).textContent).toContain("Network unavailable");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(screen.getByText("You’re all caught up")).toBeDefined());
  });
});