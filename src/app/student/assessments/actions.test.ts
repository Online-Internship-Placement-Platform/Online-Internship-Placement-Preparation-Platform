import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/server-auth", () => ({
  getServerRole: vi.fn(),
  isServerAuthConfigured: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    placementTest: {
      findMany: vi.fn(),
    },
  },
}));

import {
  listAvailablePlacementTests,
  type AvailablePlacementTest,
} from "@/app/student/assessments/actions";
import { getServerRole, isServerAuthConfigured } from "@/lib/server-auth";
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

function authorisedStudent() {
  vi.mocked(isServerAuthConfigured).mockReturnValue(true);
  vi.mocked(getServerRole).mockResolvedValue("student");
}

beforeEach(() => {
  vi.clearAllMocks();
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
