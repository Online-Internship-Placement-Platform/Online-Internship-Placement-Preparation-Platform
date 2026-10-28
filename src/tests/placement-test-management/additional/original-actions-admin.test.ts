import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/server-auth", () => ({
  getServerRole: vi.fn(),
  isServerAuthConfigured: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    question: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    placementTest: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    testQuestion: {
      findMany: vi.fn(),
    },
  },
}));

import {
  createPlacementTest,
  createQuestion,
  deletePlacementTest,
  deleteQuestion,
  listQuestionBank,
  publishPlacementTest,
  unpublishPlacementTest,
  updatePlacementTest,
  updateQuestion,
} from "@/app/admin/assessments/actions";
import { getServerRole, isServerAuthConfigured } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

const VALID_QUESTION = {
  prompt: "What does HTML stand for?",
  options: ["HyperText Markup Language", "Option B", "Option C", "Option D"],
  correctOption: "A",
  domain: "WEB_DEVELOPMENT",
  difficulty: "EASY",
};

const NOW = new Date();

const MOCK_DB_QUESTION = {
  id: 1,
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
};

const MOCK_DB_TEST = {
  id: 10,
  title: "Web basics",
  description: null,
  domain: "WEB_DEVELOPMENT" as const,
  difficulty: "EASY" as const,
  isDefault: false,
  isPublished: false,
  createdAt: NOW,
  updatedAt: NOW,
  questions: [{ question: MOCK_DB_QUESTION }],
};

const MOCK_DEFAULT_TEST = {
  ...MOCK_DB_TEST,
  id: 1,
  isDefault: true,
  isPublished: true,
};

function authorisedAdmin() {
  vi.mocked(isServerAuthConfigured).mockReturnValue(true);
  vi.mocked(getServerRole).mockResolvedValue("admin");
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Authorization ────────────────────────────────────────────────────────────

describe("authorization", () => {
  it("rejects requests when server auth is not configured", async () => {
    vi.mocked(isServerAuthConfigured).mockReturnValue(false);
    const result = await listQuestionBank();
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain("not configured");
  });

  it("rejects requests from students", async () => {
    vi.mocked(isServerAuthConfigured).mockReturnValue(true);
    vi.mocked(getServerRole).mockResolvedValue("student");
    const result = await createQuestion(VALID_QUESTION);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain("administrator");
  });

  it("allows admin role", async () => {
    vi.mocked(isServerAuthConfigured).mockReturnValue(true);
    vi.mocked(getServerRole).mockResolvedValue("admin");
    vi.mocked(prisma.question.findMany).mockResolvedValue([]);
    vi.mocked(prisma.placementTest.findMany).mockResolvedValue([]);
    const result = await listQuestionBank();
    expect(result.success).toBe(true);
  });

  it("allows super-admin role", async () => {
    vi.mocked(isServerAuthConfigured).mockReturnValue(true);
    vi.mocked(getServerRole).mockResolvedValue("super-admin");
    vi.mocked(prisma.question.findMany).mockResolvedValue([]);
    vi.mocked(prisma.placementTest.findMany).mockResolvedValue([]);
    const result = await listQuestionBank();
    expect(result.success).toBe(true);
  });
});

// ─── listQuestionBank ─────────────────────────────────────────────────────────

describe("listQuestionBank", () => {
  it("returns questions and tests including isDefault and isPublished fields", async () => {
    authorisedAdmin();
    vi.mocked(prisma.question.findMany).mockResolvedValue([MOCK_DB_QUESTION]);
    vi.mocked(prisma.placementTest.findMany).mockResolvedValue([MOCK_DB_TEST]);

    const result = await listQuestionBank();
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.questions).toHaveLength(1);
    expect(result.data.tests[0].isDefault).toBe(false);
    expect(result.data.tests[0].isPublished).toBe(false);
  });

  it("accepts an optional domain filter and passes it to prisma", async () => {
    authorisedAdmin();
    vi.mocked(prisma.question.findMany).mockResolvedValue([]);
    vi.mocked(prisma.placementTest.findMany).mockResolvedValue([]);

    await listQuestionBank("WEB_DEVELOPMENT");

    expect(prisma.question.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ domain: "WEB_DEVELOPMENT" }),
      }),
    );
  });

  it("returns error when the database call fails", async () => {
    authorisedAdmin();
    vi.mocked(prisma.question.findMany).mockRejectedValue(new Error("DB down"));
    const result = await listQuestionBank();
    expect(result.success).toBe(false);
  });
});

// ─── createQuestion ───────────────────────────────────────────────────────────

