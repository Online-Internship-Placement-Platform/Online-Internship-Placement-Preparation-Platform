import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const actions = vi.hoisted(() => ({
  listAvailablePlacementTests: vi.fn(),
  scoreAttempt: vi.fn(),
  getAttemptHistory: vi.fn(),
}));

vi.mock("@/components/app-shell", () => ({ AppShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock("@/app/student/assessments/actions", () => actions);

import AssessmentsView from "@/components/assessments-view";

afterEach(() => { cleanup(); vi.clearAllMocks(); });

const practiceTest = {
  id: 21, title: "Web fundamentals", description: "HTML and CSS", domain: "WEB_DEVELOPMENT" as const,
  difficulty: "EASY" as const, isDefault: false,
  questions: [{ id: 1, prompt: "HTML?", options: ["Markup", "Style", "Script", "Query"] }],
};

describe("student assessments workflow", () => {
  it("loads a domain test, shows history, scores an attempt, and supports retake and back navigation", async () => {
    actions.listAvailablePlacementTests.mockResolvedValue({ success: true, data: [practiceTest] });
    actions.getAttemptHistory.mockResolvedValue({ success: true, data: [{ id: 1, correctCount: 3, totalQuestions: 4, percentage: 75, completedAt: "2026-01-01T00:00:00.000Z", questionResults: [] }] });
    actions.scoreAttempt.mockResolvedValue({ success: true, totalQuestions: 1, answeredCount: 1, correctCount: 1, percentage: 100, questionResults: [{ questionId: 1, studentAnswer: "A", correctAnswer: "A", isCorrect: true }] });
    render(<AssessmentsView initialTests={[]} />);
    fireEvent.click(screen.getByRole("button", { name: /Web Development/ }));
    expect(await screen.findByText("Web fundamentals")).toBeTruthy();
    expect(actions.listAvailablePlacementTests).toHaveBeenCalledWith("WEB_DEVELOPMENT");
    fireEvent.click(screen.getByRole("button", { name: "Start practice" }));
    expect(await screen.findByText(/Previous attempts/)).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Markup"));
    fireEvent.click(screen.getByRole("button", { name: "Submit answers" }));
    expect(await screen.findByText(/You scored/)).toBeTruthy();
    expect(actions.scoreAttempt).toHaveBeenCalledWith(21, { 1: "A" });
    fireEvent.click(screen.getByRole("button", { name: "Retake test" }));
    expect(screen.getByRole("button", { name: "Submit answers" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Back to tests" }));
    expect(screen.getByText("Web fundamentals")).toBeTruthy();
  });

  it("shows empty domain results and server errors, including scoring and history failures", async () => {
    actions.listAvailablePlacementTests.mockResolvedValueOnce({ success: true, data: [] }).mockResolvedValueOnce({ success: false, error: "Could not load this domain." }).mockResolvedValue({ success: true, data: [practiceTest] });
    actions.getAttemptHistory.mockResolvedValue({ success: false, error: "History is unavailable." });
    actions.scoreAttempt.mockResolvedValue({ success: false, error: "Scoring unavailable." });
    render(<AssessmentsView initialTests={[practiceTest]} error="Initial tests could not be loaded." />);
    expect(screen.getByRole("alert").textContent).toContain("Initial tests could not be loaded.");
    fireEvent.click(screen.getByRole("button", { name: /Web Development/ }));
    expect(await screen.findByText("No practice tests are currently available for this domain.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Back to domain selection" }));
    fireEvent.click(screen.getByRole("button", { name: /Web Development/ }));
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Could not load this domain.");
    fireEvent.click(screen.getByRole("button", { name: "Back to domain selection" }));
    fireEvent.click(screen.getByRole("button", { name: /Web Development/ }));
    await screen.findByText("Web fundamentals");
    fireEvent.click(screen.getByRole("button", { name: "Start practice" }));
    expect(await screen.findByText("History is unavailable.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Submit answers" }));
    expect(await screen.findByText("Scoring unavailable.")).toBeTruthy();
  });
});
