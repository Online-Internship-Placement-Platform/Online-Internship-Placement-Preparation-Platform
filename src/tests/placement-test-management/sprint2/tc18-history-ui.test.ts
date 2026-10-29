import { createElement, isValidElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/student/assessments",
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("@/lib/auth-actions", () => ({
  signOut: vi.fn(),
}));

vi.mock("@/app/student/assessments/actions", () => ({
  listAvailablePlacementTests: vi.fn(),
  scoreAttempt: vi.fn(),
  getAttemptHistory: vi.fn(),
}));

import { ActivePracticeTest } from "@/components/assessments-view";
import type { AvailablePlacementTest } from "@/app/student/assessments/actions";

const testData: AvailablePlacementTest = {
  id: 3,
  title: "Web basics",
  description: "A short practice test",
  domain: "WEB_DEVELOPMENT",
  difficulty: "EASY",
  isDefault: true,
  questions: [],
};

function findButton(
  node: ReactNode,
  label: string,
): { type?: string; onClick?: () => void } | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const button = findButton(child, label);
      if (button) return button;
    }
    return undefined;
  }

  if (!isValidElement(node)) return undefined;

  const props = node.props as {
    children?: ReactNode;
    type?: string;
    onClick?: () => void;
  };
  if (node.type === "button" && props.children === label) return props;
  return findButton(props.children, label);
}

describe("TC-18 attempt history UI", () => {
  it("shows failed history loads as an accessible error with a retry control", () => {
    const markup = renderToStaticMarkup(
      createElement(ActivePracticeTest, {
        test: testData,
        answers: {},
        submitted: false,
        historyError: "Could not load attempt history. Please try again.",
        onRetryHistory: vi.fn(),
        onAnswer: vi.fn(),
        onSubmit: vi.fn(),
        onBack: vi.fn(),
      }),
    );

    expect(markup).toContain('role="alert"');
    expect(markup).toContain("Could not load attempt history. Please try again.");
    expect(markup).toContain("Retry loading history");
  });

  it("wires the retry control to the history reload callback", () => {
    const retry = vi.fn();
    const view = ActivePracticeTest({
      test: testData,
      answers: {},
      submitted: false,
      historyError: "History unavailable",
      onRetryHistory: retry,
      onAnswer: vi.fn(),
      onSubmit: vi.fn(),
      onBack: vi.fn(),
    });
    const button = findButton(view, "Retry loading history");

    expect(button?.type).toBe("button");
    button?.onClick?.();
    expect(retry).toHaveBeenCalledOnce();
  });

  it("keeps previously loaded attempts visible alongside a refresh error", () => {
    const markup = renderToStaticMarkup(
      createElement(ActivePracticeTest, {
        test: testData,
        answers: {},
        submitted: false,
        attemptHistory: [{
          id: 42,
          correctCount: 1,
          totalQuestions: 2,
          percentage: 50,
          completedAt: "2026-10-23T10:00:00.000Z",
          questionResults: [],
        }],
        historyError: "Could not refresh attempt history.",
        onRetryHistory: vi.fn(),
        onAnswer: vi.fn(),
        onSubmit: vi.fn(),
        onBack: vi.fn(),
      }),
    );

    expect(markup).toContain("Could not refresh attempt history.");
    expect(markup).toContain("Attempt 1");
    expect(markup).toContain("1 / 2 (50%)");
  });
});
