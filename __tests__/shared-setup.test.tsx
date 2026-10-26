/**
 * Shared testing environment smoke test.
 *
 * Verifies that Vitest, React Testing Library, and jsdom are correctly
 * configured on this branch. This test does not depend on any feature-
 * specific application code or implementation files.
 *
 * Every team member's feature branch should be able to run this test
 * after merging the shared setup.
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

// ── Minimal self-contained React component (no application imports) ───────────

function Greeting({ name }: { name: string }) {
  return <h1>Hello, {name}!</h1>;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("shared testing environment", () => {
  it("renders a React component with jsdom", () => {
    render(<Greeting name="InPlace" />);
    expect(screen.getByRole("heading", { name: "Hello, InPlace!" })).toBeDefined();
  });

  it("jsdom provides a window object", () => {
    expect(typeof window).toBe("object");
    expect(typeof document).toBe("object");
  });

  it("Vitest matchers work correctly", () => {
    expect(1 + 1).toBe(2);
    expect("vitest").toContain("test");
    expect([1, 2, 3]).toHaveLength(3);
  });
});
