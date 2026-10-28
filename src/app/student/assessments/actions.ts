"use server";

import { prisma } from "@/lib/prisma";
import type { PlacementDifficulty, PlacementDomain, AnswerOption } from "@/lib/assessment-options";
import { isPlacementDomain, isAnswerOption } from "@/lib/assessment-options";
import { getServerRole, getServerEmail, isServerAuthConfigured } from "@/lib/server-auth";

// ─── Public types ─────────────────────────────────────────────────────────────

export type AvailablePlacementTest = {
  id: number;
  title: string;
  description: string | null;
  domain: PlacementDomain;
  difficulty: PlacementDifficulty;
  isDefault: boolean;
  questions: {
    id: number;
    prompt: string;
    options: [string, string, string, string];
  }[];
};

export type AvailableTestsResult =
  | { success: true; data: AvailablePlacementTest[] }
  | { success: false; error: string };

export type QuestionResult = {
  questionId: number;
  studentAnswer: AnswerOption | null;
  correctAnswer: AnswerOption;
  isCorrect: boolean;
};

export type ScoreResult =
  | {
      success: true;
      totalQuestions: number;
      answeredCount: number;
      correctCount: number;
      percentage: number;
      questionResults: QuestionResult[];
      /** Persisted attempt ID; null only for a zero-question test, which is not recorded. */
      attemptId: number | null;
    }
  | { success: false; error: string };

export type AttemptSummary = {
  id: number;
  correctCount: number;
  totalQuestions: number;
  percentage: number;
  completedAt: string; // ISO string — safe to pass from server to client
  questionResults: QuestionResult[];
};

export type AttemptHistoryResult =
  | { success: true; data: AttemptSummary[] }
  | { success: false; error: string };

// ─── listAvailablePlacementTests ──────────────────────────────────────────────

export async function listAvailablePlacementTests(
  domain?: PlacementDomain,
): Promise<AvailableTestsResult> {
  if (!isServerAuthConfigured()) {
    return {
      success: false,
      error: "Server authentication is not configured. Contact an administrator.",
    };
  }

  if ((await getServerRole()) !== "student") {
    return {
      success: false,
      error: "Sign in as a student to view available practice tests.",
    };
  }

  if (domain !== undefined && !isPlacementDomain(domain)) {
    return {
      success: false,
      error: "Choose a valid domain to browse practice tests.",
    };
  }

  try {
    const tests = await prisma.placementTest.findMany({
      where: {
        OR: [{ isDefault: true }, { isPublished: true }],
        ...(domain ? { domain } : {}),
      },
      orderBy: [{ isDefault: "desc" }, { difficulty: "asc" }, { id: "desc" }],
      select: {
        id: true,
        title: true,
        description: true,
        domain: true,
        difficulty: true,
        isDefault: true,
        questions: {
          orderBy: { order: "asc" },
          select: {
            question: {
              select: {
                id: true,
                prompt: true,
                optionA: true,
                optionB: true,
                optionC: true,
                optionD: true,
                // correctOption deliberately NOT selected — never expose before submission.
              },
            },
          },
        },
      },
    });

    return {
      success: true,
      data: tests.map((test) => ({
        id: test.id,
        title: test.title,
        description: test.description,
        domain: test.domain,
        difficulty: test.difficulty,
        isDefault: test.isDefault,
        questions: test.questions.map(({ question }) => ({
          id: question.id,
          prompt: question.prompt,
          options: [question.optionA, question.optionB, question.optionC, question.optionD],
        })),
      })),
    };
  } catch (error) {
    console.error("Failed to load available placement tests.", error);
    return {
      success: false,
      error: "Could not load available practice tests. Please try again.",
    };
  }
}

// ─── scoreAttempt ─────────────────────────────────────────────────────────────

