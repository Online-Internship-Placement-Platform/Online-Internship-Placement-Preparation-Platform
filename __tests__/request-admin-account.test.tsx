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
});
