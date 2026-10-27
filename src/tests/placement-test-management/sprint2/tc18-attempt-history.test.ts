// @vitest-environment node
/**
 * TC-18: Test Result History and Retakes
 *
 * SRS REQ-18: Every attempt is stored separately. Each attempt stores the
 * score, percentage, timestamp, and question-wise correctness. Previous
 * attempts remain available. A student can view their own attempts.
 * One student must not access another student's results.
 *
 * These tests use Vitest with mocked Prisma and server-auth dependencies.
 * They do NOT prove that MySQL persistence works against a real database —
 * that requires the migration to be applied and an integration test run.
 */

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
      findFirst: vi.fn(),
    },
    testAttempt: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import {
  scoreAttempt,
  getAttemptHistory,
} from "@/app/student/assessments/actions";
import { getServerRole, getServerEmail, isServerAuthConfigured } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const STUDENT_EMAIL = "student@gmail.com";
const NOW = new Date("2026-10-29T10:00:00.000Z");

const MOCK_SCORE_TEST = {
  id: 3,
  questions: [
    { question: { id: 12, correctOption: "A" as const } },
    { question: { id: 13, correctOption: "C" as const } },
  ],
};

const MOCK_ATTEMPT_ROW = {
  id: 1,
  studentId: STUDENT_EMAIL,
  testId: 3,
  correctCount: 1,
  totalQuestions: 2,
  percentage: 50,
  completedAt: NOW,
  answers: [
    { questionId: 12, studentAnswer: "A", correctAnswer: "A", isCorrect: true },
    { questionId: 13, studentAnswer: "B", correctAnswer: "C", isCorrect: false },
  ],
};

function authorisedStudent(email = STUDENT_EMAIL) {
  vi.mocked(isServerAuthConfigured).mockReturnValue(true);
  vi.mocked(getServerRole).mockResolvedValue("student");
  vi.mocked(getServerEmail).mockResolvedValue(email);
}

beforeEach(() => { vi.clearAllMocks(); });

// ─── TC-18: Persistence on submission ────────────────────────────────────────

describe("TC-18 — a submitted attempt is persisted", () => {
  it("creates a TestAttempt row after successful scoring", async () => {
    authorisedStudent();
    vi.mocked(prisma.placementTest.findFirst).mockResolvedValue(MOCK_SCORE_TEST as never);
    vi.mocked(prisma.testAttempt.create).mockResolvedValue(MOCK_ATTEMPT_ROW as never);

    const result = await scoreAttempt(3, { 12: "A", 13: "B" });

    expect(result.success).toBe(true);
    expect(prisma.testAttempt.create).toHaveBeenCalledOnce();
    expect(prisma.testAttempt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          studentId: STUDENT_EMAIL,
          testId: 3,
          correctCount: 1,
          totalQuestions: 2,
        }),
      }),
    );
  });

  it("returns the persisted attempt ID on success", async () => {
    authorisedStudent();
    vi.mocked(prisma.placementTest.findFirst).mockResolvedValue(MOCK_SCORE_TEST as never);
    vi.mocked(prisma.testAttempt.create).mockResolvedValue({ id: 42 } as never);

    const result = await scoreAttempt(3, { 12: "A", 13: "B" });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.attemptId).toBe(42);
  });

  it("does not score or persist when the authenticated student email is missing", async () => {
    vi.mocked(isServerAuthConfigured).mockReturnValue(true);
    vi.mocked(getServerRole).mockResolvedValue("student");
    vi.mocked(getServerEmail).mockResolvedValue(null);
    vi.mocked(prisma.placementTest.findFirst).mockResolvedValue(MOCK_SCORE_TEST as never);

    const result = await scoreAttempt(3, { 12: "A", 13: "B" });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toMatch(/identify the current student session/i);
    expect(prisma.testAttempt.create).not.toHaveBeenCalled();
  });

  it("stores the correct score in the persisted attempt", async () => {
    authorisedStudent();
    vi.mocked(prisma.placementTest.findFirst).mockResolvedValue(MOCK_SCORE_TEST as never);
    vi.mocked(prisma.testAttempt.create).mockResolvedValue(MOCK_ATTEMPT_ROW as never);

    const result = await scoreAttempt(3, { 12: "A", 13: "C" }); // both correct

    expect(result.success).toBe(true);
    expect(prisma.testAttempt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          correctCount: 2,
          percentage: 100,
        }),
      }),
    );
  });

  it("stores the correct percentage in the persisted attempt", async () => {
    authorisedStudent();
    vi.mocked(prisma.placementTest.findFirst).mockResolvedValue(MOCK_SCORE_TEST as never);
    vi.mocked(prisma.testAttempt.create).mockResolvedValue(MOCK_ATTEMPT_ROW as never);

    await scoreAttempt(3, { 12: "A", 13: "B" }); // 1/2 = 50%

    expect(prisma.testAttempt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ percentage: 50 }),
      }),
    );
  });

  it("stores question-wise results (answers JSON) in the persisted attempt", async () => {
    authorisedStudent();
    vi.mocked(prisma.placementTest.findFirst).mockResolvedValue(MOCK_SCORE_TEST as never);
    vi.mocked(prisma.testAttempt.create).mockResolvedValue(MOCK_ATTEMPT_ROW as never);

    await scoreAttempt(3, { 12: "A", 13: "B" });

    const call = vi.mocked(prisma.testAttempt.create).mock.calls[0][0];
    const answers = call.data.answers as { questionId: number; isCorrect: boolean }[];
    expect(answers).toHaveLength(2);
    expect(answers[0]).toMatchObject({ questionId: 12, isCorrect: true });
    expect(answers[1]).toMatchObject({ questionId: 13, isCorrect: false });
  });

  it("stores unanswered questions with studentAnswer: null", async () => {
    authorisedStudent();
    vi.mocked(prisma.placementTest.findFirst).mockResolvedValue(MOCK_SCORE_TEST as never);
    vi.mocked(prisma.testAttempt.create).mockResolvedValue(MOCK_ATTEMPT_ROW as never);

    await scoreAttempt(3, {}); // no answers

    const call = vi.mocked(prisma.testAttempt.create).mock.calls[0][0];
    const answers = call.data.answers as { studentAnswer: string | null; isCorrect: boolean }[];
    expect(answers.every((a) => a.studentAnswer === null)).toBe(true);
    expect(answers.every((a) => !a.isCorrect)).toBe(true);
  });

  it("uses the student email from the verified session — never from client input", async () => {
    authorisedStudent("student@gmail.com");
    vi.mocked(prisma.placementTest.findFirst).mockResolvedValue(MOCK_SCORE_TEST as never);
    vi.mocked(prisma.testAttempt.create).mockResolvedValue(MOCK_ATTEMPT_ROW as never);

    await scoreAttempt(3, { 12: "A" });

    expect(prisma.testAttempt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ studentId: "student@gmail.com" }),
      }),
    );
  });

  it("handles persistence failure safely and returns an error", async () => {
    authorisedStudent();
    vi.mocked(prisma.placementTest.findFirst).mockResolvedValue(MOCK_SCORE_TEST as never);
    vi.mocked(prisma.testAttempt.create).mockRejectedValue(new Error("DB write failed"));

    const result = await scoreAttempt(3, { 12: "A" });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toMatch(/could not score|please try again/i);
    expect("attemptId" in result).toBe(false);
  });
});

