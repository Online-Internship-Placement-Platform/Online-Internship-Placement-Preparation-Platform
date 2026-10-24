/**
 * TC-16: Student domain selection and test attempts
 *
 * SRS REQ-16: Students can select a domain and attempt a placement test
 * relevant to that domain.
 *
 * Pass: The relevant test is presented and can be completed and submitted.
 * Fail: An unrelated test is presented or the student cannot submit.
 *
 * Sources:
 *   - additional/original-actions-student.test.ts  (domain selection, test retrieval)
 *   - additional/original-assessments-view.test.ts  (answer/submit UI behavior)
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/server-auth", () => ({
  getServerRole: vi.fn(),
  isServerAuthConfigured: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    placementTest: { findMany: vi.fn(), findFirst: vi.fn() },
  },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/student/assessments",
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("@/lib/auth-actions", () => ({ signOut: vi.fn() }));

// listAvailablePlacementTests is imported directly (real implementation).
// The ActivePracticeTest component tests mock the module to avoid side effects,
// but the server-action tests call the real function with mocked dependencies.
import { listAvailablePlacementTests, type AvailablePlacementTest } from "@/app/student/assessments/actions";
import { getServerRole, isServerAuthConfigured } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { ActivePracticeTest } from "@/components/assessments-view";
import type { QuestionResult } from "@/app/student/assessments/actions";
import {
  PLACEMENT_DOMAINS,
  filterPlacementTests,
  type PlacementDomain,
  type PlacementDifficulty,
} from "@/lib/assessment-options";

const NOW = new Date();

const MOCK_TEST_RECORD = {
  id: 3, title: "Web basics", description: "Easy web test",
  domain: "WEB_DEVELOPMENT" as const, difficulty: "EASY" as const,
  isDefault: true, isPublished: true, createdAt: NOW, updatedAt: NOW,
  questions: [{
    question: {
      id: 12, prompt: "What does HTML stand for?",
      optionA: "HyperText Markup Language", optionB: "Option B", optionC: "Option C", optionD: "Option D",
      correctOption: "A" as const, domain: "WEB_DEVELOPMENT" as const, difficulty: "EASY" as const,
      createdAt: NOW, updatedAt: NOW,
    },
  }],
};

const TEST_DATA: AvailablePlacementTest = {
  id: 3, title: "Web basics", description: "A short practice test",
  domain: "WEB_DEVELOPMENT", difficulty: "EASY", isDefault: true,
  questions: [
    { id: 12, prompt: "What does HTML stand for?", options: ["HyperText Markup Language", "Option B", "Option C", "Option D"] },
    { id: 13, prompt: "What does CSS stand for?", options: ["Cascading Style Sheets", "Option B", "Option C", "Option D"] },
  ],
};

function authorisedStudent() {
  vi.mocked(isServerAuthConfigured).mockReturnValue(true);
  vi.mocked(getServerRole).mockResolvedValue("student");
}

beforeEach(() => { vi.clearAllMocks(); });

// ─── Domain selection ─────────────────────────────────────────────────────────

describe("TC-16 — student selects a domain to see relevant tests", () => {
  it("five placement domains are available for selection", () => {
    expect(PLACEMENT_DOMAINS).toHaveLength(5);
    PLACEMENT_DOMAINS.forEach(d => {
      expect(typeof d.value).toBe("string");
      expect(typeof d.label).toBe("string");
    });
  });

  it("selecting WEB_DEVELOPMENT returns only WEB_DEVELOPMENT tests", () => {
    const tests = [
      { id: 1, domain: "WEB_DEVELOPMENT" as PlacementDomain, difficulty: "EASY" as PlacementDifficulty },
      { id: 2, domain: "AI_ML" as PlacementDomain, difficulty: "HARD" as PlacementDifficulty },
    ];
    const result = filterPlacementTests(tests, "WEB_DEVELOPMENT", "ALL");
    expect(result.every(t => t.domain === "WEB_DEVELOPMENT")).toBe(true);
    expect(result).toHaveLength(1);
  });

  it("filters domain-specific tests from the server for an authenticated student", async () => {
    authorisedStudent();
    vi.mocked(prisma.placementTest.findMany).mockResolvedValue([]);
    await listAvailablePlacementTests("WEB_DEVELOPMENT");
    expect(prisma.placementTest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ domain: "WEB_DEVELOPMENT" }),
      }),
    );
  });

  it("rejects an invalid domain value", async () => {
    authorisedStudent();
    // @ts-expect-error intentionally invalid
    const result = await listAvailablePlacementTests("INVALID_DOMAIN");
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain("valid domain");
  });
});

// ─── Retrieving relevant tests ────────────────────────────────────────────────

describe("TC-16 — only relevant (default or published) tests are presented", () => {
  it("lists available tests for an authenticated student", async () => {
    authorisedStudent();
    vi.mocked(prisma.placementTest.findMany).mockResolvedValue([MOCK_TEST_RECORD]);
    const result = await listAvailablePlacementTests();
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toHaveLength(1);
  });

  it("each test exposes four answer options per question", async () => {
    authorisedStudent();
    vi.mocked(prisma.placementTest.findMany).mockResolvedValue([MOCK_TEST_RECORD]);
    const result = await listAvailablePlacementTests("WEB_DEVELOPMENT");
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data[0].questions[0].options).toHaveLength(4);
  });
});

// ─── Answering questions ──────────────────────────────────────────────────────

describe("TC-16 — student can answer questions and submit the test", () => {
  it("renders the submit button when no questions are answered (student can submit anytime)", () => {
    const markup = renderToStaticMarkup(
      createElement(ActivePracticeTest, {
        test: TEST_DATA, answers: {}, submitted: false,
        onAnswer: vi.fn(), onSubmit: vi.fn(), onBack: vi.fn(),
      }),
    );
    expect(markup).toContain("Submit answers");
    expect(markup).not.toContain("required");
  });

  it("renders the submit button when only some questions are answered", () => {
    const markup = renderToStaticMarkup(
      createElement(ActivePracticeTest, {
        test: TEST_DATA, answers: { 12: "A" }, submitted: false,
        onAnswer: vi.fn(), onSubmit: vi.fn(), onBack: vi.fn(),
      }),
    );
    expect(markup).toContain("Submit answers");
    const checkedInput = markup.match(/<input[^>]*name="question-12"[^>]*value="A"[^>]*>/)?.[0];
    expect(checkedInput).toContain('checked=""');
  });

  it("renders the submit button when all questions are answered", () => {
    const markup = renderToStaticMarkup(
      createElement(ActivePracticeTest, {
        test: TEST_DATA, answers: { 12: "A", 13: "B" }, submitted: false,
        onAnswer: vi.fn(), onSubmit: vi.fn(), onBack: vi.fn(),
      }),
    );
    expect(markup).toContain("Submit answers");
  });

  it("questions and options remain visible after submission", () => {
    const markup = renderToStaticMarkup(
      createElement(ActivePracticeTest, {
        test: TEST_DATA, answers: { 12: "A" }, submitted: true,
        scoreResult: {
          totalQuestions: 2, answeredCount: 1, correctCount: 1, percentage: 50,
          questionResults: [
            { questionId: 12, studentAnswer: "A" as const, correctAnswer: "A" as const, isCorrect: true },
            { questionId: 13, studentAnswer: null, correctAnswer: "C" as const, isCorrect: false },
          ] satisfies QuestionResult[],
        },
        onAnswer: vi.fn(), onSubmit: vi.fn(), onBack: vi.fn(),
      }),
    );
    expect(markup).toContain("What does HTML stand for?");
    expect(markup).toContain("HyperText Markup Language");
    expect(markup).not.toContain("Submit answers");
  });

  it("does not reveal correct answers before the student submits", () => {
    const markup = renderToStaticMarkup(
      createElement(ActivePracticeTest, {
        test: TEST_DATA, answers: { 12: "A" }, submitted: false,
        onAnswer: vi.fn(), onSubmit: vi.fn(), onBack: vi.fn(),
      }),
    );
    expect(markup).not.toContain("(correct)");
    expect(markup).not.toContain("You scored");
  });
});