export async function scoreAttempt(
  testId: unknown,
  submittedAnswers: unknown,
): Promise<ScoreResult> {
  if (!isServerAuthConfigured()) {
    return {
      success: false,
      error: "Server authentication is not configured. Contact an administrator.",
    };
  }

  if ((await getServerRole()) !== "student") {
    return {
      success: false,
      error: "Sign in as a student to submit a practice test.",
    };
  }

  if (
    typeof testId !== "number" ||
    !Number.isInteger(testId) ||
    testId <= 0
  ) {
    return { success: false, error: "Invalid test ID." };
  }

  if (
    typeof submittedAnswers !== "object" ||
    submittedAnswers === null ||
    Array.isArray(submittedAnswers)
  ) {
    return { success: false, error: "Invalid answer payload." };
  }

  const answersMap = submittedAnswers as Record<string, unknown>;
  for (const [key, value] of Object.entries(answersMap)) {
    if (!/^\d+$/.test(key)) {
      return { success: false, error: "Invalid answer payload." };
    }
    if (!isAnswerOption(value)) {
      return { success: false, error: "Invalid answer value." };
    }
  }

  try {
    const test = await prisma.placementTest.findFirst({
      where: {
        id: testId,
        OR: [{ isDefault: true }, { isPublished: true }],
      },
      select: {
        id: true,
        questions: {
          orderBy: { order: "asc" },
          select: {
            question: {
              select: {
                id: true,
                correctOption: true,
              },
            },
          },
        },
      },
    });

    if (!test) {
      return { success: false, error: "Test not found or not available." };
    }

    const totalQuestions = test.questions.length;

    if (totalQuestions === 0) {
      // Preserve the existing zero-question result without requiring or recording an attempt.
      return {
        success: true,
        totalQuestions: 0,
        answeredCount: 0,
        correctCount: 0,
        percentage: 0,
        questionResults: [],
        attemptId: null,
      };
    }

    // Re-verify the signed server session before scoring or persisting a non-empty test.
    // Student identity is never accepted from client input.
    const studentId = await getServerEmail();
    if (!studentId) {
      return {
        success: false,
        error: "Could not identify the current student session. Please sign in again.",
      };
    }

    let correctCount = 0;
    let answeredCount = 0;
    const questionResults: QuestionResult[] = test.questions.map(({ question }) => {
      const studentAnswer = (answersMap[String(question.id)] ?? null) as AnswerOption | null;
      const isCorrect = studentAnswer !== null && studentAnswer === question.correctOption;
      if (studentAnswer !== null) answeredCount++;
      if (isCorrect) correctCount++;
      return {
        questionId: question.id,
        studentAnswer,
        correctAnswer: question.correctOption as AnswerOption,
        isCorrect,
      };
    });

    const percentage = (correctCount / totalQuestions) * 100;

    const saved = await prisma.testAttempt.create({
      data: {
        studentId,
        testId,
        correctCount,
        totalQuestions,
        percentage,
        answers: questionResults as unknown as object[],
      },
      select: { id: true },
    });

    return {
      success: true,
      totalQuestions,
      answeredCount,
      correctCount,
      percentage,
      questionResults,
      attemptId: saved.id,
    };
  } catch (error) {
    console.error("Failed to score placement test attempt.", error);
    return {
      success: false,
      error: "Could not score the test. Please try again.",
    };
  }
}

// ─── getAttemptHistory ────────────────────────────────────────────────────────

export async function getAttemptHistory(
  testId: unknown,
): Promise<AttemptHistoryResult> {
  if (!isServerAuthConfigured()) {
    return {
      success: false,
      error: "Server authentication is not configured. Contact an administrator.",
    };
  }

  if ((await getServerRole()) !== "student") {
    return {
      success: false,
      error: "Sign in as a student to view attempt history.",
    };
  }

  if (
    typeof testId !== "number" ||
    !Number.isInteger(testId) ||
    testId <= 0
  ) {
    return { success: false, error: "Invalid test ID." };
  }

  // Confirm test exists and is accessible to students.
  const testExists = await prisma.placementTest.findFirst({
    where: { id: testId, OR: [{ isDefault: true }, { isPublished: true }] },
    select: { id: true },
  });
  if (!testExists) {
    return { success: false, error: "Test not found or not available." };
  }

  // studentId from session — never trusted from client.
  const studentId = await getServerEmail();
  if (!studentId) {
    return { success: false, error: "Could not identify the current student session." };
  }

  try {
    const attempts = await prisma.testAttempt.findMany({
      where: { studentId, testId },
      orderBy: { completedAt: "asc" },
      select: {
        id: true,
        correctCount: true,
        totalQuestions: true,
        percentage: true,
        completedAt: true,
        answers: true,
      },
    });

    return {
      success: true,
      data: attempts.map((a) => ({
        id: a.id,
        correctCount: a.correctCount,
        totalQuestions: a.totalQuestions,
        percentage: a.percentage,
        completedAt: a.completedAt.toISOString(),
        questionResults: a.answers as unknown as QuestionResult[],
      })),
    };
  } catch (error) {
    console.error("Failed to retrieve attempt history.", error);
    return {
      success: false,
      error: "Could not load attempt history. Please try again.",
    };
  }
}