// ─── TC-18: Second submission creates a separate attempt ──────────────────────

describe("TC-18 — a retake creates a new separate attempt", () => {
  it("calls testAttempt.create twice for two submissions", async () => {
    authorisedStudent();
    vi.mocked(prisma.placementTest.findFirst).mockResolvedValue(MOCK_SCORE_TEST as never);
    vi.mocked(prisma.testAttempt.create)
      .mockResolvedValueOnce({ id: 1 } as never)
      .mockResolvedValueOnce({ id: 2 } as never);

    const first = await scoreAttempt(3, { 12: "A", 13: "C" });
    const second = await scoreAttempt(3, { 12: "B", 13: "B" });

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    expect(prisma.testAttempt.create).toHaveBeenCalledTimes(2);

    if (!first.success || !second.success) return;
    expect(first.attemptId).toBe(1);
    expect(second.attemptId).toBe(2);
  });

  it("each attempt stores its own score independently", async () => {
    authorisedStudent();
    vi.mocked(prisma.placementTest.findFirst).mockResolvedValue(MOCK_SCORE_TEST as never);
    vi.mocked(prisma.testAttempt.create)
      .mockResolvedValueOnce({ id: 1 } as never)
      .mockResolvedValueOnce({ id: 2 } as never);

    await scoreAttempt(3, { 12: "A", 13: "C" }); // 2 correct
    await scoreAttempt(3, { 12: "B", 13: "B" }); // 0 correct

    const calls = vi.mocked(prisma.testAttempt.create).mock.calls;
    expect(calls[0][0].data.correctCount).toBe(2);
    expect(calls[1][0].data.correctCount).toBe(0);
  });
});

// ─── TC-18: History retrieval ─────────────────────────────────────────────────

