/**
 * TC-14: Admin CRUD on questions and placement tests
 *
 * SRS REQ-14: Admins can add/edit/remove questions and grouped tests,
 * each tagged with domain and difficulty.
 *
 * Pass: Operations succeed and correct information is stored/updated/removed.
 * Fail: An operation fails or incorrect information is stored.
 *
 * Source: selected and adapted from additional/original-actions-admin.test.ts
 */

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
  createQuestion,
  updateQuestion,
  deleteQuestion,
  createPlacementTest,
  updatePlacementTest,
  deletePlacementTest,
  publishPlacementTest,
  unpublishPlacementTest,
} from "@/app/admin/assessments/actions";
import { getServerRole, isServerAuthConfigured } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

const NOW = new Date();

const VALID_QUESTION = {
  prompt: "What does HTML stand for?",
  options: ["HyperText Markup Language", "Option B", "Option C", "Option D"],
  correctOption: "A",
  domain: "WEB_DEVELOPMENT",
  difficulty: "EASY",
};

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

const MOCK_DEFAULT_TEST = { ...MOCK_DB_TEST, id: 1, isDefault: true, isPublished: true };

function authorisedAdmin() {
  vi.mocked(isServerAuthConfigured).mockReturnValue(true);
  vi.mocked(getServerRole).mockResolvedValue("admin");
}

beforeEach(() => { vi.clearAllMocks(); });

// ─── Creating questions ───────────────────────────────────────────────────────

describe("TC-14 — creating questions with domain and difficulty tags", () => {
  it("creates a question when all required fields are valid", async () => {
    authorisedAdmin();
    vi.mocked(prisma.question.create).mockResolvedValue(MOCK_DB_QUESTION);
    const result = await createQuestion(VALID_QUESTION);
    expect(result.success).toBe(true);
    expect(prisma.question.create).toHaveBeenCalledOnce();
  });

  it("stores domain and difficulty tags on the created question", async () => {
    authorisedAdmin();
    vi.mocked(prisma.question.create).mockResolvedValue(MOCK_DB_QUESTION);
    await createQuestion(VALID_QUESTION);
    expect(prisma.question.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          domain: "WEB_DEVELOPMENT",
          difficulty: "EASY",
        }),
      }),
    );
  });

  it("rejects a question with an empty prompt", async () => {
    authorisedAdmin();
    const result = await createQuestion({ ...VALID_QUESTION, prompt: "" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain("required");
  });

  it("rejects a question with duplicate answer options", async () => {
    authorisedAdmin();
    const result = await createQuestion({
      ...VALID_QUESTION,
      options: ["Same", "Same", "Option C", "Option D"],
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain("distinct");
  });
});

// ─── Updating questions ───────────────────────────────────────────────────────

describe("TC-14 — updating existing questions", () => {
  it("updates a question when there is no domain conflict", async () => {
    authorisedAdmin();
    vi.mocked(prisma.testQuestion.findMany).mockResolvedValue([]);
    vi.mocked(prisma.question.update).mockResolvedValue(MOCK_DB_QUESTION);
    const result = await updateQuestion(1, VALID_QUESTION);
    expect(result.success).toBe(true);
  });

  it("blocks a domain change when the question belongs to a test of a different domain", async () => {
    authorisedAdmin();
    vi.mocked(prisma.testQuestion.findMany).mockResolvedValue(
      [{ test: { domain: "AI_ML", difficulty: "EASY" } }] as never,
    );
    const result = await updateQuestion(1, { ...VALID_QUESTION, domain: "DATABASES" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain("Remove this question");
  });
});

// ─── Deleting questions ───────────────────────────────────────────────────────

describe("TC-14 — deleting questions", () => {
  it("deletes a question by valid id", async () => {
    authorisedAdmin();
    vi.mocked(prisma.question.delete).mockResolvedValue(MOCK_DB_QUESTION);
    const result = await deleteQuestion(1);
    expect(result.success).toBe(true);
  });

  it("rejects deletion with an invalid id", async () => {
    authorisedAdmin();
    const result = await deleteQuestion(-1);
    expect(result.success).toBe(false);
  });
});

// ─── Creating placement tests ─────────────────────────────────────────────────

describe("TC-14 — creating grouped placement tests", () => {
  it("creates a placement test tagged with domain and difficulty", async () => {
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
        data: expect.objectContaining({
          domain: "WEB_DEVELOPMENT",
          difficulty: "EASY",
          isDefault: false,
          isPublished: false,
        }),
      }),
    );
  });

  it("rejects a test with an empty question list", async () => {
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

  it("rejects questions whose domain or difficulty does not match the test", async () => {
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
});

// ─── Updating placement tests ─────────────────────────────────────────────────

describe("TC-14 — updating grouped placement tests", () => {
  it("updates a custom test when input is valid", async () => {
    authorisedAdmin();
    vi.mocked(prisma.question.findMany).mockResolvedValue([MOCK_DB_QUESTION]);
    vi.mocked(prisma.placementTest.update).mockResolvedValue({
      ...MOCK_DB_TEST,
      title: "Updated test",
      description: "Updated description",
    });
    const result = await updatePlacementTest(10, {
      title: "Updated test",
      description: "Updated description",
      domain: "WEB_DEVELOPMENT",
      difficulty: "EASY",
      questionIds: [1],
    });
    expect(result.success).toBe(true);
    expect(prisma.placementTest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 10 },
        data: expect.objectContaining({ title: "Updated test" }),
      }),
    );
  });

  it("replaces question assignments when a test is updated", async () => {
    authorisedAdmin();
    vi.mocked(prisma.question.findMany).mockResolvedValue([MOCK_DB_QUESTION]);
    vi.mocked(prisma.placementTest.update).mockResolvedValue(MOCK_DB_TEST);
    await updatePlacementTest(10, {
      title: "Updated test",
      description: "",
      domain: "WEB_DEVELOPMENT",
      difficulty: "EASY",
      questionIds: [1],
    });
    expect(prisma.placementTest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          questions: expect.objectContaining({ deleteMany: {} }),
        }),
      }),
    );
  });

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

  it("unpublishes a custom published test", async () => {
    authorisedAdmin();
    vi.mocked(prisma.placementTest.findUnique).mockResolvedValue({ ...MOCK_DB_TEST, isPublished: true });
    vi.mocked(prisma.placementTest.update).mockResolvedValue({ ...MOCK_DB_TEST, isPublished: false });
    const result = await unpublishPlacementTest(10);
    expect(result.success).toBe(true);
  });
});

// ─── Deleting placement tests ─────────────────────────────────────────────────

describe("TC-14 — deleting grouped placement tests", () => {
  it("deletes a custom (non-default) test", async () => {
    authorisedAdmin();
    vi.mocked(prisma.placementTest.findUnique).mockResolvedValue(MOCK_DB_TEST);
    vi.mocked(prisma.placementTest.delete).mockResolvedValue(MOCK_DB_TEST);
    const result = await deletePlacementTest(10);
    expect(result.success).toBe(true);
    expect(prisma.placementTest.delete).toHaveBeenCalledWith({ where: { id: 10 } });
  });

  it("prevents deletion of default tests", async () => {
    authorisedAdmin();
    vi.mocked(prisma.placementTest.findUnique).mockResolvedValue(MOCK_DEFAULT_TEST);
    const result = await deletePlacementTest(1);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain("Default tests cannot be deleted");
    expect(prisma.placementTest.delete).not.toHaveBeenCalled();
  });
});