describe("createQuestion", () => {
  it("validates required fields", async () => {
    authorisedAdmin();
    const result = await createQuestion({ ...VALID_QUESTION, prompt: "" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain("required");
  });

  it("rejects duplicate option text", async () => {
    authorisedAdmin();
    const result = await createQuestion({
      ...VALID_QUESTION,
      options: ["Same", "Same", "Option C", "Option D"],
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain("distinct");
  });

  it("creates a question when input is valid", async () => {
    authorisedAdmin();
    vi.mocked(prisma.question.create).mockResolvedValue(MOCK_DB_QUESTION);
    const result = await createQuestion(VALID_QUESTION);
    expect(result.success).toBe(true);
    expect(prisma.question.create).toHaveBeenCalledOnce();
  });
});

// ─── updateQuestion ───────────────────────────────────────────────────────────

describe("updateQuestion", () => {
  it("blocks domain change when the question belongs to a test of different domain", async () => {
    authorisedAdmin();
    vi.mocked(prisma.testQuestion.findMany).mockResolvedValue(
      [{ test: { domain: "AI_ML", difficulty: "EASY" } }] as never,
    );
    const result = await updateQuestion(1, { ...VALID_QUESTION, domain: "DATABASES" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain("Remove this question");
  });

  it("allows update when no domain conflict exists", async () => {
    authorisedAdmin();
    vi.mocked(prisma.testQuestion.findMany).mockResolvedValue([]);
    vi.mocked(prisma.question.update).mockResolvedValue(MOCK_DB_QUESTION);
    const result = await updateQuestion(1, VALID_QUESTION);
    expect(result.success).toBe(true);
  });
});

// ─── deleteQuestion ───────────────────────────────────────────────────────────

describe("deleteQuestion", () => {
  it("deletes a question by id", async () => {
    authorisedAdmin();
    vi.mocked(prisma.question.delete).mockResolvedValue(MOCK_DB_QUESTION);
    const result = await deleteQuestion(1);
    expect(result.success).toBe(true);
  });

  it("rejects invalid id", async () => {
    authorisedAdmin();
    const result = await deleteQuestion(-1);
    expect(result.success).toBe(false);
  });
});

// ─── createPlacementTest ──────────────────────────────────────────────────────

describe("createPlacementTest", () => {
  it("rejects empty question list", async () => {
    authorisedAdmin();
    const result = await createPlacementTest({
      title: "Test",
      description: "",
      domain: "WEB_DEVELOPMENT",
      difficulty: "EASY",
      questionIds: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects mismatched domain/difficulty questions", async () => {
    authorisedAdmin();
    vi.mocked(prisma.question.findMany).mockResolvedValue([]);
    const result = await createPlacementTest({
      title: "Test",
      description: "",
      domain: "WEB_DEVELOPMENT",
      difficulty: "EASY",
      questionIds: [99],
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain("domain and difficulty");
  });

  it("creates a test as a draft (isPublished=false, isDefault=false)", async () => {
    authorisedAdmin();
    vi.mocked(prisma.question.findMany).mockResolvedValue([MOCK_DB_QUESTION]);
    vi.mocked(prisma.placementTest.create).mockResolvedValue(MOCK_DB_TEST);
    const result = await createPlacementTest({
      title: "Custom test",
      description: "",
      domain: "WEB_DEVELOPMENT",
      difficulty: "EASY",
      questionIds: [1],
    });
    expect(result.success).toBe(true);
    expect(prisma.placementTest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isDefault: false, isPublished: false }),
      }),
    );
  });
});

// ─── deletePlacementTest ──────────────────────────────────────────────────────

describe("deletePlacementTest", () => {
  it("prevents deletion of default tests", async () => {
    authorisedAdmin();
    vi.mocked(prisma.placementTest.findUnique).mockResolvedValue(MOCK_DEFAULT_TEST);
    const result = await deletePlacementTest(1);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain("Default tests cannot be deleted");
    expect(prisma.placementTest.delete).not.toHaveBeenCalled();
  });

  it("deletes non-default tests", async () => {
    authorisedAdmin();
    vi.mocked(prisma.placementTest.findUnique).mockResolvedValue(MOCK_DB_TEST);
    vi.mocked(prisma.placementTest.delete).mockResolvedValue(MOCK_DB_TEST);
    const result = await deletePlacementTest(10);
    expect(result.success).toBe(true);
    expect(prisma.placementTest.delete).toHaveBeenCalledWith({ where: { id: 10 } });
  });
});

// ─── publishPlacementTest ─────────────────────────────────────────────────────

describe("publishPlacementTest", () => {
  it("publishes a custom draft test", async () => {
    authorisedAdmin();
    vi.mocked(prisma.placementTest.findUnique).mockResolvedValue(MOCK_DB_TEST);
    vi.mocked(prisma.placementTest.update).mockResolvedValue({ ...MOCK_DB_TEST, isPublished: true });
    const result = await publishPlacementTest(10);
    expect(result.success).toBe(true);
    expect(prisma.placementTest.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isPublished: true } }),
    );
  });

  it("does not fail when publishing a default test (already published)", async () => {
    authorisedAdmin();
    vi.mocked(prisma.placementTest.findUnique).mockResolvedValue(MOCK_DEFAULT_TEST);
    const result = await publishPlacementTest(1);
    expect(result.success).toBe(true);
    expect(prisma.placementTest.update).not.toHaveBeenCalled();
  });
});

// ─── unpublishPlacementTest ───────────────────────────────────────────────────

describe("unpublishPlacementTest", () => {
  it("prevents unpublishing default tests", async () => {
    authorisedAdmin();
    vi.mocked(prisma.placementTest.findUnique).mockResolvedValue(MOCK_DEFAULT_TEST);
    const result = await unpublishPlacementTest(1);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain("Default tests cannot be unpublished");
    expect(prisma.placementTest.update).not.toHaveBeenCalled();
  });

  it("unpublishes a custom published test", async () => {
    authorisedAdmin();
    vi.mocked(prisma.placementTest.findUnique).mockResolvedValue({
      ...MOCK_DB_TEST,
      isPublished: true,
    });
    vi.mocked(prisma.placementTest.update).mockResolvedValue({ ...MOCK_DB_TEST, isPublished: false });
    const result = await unpublishPlacementTest(10);
    expect(result.success).toBe(true);
    expect(prisma.placementTest.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isPublished: false } }),
    );
  });
});

