"use server";

import { prisma } from "@/lib/prisma";
import {
  isAnswerOption,
  isPlacementDifficulty,
  isPlacementDomain,
  type AnswerOption,
  type PlacementDifficulty,
  type PlacementDomain,
} from "@/lib/assessment-options";
import { getServerRole, isServerAuthConfigured } from "@/lib/server-auth";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

export type QuestionInput = {
  prompt: string;
  options: [string, string, string, string];
  correctOption: AnswerOption;
  domain: PlacementDomain;
  difficulty: PlacementDifficulty;
};

export type TestInput = {
  title: string;
  description: string;
  domain: PlacementDomain;
  difficulty: PlacementDifficulty;
  questionIds: number[];
};

export type QuestionRecord = QuestionInput & { id: number };

export type TestRecord = {
  id: number;
  title: string;
  description: string | null;
  domain: PlacementDomain;
  difficulty: PlacementDifficulty;
  isDefault: boolean;
  isPublished: boolean;
  questions: QuestionRecord[];
};

function isQuestionOptions(
  value: unknown,
): value is [string, string, string, string] {
  return (
    Array.isArray(value) &&
    value.length === 4 &&
    value.every((option: unknown) => typeof option === "string")
  );
}

function isQuestionIdList(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.every(
      (id: unknown) => Number.isSafeInteger(id) && typeof id === "number" && id > 0,
    )
  );
}

async function authorizationError() {
  if (!isServerAuthConfigured()) {
    return "Server authentication is not configured. Set AUTH_SESSION_SECRET to a random value with at least 32 characters.";
  }

  const role = await getServerRole();
  if (role !== "admin" && role !== "super-admin") {
    return "You must sign in with an administrator account to manage questions and tests.";
  }

  return null;
}

function parseQuestionInput(input: unknown): QuestionInput | string {
  if (typeof input !== "object" || input === null) {
    return "Enter a valid question.";
  }

  const record = input as Record<string, unknown>;
  const prompt = typeof record.prompt === "string" ? record.prompt.trim() : "";
  const domain = record.domain;
  const difficulty = record.difficulty;
  const correctOption = record.correctOption;
  const options = record.options;

  if (!prompt || prompt.length > 5000) return "Question text is required and must be under 5,000 characters.";
  if (!isPlacementDomain(domain)) return "Choose a valid question domain.";
  if (!isPlacementDifficulty(difficulty)) return "Choose a valid question difficulty.";
  if (!isAnswerOption(correctOption)) return "Choose exactly one correct answer.";
  if (!isQuestionOptions(options)) {
    return "Provide exactly four answer options.";
  }

  const normalizedOptions = options.map((option) => option.trim());
  if (normalizedOptions.some((option) => !option || option.length > 1000)) {
    return "All four answer options are required and must be under 1,000 characters.";
  }
  if (new Set(normalizedOptions.map((option) => option.toLocaleLowerCase())).size !== 4) {
    return "Answer options must be distinct.";
  }

  return {
    prompt,
    options: [
      normalizedOptions[0],
      normalizedOptions[1],
      normalizedOptions[2],
      normalizedOptions[3],
    ],
    correctOption,
    domain,
    difficulty,
  };
}

function parseTestInput(input: unknown): TestInput | string {
  if (typeof input !== "object" || input === null) {
    return "Enter a valid test.";
  }

  const record = input as Record<string, unknown>;
  const title = typeof record.title === "string" ? record.title.trim() : "";
  const description =
    typeof record.description === "string" ? record.description.trim() : "";
  const domain = record.domain;
  const difficulty = record.difficulty;
  const questionIds = record.questionIds;

  if (!title || title.length > 191) return "Test title is required and must be under 192 characters.";
  if (description.length > 5000) return "Test description must be under 5,000 characters.";
  if (!isPlacementDomain(domain)) return "Choose a valid test domain.";
  if (!isPlacementDifficulty(difficulty)) return "Choose a valid test difficulty.";
  if (!isQuestionIdList(questionIds) || questionIds.length === 0) {
    return "Select at least one valid question for the test.";
  }
  if (new Set(questionIds).size !== questionIds.length) {
    return "A question can only appear once in a test.";
  }

  return {
    title,
    description,
    domain,
    difficulty,
    questionIds,
  };
}

function isValidId(id: number) {
  return Number.isSafeInteger(id) && id > 0;
}

