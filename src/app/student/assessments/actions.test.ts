import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/server-auth", () => ({
  getServerRole: vi.fn(),
  getServerEmail: vi.fn(),
  isServerAuthConfigured: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    placementTest: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    testAttempt: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import {
  listAvailablePlacementTests,
  scoreAttempt,
  type AvailablePlacementTest,
} from "@/app/student/assessments/actions";
import { getServerRole, getServerEmail, isServerAuthConfigured } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

const NOW = new Date();

const MOCK_TEST_RECORD = {
  id: 3,
  title: "Web basics",
  description: "Easy web test",
  domain: "WEB_DEVELOPMENT" as const,
  difficulty: "EASY" as const,
  isDefault: true,
  isPublished: true,
  createdAt: NOW,
  updatedAt: NOW,
  questions: [
    {
      question: {
        id: 12,
        prompt: "What does HTML stand for?",
        optionA: "HyperText Markup Language",
        optionB: "Option B",
        optionC: "Option C",
        optionD: "Option D",
        correctOption: "A" as const,
        domain: "WEB_DEVELOPMENT" as const,
        difficulty: "EASY" as const,
        createdAt: NOW,
        updatedAt: NOW,
      },
    },
  ],
};

/** Minimal scoring test record with two questions */
const MOCK_SCORE_TEST = {
  id: 3,
  questions: [
    { question: { id: 12, correctOption: "A" as const } },
    { question: { id: 13, correctOption: "C" as const } },
  ],
};

function authorisedStudent() {
  vi.mocked(isServerAuthConfigured).mockReturnValue(true);
  vi.mocked(getServerRole).mockResolvedValue("student");
  vi.mocked(getServerEmail).mockResolvedValue("student@gmail.com");
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default: testAttempt.create succeeds silently so existing scoring tests are unaffected.
  vi.mocked(prisma.testAttempt.create).mockResolvedValue({ id: 1 } as never);
});

// ─── Authorization ────────────────────────────────────────────────────────────

describe("authorization", () => {
  it("rejects when server auth is not configured", async () => {
    vi.mocked(isServerAuthConfigured).mockReturnValue(false);
    const result = await listAvailablePlacementTests();
    expect(result.success).toBe(false);
  });

  it("rejects admins from the student endpoint", async () => {
    vi.mocked(isServerAuthConfigured).mockReturnValue(true);
    vi.mocked(getServerRole).mockResolvedValue("admin");
    const result = await listAvailablePlacementTests();
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain("student");
  });

  it("allows authenticated students", async () => {
    authorisedStudent();
    vi.mocked(prisma.placementTest.findMany).mockResolvedValue([]);
    const result = await listAvailablePlacementTests();
    expect(result.success).toBe(true);
  });
});

// ─── listAvailablePlacementTests ─────────────────────────────────────────────

describe("listAvailablePlacementTests", () => {
  it("never exposes correctOption in the returned test data", async () => {
    authorisedStudent();
    vi.mocked(prisma.placementTest.findMany).mockResolvedValue([MOCK_TEST_RECORD]);

    const result = await listAvailablePlacementTests();
    expect(result.success).toBe(true);
    if (!result.success) return;

    const json = JSON.stringify(result.data);
    expect(json).not.toContain("correctOption");
  });

  it("returns isDefault flag so the UI can badge default tests", async () => {
    authorisedStudent();
    vi.mocked(prisma.placementTest.findMany).mockResolvedValue([MOCK_TEST_RECORD]);

    const result = await listAvailablePlacementTests();
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect((result.data[0] as AvailablePlacementTest).isDefault).toBe(true);
  });

  it("filters tests by domain when a domain is provided", async () => {
    authorisedStudent();
    vi.mocked(prisma.placementTest.findMany).mockResolvedValue([]);

    await listAvailablePlacementTests("WEB_DEVELOPMENT");

    expect(prisma.placementTest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ domain: "WEB_DEVELOPMENT" }),
      }),
    );
  });

  it("queries only tests that are default OR published", async () => {
    authorisedStudent();
    vi.mocked(prisma.placementTest.findMany).mockResolvedValue([]);

    await listAvailablePlacementTests("AI_ML");

    expect(prisma.placementTest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [{ isDefault: true }, { isPublished: true }],
        }),
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

  it("returns four options per question without correctOption", async () => {
    authorisedStudent();
    vi.mocked(prisma.placementTest.findMany).mockResolvedValue([MOCK_TEST_RECORD]);

    const result = await listAvailablePlacementTests("WEB_DEVELOPMENT");
    expect(result.success).toBe(true);
    if (!result.success) return;

    const question = result.data[0].questions[0];
    expect(question.options).toHaveLength(4);
    expect(Object.keys(question)).not.toContain("correctOption");
  });
});

