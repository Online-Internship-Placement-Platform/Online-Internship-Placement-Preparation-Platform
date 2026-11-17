import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/app-shell", () => ({ AppShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));

import StudentProfileView from "@/components/student-profile-view";
import { getStudentById, replaceStudent } from "@/lib/student-store";

const baseline = getStudentById("stu-001");
beforeEach(() => { if (baseline) replaceStudent(baseline.id, baseline); });
afterEach(cleanup);

describe("student profile view", () => {
  it("edits profile fields, adds a skill and resume, then confirms saved prototype data", () => {
    render(<StudentProfileView />);
    fireEvent.click(screen.getByRole("button", { name: "Edit profile" }));
    fireEvent.change(screen.getByDisplayValue(baseline!.name), { target: { value: "Jordan Updated" } });
    fireEvent.change(screen.getByLabelText("Add a skill"), { target: { value: "Rust" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    fireEvent.change(screen.getByLabelText("Upload resume (PDF, up to 5 MB)"), {
      target: { files: [new File(["pdf"], "updated.pdf", { type: "application/pdf" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));
    expect(screen.getByRole("status").textContent).toContain("Profile updated.");
    expect(screen.getByText("Jordan Updated")).toBeTruthy();
    expect(screen.getByText("updated.pdf")).toBeTruthy();
    expect(screen.getByText("Rust")).toBeTruthy();
  });

  it("shows field and skill validation errors without saving invalid values", () => {
    render(<StudentProfileView />);
    fireEvent.click(screen.getByRole("button", { name: "Edit profile" }));
    fireEvent.change(screen.getByDisplayValue(baseline!.name), { target: { value: " " } });
    fireEvent.change(screen.getByDisplayValue(baseline!.email), { target: { value: "invalid-email" } });
    fireEvent.change(screen.getByDisplayValue(baseline!.branch), { target: { value: " " } });
    fireEvent.change(screen.getByDisplayValue(String(baseline!.cgpa)), { target: { value: "11" } });
    fireEvent.change(screen.getByLabelText("Skill 1"), { target: { value: baseline!.skills[1] } });
    fireEvent.submit(screen.getByRole("button", { name: "Save profile" }).closest("form")!);
    expect(screen.getByText("Name is required.")).toBeTruthy();
    expect(screen.getByText("Enter a valid email address.")).toBeTruthy();
    expect(screen.getByText("Branch is required.")).toBeTruthy();
    expect(screen.getByText("CGPA must be between 0 and 10.")).toBeTruthy();
    expect(screen.getByText("Skills must be unique.")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain("Please correct the highlighted fields");
    expect(getStudentById(baseline!.id)?.name).toBe(baseline!.name);
    expect(getStudentById(baseline!.id)?.email).toBe(baseline!.email);
  });

  it("supports Enter-to-add, skill editing and removal, resume removal, and cancel reset", () => {
    render(<StudentProfileView />);
    fireEvent.click(screen.getByRole("button", { name: "Edit profile" }));
    const skillInput = screen.getByLabelText("Add a skill");
    fireEvent.change(skillInput, { target: { value: " Rust " } });
    fireEvent.keyDown(skillInput, { key: "Enter" });
    expect(screen.getByDisplayValue("Rust")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Skill 1"), { target: { value: "Go" } });
    expect(screen.getByDisplayValue("Go")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Remove Go" }));
    if (baseline!.resume) fireEvent.click(screen.getByRole("button", { name: "Remove current resume" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("button", { name: "Save profile" })).toBeNull();
    expect(screen.getByText(baseline!.name)).toBeTruthy();
  });

  it("reports invalid PDF uploads and oversize resume files", () => {
    render(<StudentProfileView />);
    fireEvent.click(screen.getByRole("button", { name: "Edit profile" }));
    const resume = screen.getByLabelText("Upload resume (PDF, up to 5 MB)");
    fireEvent.change(resume, { target: { files: [new File(["data"], "resume.txt", { type: "text/plain" })] } });
    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));
    expect(screen.getAllByRole("alert").some((alert) => alert.textContent?.includes("Choose a PDF file."))).toBe(true);
    fireEvent.change(resume, { target: { files: [new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.pdf", { type: "application/pdf" })] } });
    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));
    expect(screen.getAllByRole("alert").some((alert) => alert.textContent?.includes("Resume must be 5 MB or smaller."))).toBe(true);
  });
});
