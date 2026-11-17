import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/app-shell", () => ({
  AppShell: ({ children, role }: { children: React.ReactNode; role: string }) => <main data-role={role}>{children}</main>,
}));

import AdminStudentDirectoryView from "@/components/admin-student-directory-view";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const students = [
  { id: "s1", name: "Ari Green", email: "ari@example.test", branch: "Computer Science", cgpa: 8.5, yearOfStudy: 3, skills: ["TypeScript", "React"] },
  { id: "s2", name: "Bo Lane", email: "bo@example.test", branch: "Information Technology", cgpa: 7.1, yearOfStudy: 2, skills: ["Python"] },
];

describe("admin student directory", () => {
  it("loads results and filters by contact, academics and selected skills", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ students }) }));
    render(<AdminStudentDirectoryView role="super-admin" />);
    expect(await screen.findByText("2 students")).toBeTruthy();
    expect(screen.getByRole("main").getAttribute("data-role")).toBe("super-admin");

    fireEvent.change(screen.getByPlaceholderText("Search name"), { target: { value: "Ari" } });
    expect(screen.getByText("1 student")).toBeTruthy();
    expect(screen.getAllByText("Ari Green")).toHaveLength(2);
    expect(screen.queryAllByText("Bo Lane")).toHaveLength(0);

    fireEvent.change(screen.getByPlaceholderText("Search name"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Search available skills"), { target: { value: "type" } });
    fireEvent.click(screen.getByLabelText("TypeScript"));
    expect(screen.getByText("1 student")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Remove TypeScript skill filter" }));
    expect(screen.getByText("2 students")).toBeTruthy();
  });

  it("shows server errors and supports clearing filters and empty results", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: "Directory unavailable" }) }));
    render(<AdminStudentDirectoryView />);
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Directory unavailable");
    fireEvent.change(screen.getByPlaceholderText("Search name"), { target: { value: "Nobody" } });
    expect(screen.getByText("No students match your filters.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByPlaceholderText("Search name").getAttribute("value")).toBe("");
  });

  it("handles malformed responses and skill searches with no matches", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ students: "invalid" }) }));
    render(<AdminStudentDirectoryView />);
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "The student directory is temporarily unavailable.");
    fireEvent.change(screen.getByLabelText("Search available skills"), { target: { value: "missing" } });
    expect(screen.getByText("No skills match that search.")).toBeTruthy();
  });
});