// ─── scoreAttempt — authorization ────────────────────────────────────────────

describe("scoreAttempt — authorization", () => {
  it("rejects unauthenticated users (auth not configured)", async () => {
    vi.mocked(isServerAuthConfigured).mockReturnValue(false);
    const result = await scoreAttempt(1, {});
    expect(result.success).toBe(false);
  });

  it("rejects unauthenticated users (no session)", async () => {
    vi.mocked(isServerAuthConfigured).mockReturnValue(true);
    vi.mocked(getServerRole).mockResolvedValue(null);
    const result = await scoreAttempt(1, {});
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain("student");
  });

  it("rejects admin role", async () => {
    vi.mocked(isServerAuthConfigured).mockReturnValue(true);
    vi.mocked(getServerRole).mockResolvedValue("admin");
    const result = await scoreAttempt(1, {});
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain("student");
  });

  it("rejects super-admin role", async () => {
    vi.mocked(isServerAuthConfigured).mockReturnValue(true);
    vi.mocked(getServerRole).mockResolvedValue("super-admin");
    const result = await scoreAttempt(1, {});
    expect(result.success).toBe(false);
  });
});

// ─── scoreAttempt — input validation ─────────────────────────────────────────

describe("scoreAttempt — input validation", () => {
  it("rejects a non-integer testId (string)", async () => {
    authorisedStudent();
    const result = await scoreAttempt("3", {});
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain("Invalid test ID");
  });

  it("rejects a zero testId", async () => {
    authorisedStudent();
    const result = await scoreAttempt(0, {});
    expect(result.success).toBe(false);
  });

  it("rejects a negative testId", async () => {
    authorisedStudent();
    const result = await scoreAttempt(-5, {});
    expect(result.success).toBe(false);
  });

  it("rejects a float testId", async () => {
    authorisedStudent();
    const result = await scoreAttempt(1.5, {});
    expect(result.success).toBe(false);
  });

  it("rejects a null answers payload", async () => {
    authorisedStudent();
    const result = await scoreAttempt(1, null);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain("Invalid answer payload");
  });

  it("rejects an array answers payload", async () => {
    authorisedStudent();
    const result = await scoreAttempt(1, ["A", "B"]);
    expect(result.success).toBe(false);
  });

  it("rejects answers with non-numeric keys", async () => {
    authorisedStudent();
    const result = await scoreAttempt(1, { evil: "A" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain("Invalid answer payload");
  });

  it("rejects a tampered answer value (not A/B/C/D)", async () => {
    authorisedStudent();
    const result = await scoreAttempt(1, { 12: "E" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain("Invalid answer value");
  });

  it("rejects a tampered answer value (number)", async () => {
    authorisedStudent();
    const result = await scoreAttempt(1, { 12: 1 });
    expect(result.success).toBe(false);
  });
});

// ─── scoreAttempt — test accessibility ───────────────────────────────────────

describe("scoreAttempt — test accessibility", () => {
  it("returns an error for a nonexistent test", async () => {
    authorisedStudent();
    vi.mocked(prisma.placementTest.findFirst).mockResolvedValue(null);
    const result = await scoreAttempt(999, {});
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toMatch(/not found|not available/i);
  });

  it("returns an error for an unpublished custom test (not default, not published)", async () => {
    authorisedStudent();
    // findFirst returns null because the WHERE clause excludes it
    vi.mocked(prisma.placementTest.findFirst).mockResolvedValue(null);
    const result = await scoreAttempt(5, {});
    expect(result.success).toBe(false);
  });

  it("queries only default OR published tests", async () => {
    authorisedStudent();
    vi.mocked(prisma.placementTest.findFirst).mockResolvedValue(null);
    await scoreAttempt(3, {});
    expect(prisma.placementTest.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [{ isDefault: true }, { isPublished: true }],
        }),
      }),
    );
  });
});

