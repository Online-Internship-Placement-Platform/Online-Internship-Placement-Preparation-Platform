// @vitest-environment node
/**
 * TC-17: Automatic score and percentage calculation and display
 *
 * SRS REQ-17: The system auto-calculates and displays the score and percentage
 * immediately upon submission.
 *
 * Pass: Correct score and percentage displayed immediately after submission.
 * Fail: Score or percentage is wrong, missing, or not shown.
 *
 * Sources:
 *   - additional/original-actions-student.test.ts  (server-side scoring logic)
 *   - additional/original-assessments-view.test.ts  (UI display after submission)
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/server-auth", () => ({
  getServerRole: vi.fn(),
  getServerEmail: vi.fn(),
  isServerAuthConfigured: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    placementTest: { findFirst: vi.fn() },
    testAttempt: { create: vi.fn() },
  },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/student/assessments",
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("@/lib/auth-actions", () => ({ signOut: vi.fn() }));

// scoreAttempt and ActivePracticeTest are imported directly.
// scoreAttempt uses the real implementation with mocked dependencies (prisma, server-auth).
// ActivePracticeTest is a pure render component; its actions module import is mocked
// only to prevent side effects from the module's top-level server-only guard.
vi.mock("@/app/student/assessments/actions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/student/assessments/actions")>();
  return { ...actual };
});

import { scoreAttempt, type AvailablePlacementTest, type QuestionResult } from "@/app/student/assessments/actions";
import { getServerRole, getServerEmail, isServerAuthConfigured } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { ActivePracticeTest } from "@/components/assessments-view";

const MOCK_SCORE_TEST = {
  id: 3,
  questions: [
    { question: { id: 12, correctOption: "A" as const } },
    { question: { id: 13, correctOption: "C" as const } },
  ],
};

const TEST_DATA: AvailablePlacementTest = {
  id: 3, title: "Web basics", description: "A short practice test",
  domain: "WEB_DEVELOPMENT", difficulty: "EASY", isDefault: true,
  questions: [
    { id: 12, prompt: "What does HTML stand for?", options: ["HyperText Markup Language", "Option B", "Option C", "Option D"] },
    { id: 13, prompt: "What does CSS stand for?", options: ["Cascading Style Sheets", "Option B", "Option C", "Option D"] },
  ],
};

const MOCK_SCORE_RESULT = {
  totalQuestions: 2, answeredCount: 2, correctCount: 1, percentage: 50,
  questionResults: [
    { questionId: 12, studentAnswer: "A" as const, correctAnswer: "A" as const, isCorrect: true },
    { questionId: 13, studentAnswer: "B" as const, correctAnswer: "C" as const, isCorrect: false },
  ] satisfies QuestionResult[],
};

function authorisedStudent() {
  vi.mocked(isServerAuthConfigured).mockReturnValue(true);
  vi.mocked(getServerRole).mockResolvedValue("student");
  vi.mocked(getServerEmail).mockResolvedValue("student@gmail.com");
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default: testAttempt.create succeeds so scoring tests focus on score logic, not persistence.
  vi.mocked(prisma.testAttempt.create).mockResolvedValue({ id: 1 } as never);
});

// ─── Correct score calculation ────────────────────────────────────────────────

describe("TC-17 — correct score calculation", () => {
  it("calculates correct score for a fully answered test (1 correct, 1 wrong)", async () => {
    authorisedStudent();
    vi.mocked(prisma.placementTest.findFirst).mockResolvedValue(MOCK_SCORE_TEST as never);
    const result = await scoreAttempt(3, { 12: "A", 13: "B" });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.totalQuestions).toBe(2);
    expect(result.answeredCount).toBe(2);
    expect(result.correctCount).toBe(1);
  });

  it("calculates correct score for a partially answered test", async () => {
    authorisedStudent();
    vi.mocked(prisma.placementTest.findFirst).mockResolvedValue(MOCK_SCORE_TEST as never);
    const result = await scoreAttempt(3, { 12: "A" });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.answeredCount).toBe(1);
    expect(result.correctCount).toBe(1);
  });

  it("returns score of zero when no questions are answered", async () => {
    authorisedStudent();
    vi.mocked(prisma.placementTest.findFirst).mockResolvedValue(MOCK_SCORE_TEST as never);
    const result = await scoreAttempt(3, {});
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.correctCount).toBe(0);
    expect(result.answeredCount).toBe(0);
  });

  it("scores correctly when all questions are answered correctly", async () => {
    authorisedStudent();
    vi.mocked(prisma.placementTest.findFirst).mockResolvedValue(MOCK_SCORE_TEST as never);
    const result = await scoreAttempt(3, { 12: "A", 13: "C" });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.correctCount).toBe(2);
  });
});

// ─── Correct percentage calculation ──────────────────────────────────────────

describe("TC-17 — correct percentage calculation", () => {
  it("calculates 50% for one correct answer out of two", async () => {
    authorisedStudent();
    vi.mocked(prisma.placementTest.findFirst).mockResolvedValue(MOCK_SCORE_TEST as never);
    const result = await scoreAttempt(3, { 12: "A", 13: "B" });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.percentage).toBe(50);
  });

  it("calculates 100% when all questions are answered correctly", async () => {
    authorisedStudent();
    vi.mocked(prisma.placementTest.findFirst).mockResolvedValue(MOCK_SCORE_TEST as never);
    const result = await scoreAttempt(3, { 12: "A", 13: "C" });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.percentage).toBe(100);
  });

  it("calculates 0% when no questions are answered", async () => {
    authorisedStudent();
    vi.mocked(prisma.placementTest.findFirst).mockResolvedValue(MOCK_SCORE_TEST as never);
    const result = await scoreAttempt(3, {});
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.percentage).toBe(0);
  });

  it("handles a zero-question test safely without division by zero", async () => {
    authorisedStudent();
    vi.mocked(prisma.placementTest.findFirst).mockResolvedValue({ id: 99, questions: [] } as never);
    const result = await scoreAttempt(99, {});
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.totalQuestions).toBe(0);
    expect(result.percentage).toBe(0);
  });
});

// ─── Correct vs incorrect answer handling ─────────────────────────────────────

describe("TC-17 — handling known correct and incorrect answers", () => {
  it("marks unanswered questions as incorrect with studentAnswer: null", async () => {
    authorisedStudent();
    vi.mocked(prisma.placementTest.findFirst).mockResolvedValue(MOCK_SCORE_TEST as never);
    const result = await scoreAttempt(3, {});
    expect(result.success).toBe(true);
    if (!result.success) return;
    for (const qr of result.questionResults) {
      expect(qr.studentAnswer).toBeNull();
      expect(qr.isCorrect).toBe(false);
    }
  });

  it("scores from the database — never trusts a client-supplied answer as correct", async () => {
    authorisedStudent();
    vi.mocked(prisma.placementTest.findFirst).mockResolvedValue(MOCK_SCORE_TEST as never);
    const result = await scoreAttempt(3, { 12: "B" }); // correct is A
    expect(result.success).toBe(true);
    if (!result.success) return;
    const q12 = result.questionResults.find(r => r.questionId === 12);
    expect(q12?.correctAnswer).toBe("A");
    expect(q12?.isCorrect).toBe(false);
  });

  it("question results contain only questions belonging to the selected test", async () => {
    authorisedStudent();
    vi.mocked(prisma.placementTest.findFirst).mockResolvedValue(MOCK_SCORE_TEST as never);
    const result = await scoreAttempt(3, { 12: "A", 13: "C" });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.questionResults.map(r => r.questionId)).toEqual([12, 13]);
  });
});

// ─── Displaying result immediately after submission ───────────────────────────

describe("TC-17 — score and percentage displayed immediately after submission", () => {
  it("shows the score summary in 'You scored X / Y (Z%)' format", () => {
    const markup = renderToStaticMarkup(
      createElement(ActivePracticeTest, {
        test: TEST_DATA, answers: { 12: "A", 13: "B" }, submitted: true,
        scoreResult: MOCK_SCORE_RESULT, onAnswer: vi.fn(), onSubmit: vi.fn(), onBack: vi.fn(),
      }),
    );
    expect(markup).toContain("You scored 1 / 2 (50%)");
  });

  it("hides the submit button after submission", () => {
    const markup = renderToStaticMarkup(
      createElement(ActivePracticeTest, {
        test: TEST_DATA, answers: { 12: "A", 13: "B" }, submitted: true,
        scoreResult: MOCK_SCORE_RESULT, onAnswer: vi.fn(), onSubmit: vi.fn(), onBack: vi.fn(),
      }),
    );
    expect(markup).not.toContain("Submit answers");
  });

  it("indicates which answers were correct after submission", () => {
    const markup = renderToStaticMarkup(
      createElement(ActivePracticeTest, {
        test: TEST_DATA, answers: { 12: "A", 13: "B" }, submitted: true,
        scoreResult: MOCK_SCORE_RESULT, onAnswer: vi.fn(), onSubmit: vi.fn(), onBack: vi.fn(),
      }),
    );
    expect(markup).toContain("✓ Correct");
    expect(markup).toContain("✗ Incorrect");
  });

  it("reveals correct answers for every question after submission", () => {
    const markup = renderToStaticMarkup(
      createElement(ActivePracticeTest, {
        test: TEST_DATA, answers: { 12: "A", 13: "B" }, submitted: true,
        scoreResult: MOCK_SCORE_RESULT, onAnswer: vi.fn(), onSubmit: vi.fn(), onBack: vi.fn(),
      }),
    );
    expect(markup).toContain("(correct)");
  });

  it("labels unanswered questions as 'Not answered' and still reveals the correct answer", () => {
    const unansweredResult = {
      totalQuestions: 2, answeredCount: 0, correctCount: 0, percentage: 0,
      questionResults: [
        { questionId: 12, studentAnswer: null, correctAnswer: "A" as const, isCorrect: false },
        { questionId: 13, studentAnswer: null, correctAnswer: "C" as const, isCorrect: false },
      ] satisfies QuestionResult[],
    };
    const markup = renderToStaticMarkup(
      createElement(ActivePracticeTest, {
        test: TEST_DATA, answers: {}, submitted: true,
        scoreResult: unansweredResult, onAnswer: vi.fn(), onSubmit: vi.fn(), onBack: vi.fn(),
      }),
    );
    expect(markup).toContain("Not answered");
    expect(markup).toContain("(correct)");
  });

  it("prevents duplicate submissions by showing 'Scoring…' and disabling the button", () => {
    const markup = renderToStaticMarkup(
      createElement(ActivePracticeTest, {
        test: TEST_DATA, answers: {}, submitted: false, scoring: true,
        onAnswer: vi.fn(), onSubmit: vi.fn(), onBack: vi.fn(),
      }),
    );
    expect(markup).toContain("Scoring…");
    expect(markup).toContain('disabled=""');
  });
});
