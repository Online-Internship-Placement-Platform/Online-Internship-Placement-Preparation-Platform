import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a>,
}));

import RegisterPage from "@/app/register/page";

describe("RegisterPage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: "Student account created successfully. You can now sign in." }),
    } as Response));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows registration success and resets the form after the async response", async () => {
    render(<RegisterPage />);
    const nameInput = screen.getByPlaceholderText("Your full name") as HTMLInputElement;
    const form = nameInput.closest("form");
    if (!form) throw new Error("Registration form was not rendered.");

    fireEvent.change(nameInput, { target: { value: "Alex Sample" } });
    fireEvent.submit(form);

    expect((await screen.findByRole("status")).textContent).toBe(
      "Student account created successfully. You can now sign in.",
    );
    expect(screen.queryByRole("alert")).toBeNull();
    await waitFor(() => expect(nameInput.value).toBe(""));
    expect(globalThis.fetch).toHaveBeenCalledWith("/api/auth/register", expect.objectContaining({ method: "POST" }));
  });
});
