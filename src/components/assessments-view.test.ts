import { createElement } from "react";
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
  questions: [
    {
      id: 12,
      prompt: "What does HTML stand for?",
      options: [
        "HyperText Markup Language",
        "Option B",
        "Option C",
        "Option D",
      ],
    },
    {
      id: 13,
      prompt: "What does CSS stand for?",
      options: [
        "Cascading Style Sheets",
        "Option B",
        "Option C",
        "Option D",
      ],
    },
  ],
};

// ─── Submission allowed regardless of answer completeness ────────────────────

describe("student assessment submission — partial/empty answer support", () => {
  it("renders the submit button when no questions are answered", () => {
    const markup = renderToStaticMarkup(
      createElement(ActivePracticeTest, {
        test: testData,
        answers: {},
        submitted: false,
        onAnswer: vi.fn(),
        onSubmit: vi.fn(),
        onBack: vi.fn(),
      }),
    );
    // Submit button must be present so the student can submit without answering.
    expect(markup).toContain("Submit answers");
    // No radio should carry the required attribute.
    expect(markup).not.toContain("required");
  });

  it("renders the submit button when only some questions are answered", () => {
    const markup = renderToStaticMarkup(
      createElement(ActivePracticeTest, {
        test: testData,
        // Only the first question answered
        answers: { 12: "A" },
        submitted: false,
        onAnswer: vi.fn(),
        onSubmit: vi.fn(),
        onBack: vi.fn(),
      }),
    );
    expect(markup).toContain("Submit answers");
    expect(markup).not.toContain("required");
    // Answered question's radio is checked
    const checkedInput = markup.match(/<input[^>]*name="question-12"[^>]*value="A"[^>]*>/)?.[0];
    expect(checkedInput).toContain('checked=""');
    // Unanswered question's radios are not checked
    expect(markup).not.toMatch(/name="question-13"[^>]*checked/);
  });

  it("renders the submit button when all questions are answered", () => {
    const markup = renderToStaticMarkup(
      createElement(ActivePracticeTest, {
        test: testData,
        answers: { 12: "A", 13: "B" },
        submitted: false,
        onAnswer: vi.fn(),
        onSubmit: vi.fn(),
        onBack: vi.fn(),
      }),
    );
    expect(markup).toContain("Submit answers");
    expect(markup).not.toContain("required");
  });
});

// ─── Post-submission display ──────────────────────────────────────────────────

describe("student assessment submission view", () => {
  it("keeps the question, options, and selected answer visible after submission", () => {
    const markup = renderToStaticMarkup(
      createElement(ActivePracticeTest, {
        test: testData,
        answers: { 12: "A" },
        submitted: true,
        onAnswer: vi.fn(),
        onSubmit: vi.fn(),
        onBack: vi.fn(),
      }),
    );

    expect(markup).toContain("Your answers are recorded in this page session only.");
    expect(markup).toContain("What does HTML stand for?");
    expect(markup).toContain("HyperText Markup Language");
    const selectedInput = markup.match(/<input[^>]*name="question-12"[^>]*>/)?.[0];
    expect(selectedInput).toContain('value="A"');
    expect(selectedInput).toContain('checked=""');
    expect(selectedInput).toContain('disabled=""');
    expect(markup).not.toContain("Submit answers");
    expect(markup).not.toContain("correctOption");
  });

  it("hides the submit button and shows the result notice after submission", () => {
    const markup = renderToStaticMarkup(
      createElement(ActivePracticeTest, {
        test: testData,
        answers: {},
        submitted: true,
        onAnswer: vi.fn(),
        onSubmit: vi.fn(),
        onBack: vi.fn(),
      }),
    );
    expect(markup).toContain("Your answers are recorded in this page session only.");
    expect(markup).not.toContain("Submit answers");
  });
});