function toQuestionRecord(question: {
  id: number;
  prompt: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: AnswerOption;
  domain: PlacementDomain;
  difficulty: PlacementDifficulty;
}): QuestionRecord {
  return {
    id: question.id,
    prompt: question.prompt,
    options: [question.optionA, question.optionB, question.optionC, question.optionD],
    correctOption: question.correctOption,
    domain: question.domain,
    difficulty: question.difficulty,
  };
}

export async function listQuestionBank(domain?: PlacementDomain): Promise<ActionResult<{
  questions: QuestionRecord[];
  tests: TestRecord[];
}>> {
  const authError = await authorizationError();
  if (authError) return { success: false, error: authError };

  try {
    const questionWhere = domain ? { domain } : {};
    const testWhere = domain ? { domain } : {};

    const [questions, tests] = await Promise.all([
      prisma.question.findMany({
        where: questionWhere,
        orderBy: [{ domain: "asc" }, { difficulty: "asc" }, { id: "desc" }],
      }),
      prisma.placementTest.findMany({
        where: testWhere,
        orderBy: [{ isDefault: "desc" }, { difficulty: "asc" }, { id: "desc" }],
        include: {
          questions: {
            orderBy: { order: "asc" },
            include: { question: true },
          },
        },
      }),
    ]);

    return {
      success: true,
      data: {
        questions: questions.map(toQuestionRecord),
        tests: tests.map((test) => ({
          id: test.id,
          title: test.title,
          description: test.description,
          domain: test.domain,
          difficulty: test.difficulty,
          isDefault: test.isDefault,
          isPublished: test.isPublished,
          questions: test.questions.map(({ question }) => toQuestionRecord(question)),
        })),
      },
    };
  } catch (error) {
    console.error("Failed to load the question bank and tests.", error);
    return {
      success: false,
      error: "Could not load the question bank. Check database availability and whether the Issue #25 schema has been applied.",
    };
  }
}

export async function createQuestion(input: unknown): Promise<ActionResult> {
  const authError = await authorizationError();
  if (authError) return { success: false, error: authError };

  const parsed = parseQuestionInput(input);
  if (typeof parsed === "string") return { success: false, error: parsed };

  try {
    await prisma.question.create({
      data: {
        prompt: parsed.prompt,
        optionA: parsed.options[0],
        optionB: parsed.options[1],
        optionC: parsed.options[2],
        optionD: parsed.options[3],
        correctOption: parsed.correctOption,
        domain: parsed.domain,
        difficulty: parsed.difficulty,
      },
    });
    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to create a question.", error);
    return { success: false, error: "Could not save the question. Try again." };
  }
}

export async function updateQuestion(id: number, input: unknown): Promise<ActionResult> {
  const authError = await authorizationError();
  if (authError) return { success: false, error: authError };
  if (!isValidId(id)) return { success: false, error: "Choose a valid question to update." };

  const parsed = parseQuestionInput(input);
  if (typeof parsed === "string") return { success: false, error: parsed };

  try {
    const assignments = await prisma.testQuestion.findMany({
      where: { questionId: id },
      select: { test: { select: { domain: true, difficulty: true } } },
    });
    if (
      assignments.some(
        ({ test }) => test.domain !== parsed.domain || test.difficulty !== parsed.difficulty,
      )
    ) {
      return {
        success: false,
        error: "Remove this question from its tests before changing its domain or difficulty.",
      };
    }

    await prisma.question.update({
      where: { id },
      data: {
        prompt: parsed.prompt,
        optionA: parsed.options[0],
        optionB: parsed.options[1],
        optionC: parsed.options[2],
        optionD: parsed.options[3],
        correctOption: parsed.correctOption,
        domain: parsed.domain,
        difficulty: parsed.difficulty,
      },
    });
    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to update a question.", error);
    return { success: false, error: "Could not update the question. It may have been removed; reload and try again." };
  }
}

export async function deleteQuestion(id: number): Promise<ActionResult> {
  const authError = await authorizationError();
  if (authError) return { success: false, error: authError };
  if (!isValidId(id)) return { success: false, error: "Choose a valid question to delete." };

  try {
    await prisma.question.delete({ where: { id } });
    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to delete a question.", error);
    return { success: false, error: "Could not delete the question. It may have been removed; reload and try again." };
  }
}

async function matchingQuestionIds(input: TestInput) {
  const questions = await prisma.question.findMany({
    where: {
      id: { in: input.questionIds },
      domain: input.domain,
      difficulty: input.difficulty,
    },
    select: { id: true },
  });
  return questions.length === input.questionIds.length;
}