// ─── scoreAttempt — scoring logic ────────────────────────────────────────────

describe("scoreAttempt — scoring logic", () => {
  it("scores a fully answered test correctly", async () => {
    authorisedStudent();
    vi.mocked(prisma.placementTest.findFirst).mockResolvedValue(MOCK_SCORE_TEST as never);
    // q12 correct (A), q13 incorrect (B, correct is C)
    const result = await scoreAttempt(3, { 12: "A", 13: "B" });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.totalQuestions).toBe(2);
    expect(result.answeredCount).toBe(2);
    expect(result.correctCount).toBe(1);
    expect(result.percentage).toBe(50);
  });

  it("scores a partially answered test correctly", async () => {
    authorisedStudent();
    vi.mocked(prisma.placementTest.findFirst).mockResolvedValue(MOCK_SCORE_TEST as never);
    // only q12 answered correctly
    const result = await scoreAttempt(3, { 12: "A" });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.totalQuestions).toBe(2);
    expect(result.answeredCount).toBe(1);
    expect(result.correctCount).toBe(1);
    expect(result.percentage).toBe(50);
  });

  it("returns a score of zero for a completely unanswered test", async () => {
    authorisedStudent();
    vi.mocked(prisma.placementTest.findFirst).mockResolvedValue(MOCK_SCORE_TEST as never);
    const result = await scoreAttempt(3, {});
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.correctCount).toBe(0);
    expect(result.answeredCount).toBe(0);
    expect(result.percentage).toBe(0);
  });

  it("represents unanswered questions with studentAnswer: null and isCorrect: false", async () => {
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

  it("calculates percentage correctly for all correct answers", async () => {
    authorisedStudent();
    vi.mocked(prisma.placementTest.findFirst).mockResolvedValue(MOCK_SCORE_TEST as never);
    const result = await scoreAttempt(3, { 12: "A", 13: "C" });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.correctCount).toBe(2);
    expect(result.percentage).toBe(100);
  });

  it("handles a zero-question test safely without division by zero", async () => {
    authorisedStudent();
    vi.mocked(prisma.placementTest.findFirst).mockResolvedValue({
      id: 99,
      questions: [],
    } as never);
    const result = await scoreAttempt(99, {});
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.totalQuestions).toBe(0);
    expect(result.percentage).toBe(0);
    expect(result.questionResults).toHaveLength(0);
  });

  it("question results only contain questions from the selected test", async () => {
    authorisedStudent();
    vi.mocked(prisma.placementTest.findFirst).mockResolvedValue(MOCK_SCORE_TEST as never);
    const result = await scoreAttempt(3, { 12: "A", 13: "C" });
    expect(result.success).toBe(true);
    if (!result.success) return;
    const ids = result.questionResults.map((r) => r.questionId);
    expect(ids).toEqual([12, 13]);
  });

  it("correctAnswer in results matches the database value, not client input", async () => {
    authorisedStudent();
    vi.mocked(prisma.placementTest.findFirst).mockResolvedValue(MOCK_SCORE_TEST as never);
    // Student sends wrong answer for q12
    const result = await scoreAttempt(3, { 12: "B" });
    expect(result.success).toBe(true);
    if (!result.success) return;
    const q12 = result.questionResults.find((r) => r.questionId === 12);
    expect(q12?.correctAnswer).toBe("A");
    expect(q12?.studentAnswer).toBe("B");
    expect(q12?.isCorrect).toBe(false);
  });
});

// ─── scoreAttempt — database error handling ───────────────────────────────────

describe("scoreAttempt — database error handling", () => {
  it("handles database errors safely and returns a friendly error", async () => {
    authorisedStudent();
    vi.mocked(prisma.placementTest.findFirst).mockRejectedValue(
      new Error("DB connection failed"),
    );
    const result = await scoreAttempt(3, { 12: "A" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toMatch(/could not score|please try again/i);
  });
});