// ─── updatePlacementTest ──────────────────────────────────────────────────────

describe("updatePlacementTest", () => {
  const VALID_TEST_INPUT = {
    title: "Updated test",
    description: "Updated description",
    domain: "WEB_DEVELOPMENT" as const,
    difficulty: "EASY" as const,
    questionIds: [1],
  };

  it("rejects an invalid (non-positive) test id", async () => {
    authorisedAdmin();
    const result = await updatePlacementTest(0, VALID_TEST_INPUT);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain("valid test");
  });

  it("rejects invalid input (empty title)", async () => {
    authorisedAdmin();
    const result = await updatePlacementTest(10, { ...VALID_TEST_INPUT, title: "" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain("required");
  });

  it("rejects questions with mismatched domain or difficulty", async () => {
    authorisedAdmin();
    // findMany returns empty — no matching questions found
    vi.mocked(prisma.question.findMany).mockResolvedValue([]);
    const result = await updatePlacementTest(10, VALID_TEST_INPUT);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain("domain and difficulty");
  });

  it("updates a custom test when input is valid", async () => {
    authorisedAdmin();
    vi.mocked(prisma.question.findMany).mockResolvedValue([MOCK_DB_QUESTION]);
    vi.mocked(prisma.placementTest.update).mockResolvedValue({
      ...MOCK_DB_TEST,
      title: "Updated test",
      description: "Updated description",
    });

    const result = await updatePlacementTest(10, VALID_TEST_INPUT);
    expect(result.success).toBe(true);
    expect(prisma.placementTest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 10 },
        data: expect.objectContaining({
          title: "Updated test",
          description: "Updated description",
        }),
      }),
    );
  });

  it("replaces question assignments on update (deleteMany then create)", async () => {
    authorisedAdmin();
    vi.mocked(prisma.question.findMany).mockResolvedValue([MOCK_DB_QUESTION]);
    vi.mocked(prisma.placementTest.update).mockResolvedValue(MOCK_DB_TEST);

    await updatePlacementTest(10, VALID_TEST_INPUT);

    expect(prisma.placementTest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          questions: expect.objectContaining({
            deleteMany: {},
          }),
        }),
      }),
    );
  });

  it("handles database errors safely and returns a friendly error", async () => {
    authorisedAdmin();
    vi.mocked(prisma.question.findMany).mockResolvedValue([MOCK_DB_QUESTION]);
    vi.mocked(prisma.placementTest.update).mockRejectedValue(new Error("DB error"));

    const result = await updatePlacementTest(10, VALID_TEST_INPUT);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toMatch(/could not update|reload and try again/i);
  });

  it("rejects unauthenticated users", async () => {
    vi.mocked(isServerAuthConfigured).mockReturnValue(false);
    const result = await updatePlacementTest(10, VALID_TEST_INPUT);
    expect(result.success).toBe(false);
  });

  it("rejects student role", async () => {
    vi.mocked(isServerAuthConfigured).mockReturnValue(true);
    vi.mocked(getServerRole).mockResolvedValue("student");
    const result = await updatePlacementTest(10, VALID_TEST_INPUT);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain("administrator");
  });
});
