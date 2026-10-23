"use server";

import { prisma } from "@/lib/prisma";
import type { PlacementDifficulty, PlacementDomain, AnswerOption } from "@/lib/assessment-options";
import { isPlacementDomain, isAnswerOption } from "@/lib/assessment-options";
import { getServerRole, isServerAuthConfigured } from "@/lib/server-auth";

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
    }
  | { success: false; error: string };

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

  // Validate domain if provided
  if (domain !== undefined && !isPlacementDomain(domain)) {
    return {
      success: false,
      error: "Choose a valid domain to browse practice tests.",
    };
  }

  try {
    const tests = await prisma.placementTest.findMany({
      where: {
        // Only show tests that are default (always visible) OR explicitly published by an admin.
        OR: [{ isDefault: true }, { isPublished: true }],
        // Narrow to a specific domain when one is selected.
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
                // correctOption is deliberately NOT selected — never expose before submission.
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

  // Validate testId is a positive integer.
  if (
    typeof testId !== "number" ||
    !Number.isInteger(testId) ||
    testId <= 0
  ) {
    return { success: false, error: "Invalid test ID." };
  }

  // Validate submitted answers: must be a plain object with AnswerOption values.
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
      return {
        success: false,
        error: "Test not found or not available.",
      };
    }

    const totalQuestions = test.questions.length;

    if (totalQuestions === 0) {
      return {
        success: true,
        totalQuestions: 0,
        answeredCount: 0,
        correctCount: 0,
        percentage: 0,
        questionResults: [],
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

    return {
      success: true,
      totalQuestions,
      answeredCount,
      correctCount,
      percentage,
      questionResults,
    };
  } catch (error) {
    console.error("Failed to score placement test attempt.", error);
    return {
      success: false,
      error: "Could not score the test. Please try again.",
    };
  }
}
