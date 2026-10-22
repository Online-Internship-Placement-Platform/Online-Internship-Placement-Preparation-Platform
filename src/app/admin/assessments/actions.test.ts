import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    question: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
    },
    placementTest: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    testQuestion: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/server-auth", () => ({
  getServerRole: vi.fn(),
  isServerAuthConfigured: vi.fn(),
}));

import {
  createPlacementTest,
  createQuestion,
  deleteQuestion,
  deletePlacementTest,
  updateQuestion,
  updatePlacementTest,
} from "@/app/admin/assessments/actions";
import { prisma } from "@/lib/prisma";
import { getServerRole, isServerAuthConfigured } from "@/lib/server-auth";

const validQuestion = {
  prompt: "  What does HTML stand for?  ",
  options: [" HyperText Markup Language ", "Option B", "Option C", "Option D"],
  correctOption: "A",
  domain: "WEB_DEVELOPMENT",
  difficulty: "EASY",
};

const validTest = {
  title: "  HTML basics  ",
  description: "  Introductory questions  ",
  domain: "WEB_DEVELOPMENT",
  difficulty: "EASY",
  questionIds: [12, 15],
};

describe("question and placement-test server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isServerAuthConfigured).mockReturnValue(true);
    vi.mocked(getServerRole).mockResolvedValue("admin");
    vi.mocked(prisma.question.create).mockResolvedValue({} as never);
    vi.mocked(prisma.question.update).mockResolvedValue({} as never);
    vi.mocked(prisma.question.delete).mockResolvedValue({} as never);
    vi.mocked(prisma.question.findMany).mockResolvedValue([]);
    vi.mocked(prisma.placementTest.create).mockResolvedValue({} as never);
    vi.mocked(prisma.placementTest.update).mockResolvedValue({} as never);
    vi.mocked(prisma.placementTest.delete).mockResolvedValue({} as never);
    vi.mocked(prisma.testQuestion.findMany).mockResolvedValue([]);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("validates question text, four distinct options, domain, difficulty, and correct answer", async () => {
    const invalidQuestions = [
      { ...validQuestion, prompt: "   " },
      { ...validQuestion, options: ["One", "Two", "Three"] },
      { ...validQuestion, options: ["Same", " same ", "Third", "Fourth"] },
      { ...validQuestion, domain: "UNKNOWN" },
      { ...validQuestion, difficulty: "EXPERT" },
      { ...validQuestion, correctOption: "E" },
    ];

    for (const input of invalidQuestions) {
      expect(await createQuestion(input)).toMatchObject({ success: false });
    }
    expect(prisma.question.create).not.toHaveBeenCalled();
  });

  it("enforces admin authorization before creating a question", async () => {
    vi.mocked(getServerRole).mockResolvedValueOnce("student");

    expect(await createQuestion(validQuestion)).toMatchObject({ success: false });
    expect(prisma.question.create).not.toHaveBeenCalled();
  });

  it("creates a question in Prisma with trimmed fields and individually mapped options", async () => {
    const result = await createQuestion(validQuestion);

    expect(result).toEqual({ success: true, data: undefined });
    expect(prisma.question.create).toHaveBeenCalledWith({
      data: {
        prompt: "What does HTML stand for?",
        optionA: "HyperText Markup Language",
        optionB: "Option B",
        optionC: "Option C",
        optionD: "Option D",
        correctOption: "A",
        domain: "WEB_DEVELOPMENT",
        difficulty: "EASY",
      },
    });
  });

  it("reports a useful error when Prisma question creation fails", async () => {
    vi.mocked(prisma.question.create).mockRejectedValue(new Error("database unavailable"));

    const result = await createQuestion(validQuestion);

    expect(result).toEqual({ success: false, error: "Could not save the question. Try again." });
  });

  it("edits a question and rejects tag changes that conflict with assigned tests", async () => {
    vi.mocked(prisma.testQuestion.findMany).mockResolvedValueOnce([]);
    const updated = await updateQuestion(7, { ...validQuestion, prompt: "Updated prompt" });

    expect(updated).toEqual({ success: true, data: undefined });
    expect(prisma.question.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: expect.objectContaining({ prompt: "Updated prompt" }),
    });

    vi.mocked(prisma.testQuestion.findMany).mockResolvedValueOnce([
      { test: { domain: "AI_ML", difficulty: "EASY" } },
    ] as never);
    const rejected = await updateQuestion(7, validQuestion);

    expect(rejected).toMatchObject({ success: false });
    expect(prisma.question.update).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid question IDs and reports Prisma deletion errors", async () => {
    expect(await updateQuestion(0, validQuestion)).toMatchObject({ success: false });
    expect(await deleteQuestion(-1)).toMatchObject({ success: false });
    expect(prisma.question.update).not.toHaveBeenCalled();
    expect(prisma.question.delete).not.toHaveBeenCalled();

    vi.mocked(prisma.question.delete).mockRejectedValue(new Error("database unavailable"));
    expect(await deleteQuestion(9)).toEqual({
      success: false,
      error: "Could not delete the question. It may have been removed; reload and try again.",
    });
  });

  it("deletes a valid question from Prisma", async () => {
    expect(await deleteQuestion(9)).toEqual({ success: true, data: undefined });
    expect(prisma.question.delete).toHaveBeenCalledWith({ where: { id: 9 } });
  });

  it("creates a placement test with ordered question relations after validating membership", async () => {
    vi.mocked(prisma.question.findMany).mockResolvedValueOnce([{ id: 12 }, { id: 15 }] as never);

    const result = await createPlacementTest(validTest);

    expect(result).toEqual({ success: true, data: undefined });
    expect(prisma.question.findMany).toHaveBeenCalledWith({
      where: {
        id: { in: [12, 15] },
        domain: "WEB_DEVELOPMENT",
        difficulty: "EASY",
      },
      select: { id: true },
    });
    expect(prisma.placementTest.create).toHaveBeenCalledWith({
      data: {
        title: "HTML basics",
        description: "Introductory questions",
        domain: "WEB_DEVELOPMENT",
        difficulty: "EASY",
        questions: {
          create: [
            { order: 1, question: { connect: { id: 12 } } },
            { order: 2, question: { connect: { id: 15 } } },
          ],
        },
      },
    });
  });

  it("rejects duplicate test questions and questions that do not match the test tags", async () => {
    expect(
      await createPlacementTest({ ...validTest, questionIds: [12, 12] }),
    ).toMatchObject({ success: false });
    expect(prisma.question.findMany).not.toHaveBeenCalled();

    vi.mocked(prisma.question.findMany).mockResolvedValueOnce([{ id: 12 }] as never);
    expect(await createPlacementTest(validTest)).toMatchObject({ success: false });
    expect(prisma.placementTest.create).not.toHaveBeenCalled();
  });

  it("reports a useful error when Prisma placement-test creation fails", async () => {
    vi.mocked(prisma.question.findMany).mockResolvedValueOnce([{ id: 12 }, { id: 15 }] as never);
    vi.mocked(prisma.placementTest.create).mockRejectedValue(
      new Error("database unavailable"),
    );

    expect(await createPlacementTest(validTest)).toEqual({
      success: false,
      error: "Could not save the test. Try again.",
    });
  });

  it("updates a placement test's title, domain, difficulty, and ordered question associations", async () => {
    vi.mocked(prisma.question.findMany).mockResolvedValueOnce([{ id: 21 }, { id: 24 }] as never);
    const input = {
      ...validTest,
      title: "  Updated HTML test  ",
      domain: "CORE_CS",
      difficulty: "MEDIUM",
      questionIds: [21, 24],
    };

    const result = await updatePlacementTest(5, input);

    expect(result).toEqual({ success: true, data: undefined });
    expect(prisma.question.findMany).toHaveBeenCalledWith({
      where: {
        id: { in: [21, 24] },
        domain: "CORE_CS",
        difficulty: "MEDIUM",
      },
      select: { id: true },
    });
    expect(prisma.placementTest.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: {
        title: "Updated HTML test",
        description: "Introductory questions",
        domain: "CORE_CS",
        difficulty: "MEDIUM",
        questions: {
          deleteMany: {},
          create: [
            { order: 1, question: { connect: { id: 21 } } },
            { order: 2, question: { connect: { id: 24 } } },
          ],
        },
      },
    });
  });

  it("rejects invalid placement-test IDs, fields, duplicate questions, and mismatched question tags", async () => {
    expect(await updatePlacementTest(0, validTest)).toMatchObject({ success: false });
    expect(
      await updatePlacementTest(5, { ...validTest, title: "  " }),
    ).toMatchObject({ success: false });
    expect(
      await updatePlacementTest(5, { ...validTest, domain: "UNKNOWN" }),
    ).toMatchObject({ success: false });
    expect(
      await updatePlacementTest(5, { ...validTest, difficulty: "EXPERT" }),
    ).toMatchObject({ success: false });
    expect(
      await updatePlacementTest(5, { ...validTest, questionIds: [12, 12] }),
    ).toMatchObject({ success: false });
    expect(prisma.question.findMany).not.toHaveBeenCalled();

    vi.mocked(prisma.question.findMany).mockResolvedValueOnce([{ id: 12 }] as never);
    expect(await updatePlacementTest(5, validTest)).toMatchObject({ success: false });
    expect(prisma.placementTest.update).not.toHaveBeenCalled();
  });

  it("reports Prisma errors when updating a placement test", async () => {
    vi.mocked(prisma.question.findMany).mockResolvedValueOnce([{ id: 12 }, { id: 15 }] as never);
    vi.mocked(prisma.placementTest.update).mockRejectedValue(
      new Error("database unavailable"),
    );

    expect(await updatePlacementTest(5, validTest)).toEqual({
      success: false,
      error: "Could not update the test. It may have been removed; reload and try again.",
    });
  });

  it("deletes a placement test from Prisma", async () => {
    expect(await deletePlacementTest(5)).toEqual({ success: true, data: undefined });
    expect(prisma.placementTest.delete).toHaveBeenCalledWith({ where: { id: 5 } });
  });

  it("rejects invalid placement-test delete IDs and reports Prisma deletion errors", async () => {
    expect(await deletePlacementTest(-1)).toMatchObject({ success: false });
    expect(prisma.placementTest.delete).not.toHaveBeenCalled();

    vi.mocked(prisma.placementTest.delete).mockRejectedValue(
      new Error("database unavailable"),
    );
    expect(await deletePlacementTest(5)).toEqual({
      success: false,
      error: "Could not delete the test. It may have been removed; reload and try again.",
    });
  });
});
