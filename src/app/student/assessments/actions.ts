"use server";

import { prisma } from "@/lib/prisma";
import type { PlacementDifficulty, PlacementDomain } from "@/lib/assessment-options";
import { isPlacementDomain } from "@/lib/assessment-options";
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