export async function createPlacementTest(input: unknown): Promise<ActionResult> {
  const authError = await authorizationError();
  if (authError) return { success: false, error: authError };

  const parsed = parseTestInput(input);
  if (typeof parsed === "string") return { success: false, error: parsed };

  try {
    if (!(await matchingQuestionIds(parsed))) {
      return {
        success: false,
        error: "Tests can only contain existing questions with the same domain and difficulty.",
      };
    }

    await prisma.placementTest.create({
      data: {
        title: parsed.title,
        description: parsed.description || null,
        domain: parsed.domain,
        difficulty: parsed.difficulty,
        isDefault: false,
        isPublished: false,
        questions: {
          create: parsed.questionIds.map((questionId, index) => ({
            order: index + 1,
            question: { connect: { id: questionId } },
          })),
        },
      },
    });
    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to create a placement test.", error);
    return { success: false, error: "Could not save the test. Try again." };
  }
}

export async function updatePlacementTest(
  id: number,
  input: unknown,
): Promise<ActionResult> {
  const authError = await authorizationError();
  if (authError) return { success: false, error: authError };
  if (!isValidId(id)) return { success: false, error: "Choose a valid test to update." };

  const parsed = parseTestInput(input);
  if (typeof parsed === "string") return { success: false, error: parsed };

  try {
    if (!(await matchingQuestionIds(parsed))) {
      return {
        success: false,
        error: "Tests can only contain existing questions with the same domain and difficulty.",
      };
    }

    await prisma.placementTest.update({
      where: { id },
      data: {
        title: parsed.title,
        description: parsed.description || null,
        domain: parsed.domain,
        difficulty: parsed.difficulty,
        questions: {
          deleteMany: {},
          create: parsed.questionIds.map((questionId, index) => ({
            order: index + 1,
            question: { connect: { id: questionId } },
          })),
        },
      },
    });
    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to update a placement test.", error);
    return { success: false, error: "Could not update the test. It may have been removed; reload and try again." };
  }
}

export async function deletePlacementTest(id: number): Promise<ActionResult> {
  const authError = await authorizationError();
  if (authError) return { success: false, error: authError };
  if (!isValidId(id)) return { success: false, error: "Choose a valid test to delete." };

  try {
    const test = await prisma.placementTest.findUnique({
      where: { id },
      select: { isDefault: true },
    });

    if (test?.isDefault) {
      return {
        success: false,
        error: "Default tests cannot be deleted. They are part of the standard curriculum.",
      };
    }

    await prisma.placementTest.delete({ where: { id } });
    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to delete a placement test.", error);
    return { success: false, error: "Could not delete the test. It may have been removed; reload and try again." };
  }
}

export async function publishPlacementTest(id: number): Promise<ActionResult> {
  const authError = await authorizationError();
  if (authError) return { success: false, error: authError };
  if (!isValidId(id)) return { success: false, error: "Choose a valid test to publish." };

  try {
    const test = await prisma.placementTest.findUnique({
      where: { id },
      select: { isDefault: true },
    });

    if (!test) {
      return { success: false, error: "Test not found. It may have been removed; reload and try again." };
    }

    // Default tests are always published; no action needed but not an error.
    if (test.isDefault) {
      return { success: true, data: undefined };
    }

    await prisma.placementTest.update({
      where: { id },
      data: { isPublished: true },
    });
    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to publish a placement test.", error);
    return { success: false, error: "Could not publish the test. Try again." };
  }
}

export async function unpublishPlacementTest(id: number): Promise<ActionResult> {
  const authError = await authorizationError();
  if (authError) return { success: false, error: authError };
  if (!isValidId(id)) return { success: false, error: "Choose a valid test to unpublish." };

  try {
    const test = await prisma.placementTest.findUnique({
      where: { id },
      select: { isDefault: true },
    });

    if (!test) {
      return { success: false, error: "Test not found. It may have been removed; reload and try again." };
    }

    if (test.isDefault) {
      return {
        success: false,
        error: "Default tests cannot be unpublished. They are always available to students.",
      };
    }

    await prisma.placementTest.update({
      where: { id },
      data: { isPublished: false },
    });
    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to unpublish a placement test.", error);
    return { success: false, error: "Could not unpublish the test. Try again." };
  }
}
