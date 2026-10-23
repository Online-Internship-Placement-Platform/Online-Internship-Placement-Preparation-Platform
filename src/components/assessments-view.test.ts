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
  scoreAttempt: vi.fn(),
}));

import { ActivePracticeTest } from "@/components/assessments-view";
import type { AvailablePlacementTest, QuestionResult } from "@/app/student/assessments/actions";

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

const mockScoreResult = {
  totalQuestions: 2,
  answeredCount: 2,
  correctCount: 1,
  percentage: 50,
  questionResults: [
    { questionId: 12, studentAnswer: "A" as const, correctAnswer: "A" as const, isCorrect: true },
    { questionId: 13, studentAnswer: "B" as const, correctAnswer: "C" as const, isCorrect: false },
  ] satisfies QuestionResult[],
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

// ─── Correct answers NOT shown before submission ──────────────────────────────

describe("pre-submission — correct answers not shown", () => {
  it("does not reveal correct answer indicators before submission", () => {
    const markup = renderToStaticMarkup(
      createElement(ActivePracticeTest, {
        test: testData,
        answers: { 12: "A" },
        submitted: false,
        onAnswer: vi.fn(),
        onSubmit: vi.fn(),
        onBack: vi.fn(),
      }),
    );
    expect(markup).not.toContain("(correct)");
    expect(markup).not.toContain("Correct");
    expect(markup).not.toContain("Incorrect");
    expect(markup).not.toContain("You scored");
    expect(markup).not.toContain("correctAnswer");
  });
});

// ─── Submitting state prevents duplicate submissions ─────────────────────────

describe("submitting state", () => {
  it("shows Scoring… label and disables button while scoring", () => {
    const markup = renderToStaticMarkup(
      createElement(ActivePracticeTest, {
        test: testData,
        answers: {},
        submitted: false,
        scoring: true,
        onAnswer: vi.fn(),
        onSubmit: vi.fn(),
        onBack: vi.fn(),
      }),
    );
    expect(markup).toContain("Scoring…");
    expect(markup).not.toContain(">Submit answers<");
    // disabled attribute should be present
    expect(markup).toContain('disabled=""');
  });
});

// ─── Error display and retry ──────────────────────────────────────────────────

describe("scoring error", () => {
  it("displays an error message and keeps submit button visible for retry", () => {
    const markup = renderToStaticMarkup(
      createElement(ActivePracticeTest, {
        test: testData,
        answers: { 12: "A" },
        submitted: false,
        scoreError: "Could not score the test. Please try again.",
        onAnswer: vi.fn(),
        onSubmit: vi.fn(),
        onBack: vi.fn(),
      }),
    );
    expect(markup).toContain("Could not score the test. Please try again.");
    expect(markup).toContain("Submit answers");
  });
});

// ─── Post-submission score summary ───────────────────────────────────────────

describe("post-submission score display", () => {
  it("shows the score summary after successful submission", () => {
    const markup = renderToStaticMarkup(
      createElement(ActivePracticeTest, {
        test: testData,
        answers: { 12: "A", 13: "B" },
        submitted: true,
        scoreResult: mockScoreResult,
        onAnswer: vi.fn(),
        onSubmit: vi.fn(),
        onBack: vi.fn(),
      }),
    );
    expect(markup).toContain("You scored 1 / 2 (50%)");
  });

  it("hides the submit button after successful submission", () => {
    const markup = renderToStaticMarkup(
      createElement(ActivePracticeTest, {
        test: testData,
        answers: { 12: "A", 13: "B" },
        submitted: true,
        scoreResult: mockScoreResult,
        onAnswer: vi.fn(),
        onSubmit: vi.fn(),
        onBack: vi.fn(),
      }),
    );
    expect(markup).not.toContain("Submit answers");
    expect(markup).not.toContain("Scoring…");
  });

  it("keeps questions and answer options visible after submission", () => {
    const markup = renderToStaticMarkup(
      createElement(ActivePracticeTest, {
        test: testData,
        answers: { 12: "A", 13: "B" },
        submitted: true,
        scoreResult: mockScoreResult,
        onAnswer: vi.fn(),
        onSubmit: vi.fn(),
        onBack: vi.fn(),
      }),
    );
    expect(markup).toContain("What does HTML stand for?");
    expect(markup).toContain("HyperText Markup Language");
    expect(markup).toContain("What does CSS stand for?");
  });

  it("indicates a correct answer after submission", () => {
    const markup = renderToStaticMarkup(
      createElement(ActivePracticeTest, {
        test: testData,
        answers: { 12: "A", 13: "B" },
        submitted: true,
        scoreResult: mockScoreResult,
        onAnswer: vi.fn(),
        onSubmit: vi.fn(),
        onBack: vi.fn(),
      }),
    );
    expect(markup).toContain("✓ Correct");
  });

  it("indicates an incorrect answer after submission", () => {
    const markup = renderToStaticMarkup(
      createElement(ActivePracticeTest, {
        test: testData,
        answers: { 12: "A", 13: "B" },
        submitted: true,
        scoreResult: mockScoreResult,
        onAnswer: vi.fn(),
        onSubmit: vi.fn(),
        onBack: vi.fn(),
      }),
    );
    expect(markup).toContain("✗ Incorrect");
  });

  it("reveals the correct answer for each question after submission", () => {
    const markup = renderToStaticMarkup(
      createElement(ActivePracticeTest, {
        test: testData,
        answers: { 12: "A", 13: "B" },
        submitted: true,
        scoreResult: mockScoreResult,
        onAnswer: vi.fn(),
        onSubmit: vi.fn(),
        onBack: vi.fn(),
      }),
    );
    // The correct option is highlighted with "(correct)" label
    expect(markup).toContain("(correct)");
  });
});

// ─── Unanswered questions after submission ────────────────────────────────────

describe("unanswered questions after submission", () => {
  it("labels unanswered questions as 'Not answered' and shows the correct answer", () => {
    const unansweredResult = {
      totalQuestions: 2,
      answeredCount: 0,
      correctCount: 0,
      percentage: 0,
      questionResults: [
        { questionId: 12, studentAnswer: null, correctAnswer: "A" as const, isCorrect: false },
        { questionId: 13, studentAnswer: null, correctAnswer: "C" as const, isCorrect: false },
      ] satisfies QuestionResult[],
    };

    const markup = renderToStaticMarkup(
      createElement(ActivePracticeTest, {
        test: testData,
        answers: {},
        submitted: true,
        scoreResult: unansweredResult,
        onAnswer: vi.fn(),
        onSubmit: vi.fn(),
        onBack: vi.fn(),
      }),
    );
    expect(markup).toContain("Not answered");
    // Correct answer options are revealed
    expect(markup).toContain("(correct)");
  });
});

// ─── Post-submission display (legacy compatibility) ───────────────────────────

describe("student assessment submission view", () => {
  it("keeps the question, options, and selected answer visible after submission", () => {
    const markup = renderToStaticMarkup(
      createElement(ActivePracticeTest, {
        test: testData,
        answers: { 12: "A" },
        submitted: true,
        scoreResult: {
          totalQuestions: 2,
          answeredCount: 1,
          correctCount: 1,
          percentage: 50,
          questionResults: [
            { questionId: 12, studentAnswer: "A" as const, correctAnswer: "A" as const, isCorrect: true },
            { questionId: 13, studentAnswer: null, correctAnswer: "C" as const, isCorrect: false },
          ],
        },
        onAnswer: vi.fn(),
        onSubmit: vi.fn(),
        onBack: vi.fn(),
      }),
    );

    expect(markup).toContain("What does HTML stand for?");
    expect(markup).toContain("HyperText Markup Language");
    const selectedInput = markup.match(/<input[^>]*name="question-12"[^>]*>/)?.[0];
    expect(selectedInput).toContain('value="A"');
    expect(selectedInput).toContain('checked=""');
    expect(selectedInput).toContain('disabled=""');
    expect(markup).not.toContain("Submit answers");
    expect(markup).not.toContain("correctOption");
  });

  it("hides the submit button after submission", () => {
    const markup = renderToStaticMarkup(
      createElement(ActivePracticeTest, {
        test: testData,
        answers: {},
        submitted: true,
        scoreResult: {
          totalQuestions: 2,
          answeredCount: 0,
          correctCount: 0,
          percentage: 0,
          questionResults: [
            { questionId: 12, studentAnswer: null, correctAnswer: "A" as const, isCorrect: false },
            { questionId: 13, studentAnswer: null, correctAnswer: "C" as const, isCorrect: false },
          ],
        },
        onAnswer: vi.fn(),
        onSubmit: vi.fn(),
        onBack: vi.fn(),
      }),
    );
    expect(markup).toContain("You scored");
    expect(markup).not.toContain("Submit answers");
  });
});
