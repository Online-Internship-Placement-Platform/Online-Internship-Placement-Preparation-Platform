import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({ default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a> }));

import RequestAdminAccountPage from "@/app/request-admin-account/page";

describe("RequestAdminAccountPage status workflow", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows the checked status and offers to resubmit rejected requests", async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: "REJECTED" }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: "PENDING", message: "Your request has been resubmitted for review." }) } as Response);

    render(<RequestAdminAccountPage />);
    fireEvent.change(screen.getByLabelText("Request email"), { target: { value: "person@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: "Check status" }));

    expect(await screen.findByText("Rejected")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Resubmit request" }));

    expect(await screen.findByText("Pending")).toBeDefined();
    expect(await screen.findByText("Your request has been resubmitted for review.")).toBeDefined();
    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/auth/account-requests?email=person%40example.test", { cache: "no-store" });
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/auth/account-requests", expect.objectContaining({ method: "PATCH" }));
  });

  it("submits a super-admin account request with the selected role", async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: "Super-admin account request submitted for super-admin approval." }),
    } as Response);

    render(<RequestAdminAccountPage />);
    fireEvent.change(screen.getByLabelText("Account type"), { target: { value: "SUPER_ADMIN" } });
    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Taylor Admin" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "taylor@example.test" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "StrongPass123" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit Account Request" }));

    expect(await screen.findByText("Super-admin account request submitted successfully! Await super-admin approval.")).toBeDefined();
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/account-requests", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({
        name: "Taylor Admin",
        email: "taylor@example.test",
        password: "StrongPass123",
        role: "SUPER_ADMIN",
      }),
    }));
  });
});
