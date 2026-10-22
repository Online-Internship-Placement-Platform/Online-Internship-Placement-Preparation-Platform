import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    placementTest: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/server-auth", () => ({
  getServerRole: vi.fn(),
  isServerAuthConfigured: vi.fn(),
}));

import { listAvailablePlacementTests } from "@/app/student/assessments/actions";
import { prisma } from "@/lib/prisma";
import { getServerRole, isServerAuthConfigured } from "@/lib/server-auth";

describe("student available placement tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isServerAuthConfigured).mockReturnValue(true);
    vi.mocked(getServerRole).mockResolvedValue("student");
    vi.mocked(prisma.placementTest.findMany).mockResolvedValue([]);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("returns database-backed tests and question options without correct answers", async () => {
    vi.mocked(prisma.placementTest.findMany).mockResolvedValueOnce([
      {
        id: 3,
        title: "Web basics",
        description: "A short practice test",
        domain: "WEB_DEVELOPMENT",
        difficulty: "EASY",
        questions: [
          {
            question: {
              id: 12,
              prompt: "What does HTML stand for?",
              optionA: "HyperText Markup Language",
              optionB: "Option B",
              optionC: "Option C",
              optionD: "Option D",
            },
          },
        ],
      },
    ] as never);

    const result = await listAvailablePlacementTests();

    expect(result).toEqual({
      success: true,
      data: [
        {
          id: 3,
          title: "Web basics",
          description: "A short practice test",
          domain: "WEB_DEVELOPMENT",
          difficulty: "EASY",
          questions: [
            {
              id: 12,
              prompt: "What does HTML stand for?",
              options: [
                "HyperText Markup Language",
                "Option B",
                "Option C",
                "Option D",
              ],
            },
          ],
        },
      ],
    });
    expect(JSON.stringify(result)).not.toContain("correctOption");
    expect(prisma.placementTest.findMany).toHaveBeenCalledWith({
      orderBy: [{ domain: "asc" }, { difficulty: "asc" }, { id: "desc" }],
      select: {
        id: true,
        title: true,
        description: true,
        domain: true,
        difficulty: true,
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
              },
            },
          },
        },
      },
    });
  });

  it("rejects missing server authentication configuration without querying Prisma", async () => {
    vi.mocked(isServerAuthConfigured).mockReturnValue(false);

    const result = await listAvailablePlacementTests();

    expect(result).toMatchObject({ success: false });
    expect(prisma.placementTest.findMany).not.toHaveBeenCalled();
  });

  it("denies non-students access to available tests without querying Prisma", async () => {
    vi.mocked(getServerRole).mockResolvedValue("admin");

    const result = await listAvailablePlacementTests();

    expect(result).toMatchObject({ success: false });
    expect(prisma.placementTest.findMany).not.toHaveBeenCalled();
  });

  it("returns a useful error when available tests cannot be loaded", async () => {
    vi.mocked(prisma.placementTest.findMany).mockRejectedValue(
      new Error("database unavailable"),
    );

    const result = await listAvailablePlacementTests();

    expect(result).toEqual({
      success: false,
      error: "Could not load available practice tests. Please try again.",
    });
  });
});
