/**
 * TC-15: Question/test filtering and role-based access
 *
 * SRS REQ-15: Admins can view/add/edit/delete/filter questions and tests by
 * domain and difficulty; students can only view or answer questions belonging
 * to an assigned or selected test.
 *
 * Pass: Admin can filter; students access only assigned tests; access
 *       restrictions are enforced.
 * Fail: Filtering fails or students can improperly manage the question bank.
 *
 * Sources:
 *   - additional/original-assessment-options.test.ts  (filtering logic)
 *   - additional/original-actions-admin.test.ts        (admin access/filtering)
 *   - additional/original-actions-student.test.ts      (student access restrictions)
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Filtering utility tests (no mocks needed — pure functions) ────────────────

import {
  filterQuestions,
  filterPlacementTests,
  isPlacementDomain,
  isPlacementDifficulty,
  type PlacementDomain,
  type PlacementDifficulty,
} from "@/lib/assessment-options";

const QUESTIONS = [
  { id: 1, prompt: "React component lifecycle", options: ["render", "mount", "join", "route"], domain: "WEB_DEVELOPMENT" as PlacementDomain, difficulty: "EASY" as PlacementDifficulty },
  { id: 2, prompt: "Neural network activation", options: ["sigmoid", "table", "index", "packet"], domain: "AI_ML" as PlacementDomain, difficulty: "HARD" as PlacementDifficulty },
  { id: 3, prompt: "Database index", options: ["B-tree", "array", "stack", "queue"], domain: "DATABASES" as PlacementDomain, difficulty: "MEDIUM" as PlacementDifficulty },
];

const TESTS = [
  { id: 1, domain: "WEB_DEVELOPMENT" as PlacementDomain, difficulty: "EASY" as PlacementDifficulty },
  { id: 2, domain: "AI_ML" as PlacementDomain, difficulty: "HARD" as PlacementDifficulty },
  { id: 3, domain: "AI_ML" as PlacementDomain, difficulty: "MEDIUM" as PlacementDifficulty },
];

describe("TC-15 — admin filters questions by domain and difficulty", () => {
  it("filters questions to only those matching the selected domain", () => {
    expect(filterQuestions(QUESTIONS, "", "AI_ML", "ALL").map(q => q.id)).toEqual([2]);
  });

  it("filters questions to only those matching the selected difficulty", () => {
    expect(filterQuestions(QUESTIONS, "", "ALL", "EASY").map(q => q.id)).toEqual([1]);
  });

  it("filters questions by both domain and difficulty together", () => {
    expect(filterQuestions(QUESTIONS, "", "AI_ML", "HARD").map(q => q.id)).toEqual([2]);
    expect(filterQuestions(QUESTIONS, "", "AI_ML", "EASY")).toEqual([]);
  });

  it("returns all questions when no filter is applied", () => {
    expect(filterQuestions(QUESTIONS, "", "ALL", "ALL")).toHaveLength(3);
  });

  it("searches question text and options case-insensitively", () => {
    expect(filterQuestions(QUESTIONS, "  SIGMOID ", "ALL", "ALL").map(q => q.id)).toEqual([2]);
    expect(filterQuestions(QUESTIONS, "B-tree", "ALL", "ALL").map(q => q.id)).toEqual([3]);
  });
});

describe("TC-15 — admin filters placement tests by domain and difficulty", () => {
  it("filters tests by domain", () => {
    expect(filterPlacementTests(TESTS, "AI_ML", "ALL").map(t => t.id)).toEqual([2, 3]);
    expect(filterPlacementTests(TESTS, "WEB_DEVELOPMENT", "ALL").map(t => t.id)).toEqual([1]);
  });

  it("filters tests by difficulty", () => {
    expect(filterPlacementTests(TESTS, "ALL", "HARD").map(t => t.id)).toEqual([2]);
  });

  it("filters tests by both domain and difficulty", () => {
    expect(filterPlacementTests(TESTS, "AI_ML", "HARD").map(t => t.id)).toEqual([2]);
    expect(filterPlacementTests(TESTS, "AI_ML", "EASY")).toEqual([]);
  });
});

describe("TC-15 — valid domain and difficulty values are enforced", () => {
  it("recognises all five placement domains as valid", () => {
    ["WEB_DEVELOPMENT", "AI_ML", "CORE_CS", "NETWORKS", "DATABASES"].forEach(d =>
      expect(isPlacementDomain(d)).toBe(true),
    );
  });

  it("rejects unknown domain values", () => {
    expect(isPlacementDomain("UNKNOWN")).toBe(false);
    expect(isPlacementDomain("")).toBe(false);
  });

  it("recognises all three difficulty levels as valid", () => {
    ["EASY", "MEDIUM", "HARD"].forEach(d => expect(isPlacementDifficulty(d)).toBe(true));
  });

  it("rejects unknown difficulty values", () => {
    expect(isPlacementDifficulty("EXPERT")).toBe(false);
  });
});

// ── Role-based access tests (require server-auth + prisma mocks) ──────────────

vi.mock("server-only", () => ({}));

vi.mock("@/lib/server-auth", () => ({
  getServerRole: vi.fn(),
  isServerAuthConfigured: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    question: { findMany: vi.fn(), create: vi.fn() },
    placementTest: { findMany: vi.fn() },
    testQuestion: { findMany: vi.fn() },
  },
}));

import { listQuestionBank, createQuestion } from "@/app/admin/assessments/actions";
import { listAvailablePlacementTests } from "@/app/student/assessments/actions";
import { getServerRole, isServerAuthConfigured } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

beforeEach(() => { vi.clearAllMocks(); });

describe("TC-15 — only admins can manage the question bank", () => {
  it("allows admin role to access the question bank", async () => {
    vi.mocked(isServerAuthConfigured).mockReturnValue(true);
    vi.mocked(getServerRole).mockResolvedValue("admin");
    vi.mocked(prisma.question.findMany).mockResolvedValue([]);
    vi.mocked(prisma.placementTest.findMany).mockResolvedValue([]);
    const result = await listQuestionBank();
    expect(result.success).toBe(true);
  });

  it("rejects student role from managing the question bank", async () => {
    vi.mocked(isServerAuthConfigured).mockReturnValue(true);
    vi.mocked(getServerRole).mockResolvedValue("student");
    const result = await createQuestion({
      prompt: "Test",
      options: ["A", "B", "C", "D"],
      correctOption: "A",
      domain: "WEB_DEVELOPMENT",
      difficulty: "EASY",
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain("administrator");
  });

  it("listQuestionBank accepts an optional domain filter", async () => {
    vi.mocked(isServerAuthConfigured).mockReturnValue(true);
    vi.mocked(getServerRole).mockResolvedValue("admin");
    vi.mocked(prisma.question.findMany).mockResolvedValue([]);
    vi.mocked(prisma.placementTest.findMany).mockResolvedValue([]);
    await listQuestionBank("WEB_DEVELOPMENT");
    expect(prisma.question.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ domain: "WEB_DEVELOPMENT" }) }),
    );
  });
});

describe("TC-15 — students can only view assigned/selected tests (not manage)", () => {
  it("allows authenticated students to list available tests", async () => {
    vi.mocked(isServerAuthConfigured).mockReturnValue(true);
    vi.mocked(getServerRole).mockResolvedValue("student");
    vi.mocked(prisma.placementTest.findMany).mockResolvedValue([]);
    const result = await listAvailablePlacementTests();
    expect(result.success).toBe(true);
  });

  it("students only see default or published tests — not all tests", async () => {
    vi.mocked(isServerAuthConfigured).mockReturnValue(true);
    vi.mocked(getServerRole).mockResolvedValue("student");
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

  it("rejects admin role from the student-facing test list endpoint", async () => {
    vi.mocked(isServerAuthConfigured).mockReturnValue(true);
    vi.mocked(getServerRole).mockResolvedValue("admin");
    const result = await listAvailablePlacementTests();
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain("student");
  });

  it("never exposes correct answers to students before submission", async () => {
    vi.mocked(isServerAuthConfigured).mockReturnValue(true);
    vi.mocked(getServerRole).mockResolvedValue("student");
    vi.mocked(prisma.placementTest.findMany).mockResolvedValue([
      {
        id: 3, title: "Web basics", description: null,
        domain: "WEB_DEVELOPMENT" as const, difficulty: "EASY" as const,
        isDefault: true, isPublished: true, createdAt: new Date(), updatedAt: new Date(),
        questions: [],
      } as never,
    ]);
    const result = await listAvailablePlacementTests();
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(JSON.stringify(result.data)).not.toContain("correctOption");
    expect(prisma.placementTest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          questions: expect.objectContaining({
            select: {
              question: {
                select: expect.not.objectContaining({ correctOption: true }),
              },
            },
          }),
        }),
      }),
    );
  });
});