describe("TC-18 — getAttemptHistory returns the student's own attempts", () => {
  it("returns an empty list when the student has no attempts", async () => {
    authorisedStudent();
    vi.mocked(prisma.placementTest.findFirst).mockResolvedValue({ id: 3 } as never);
    vi.mocked(prisma.testAttempt.findMany).mockResolvedValue([]);

    const result = await getAttemptHistory(3);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toEqual([]);
  });

  it("returns the correct attempt data including timestamp", async () => {
    authorisedStudent();
    vi.mocked(prisma.placementTest.findFirst).mockResolvedValue({ id: 3 } as never);
    vi.mocked(prisma.testAttempt.findMany).mockResolvedValue([MOCK_ATTEMPT_ROW as never]);

    const result = await getAttemptHistory(3);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toHaveLength(1);
    expect(result.data[0].correctCount).toBe(1);
    expect(result.data[0].totalQuestions).toBe(2);
    expect(result.data[0].percentage).toBe(50);
    expect(result.data[0].completedAt).toBe(NOW.toISOString());
  });

  it("returns question-wise results from the attempt", async () => {
    authorisedStudent();
    vi.mocked(prisma.placementTest.findFirst).mockResolvedValue({ id: 3 } as never);
    vi.mocked(prisma.testAttempt.findMany).mockResolvedValue([MOCK_ATTEMPT_ROW as never]);

    const result = await getAttemptHistory(3);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data[0].questionResults).toHaveLength(2);
    expect(result.data[0].questionResults[0]).toMatchObject({
      questionId: 12, studentAnswer: "A", correctAnswer: "A", isCorrect: true,
    });
  });

  it("queries the database using the session email — not a client-supplied ID", async () => {
    authorisedStudent("student@gmail.com");
    vi.mocked(prisma.placementTest.findFirst).mockResolvedValue({ id: 3 } as never);
    vi.mocked(prisma.testAttempt.findMany).mockResolvedValue([]);

    await getAttemptHistory(3);

    expect(prisma.testAttempt.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ studentId: "student@gmail.com", testId: 3 }),
      }),
    );
  });

  it("a student cannot retrieve another student's history by changing the request", async () => {
    // studentA is signed in; they call getAttemptHistory(3).
    // The DB is queried with studentA's email, so studentB's rows are never returned.
    authorisedStudent("student@gmail.com");
    vi.mocked(prisma.placementTest.findFirst).mockResolvedValue({ id: 3 } as never);

    // The mocked result represents rows returned for the server-scoped student filter.
    vi.mocked(prisma.testAttempt.findMany).mockResolvedValue([MOCK_ATTEMPT_ROW]);

    const result = await getAttemptHistory(3);

    expect(result.success).toBe(true);
    if (!result.success) return;
    // The result contains only the authenticated student's attempt.
    expect(result.data).toMatchObject([
      { id: 1, correctCount: 1, totalQuestions: 2, percentage: 50 },
    ]);
    expect(prisma.testAttempt.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ studentId: "student@gmail.com" }),
      }),
    );
  });

  it("rejects non-student role from accessing history", async () => {
    vi.mocked(isServerAuthConfigured).mockReturnValue(true);
    vi.mocked(getServerRole).mockResolvedValue("admin");
    vi.mocked(getServerEmail).mockResolvedValue("admin@gmail.com");

    const result = await getAttemptHistory(3);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain("student");
  });

  it("rejects an invalid (non-positive) test ID", async () => {
    authorisedStudent();
    const result = await getAttemptHistory(0);
    expect(result.success).toBe(false);
  });

  it("returns an error when the test is not accessible to students", async () => {
    authorisedStudent();
    vi.mocked(prisma.placementTest.findFirst).mockResolvedValue(null);

    const result = await getAttemptHistory(999);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toMatch(/not found|not available/i);
  });

  it("handles database errors safely", async () => {
    authorisedStudent();
    vi.mocked(prisma.placementTest.findFirst).mockResolvedValue({ id: 3 } as never);
    vi.mocked(prisma.testAttempt.findMany).mockRejectedValue(new Error("DB error"));

    const result = await getAttemptHistory(3);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toMatch(/could not load|please try again/i);
  });
});

// ─── TC-18: Existing scoring still works ─────────────────────────────────────

describe("TC-18 — existing scoring functionality is preserved", () => {
  it("still calculates scores correctly after adding persistence", async () => {
    authorisedStudent();
    vi.mocked(prisma.placementTest.findFirst).mockResolvedValue(MOCK_SCORE_TEST as never);
    vi.mocked(prisma.testAttempt.create).mockResolvedValue({ id: 1 } as never);

    const result = await scoreAttempt(3, { 12: "A", 13: "C" });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.correctCount).toBe(2);
    expect(result.percentage).toBe(100);
    expect(result.totalQuestions).toBe(2);
  });

  it("still handles zero-question tests without division by zero", async () => {
    authorisedStudent();
    vi.mocked(prisma.placementTest.findFirst).mockResolvedValue({ id: 99, questions: [] } as never);

    const result = await scoreAttempt(99, {});

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.totalQuestions).toBe(0);
    expect(result.percentage).toBe(0);
    expect(prisma.testAttempt.create).not.toHaveBeenCalled();
  });

  it("still rejects invalid test ID", async () => {
    authorisedStudent();
    const result = await scoreAttempt(-1, {});
    expect(result.success).toBe(false);
  });

  it("still rejects non-student role", async () => {
    vi.mocked(isServerAuthConfigured).mockReturnValue(true);
    vi.mocked(getServerRole).mockResolvedValue("admin");
    vi.mocked(getServerEmail).mockResolvedValue("admin@gmail.com");

    const result = await scoreAttempt(3, {});
    expect(result.success).toBe(false);
  });
});
