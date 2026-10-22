import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/student/assessments",
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("@/lib/auth-actions", () => ({
  signOut: vi.fn(),
}));

import { ActivePracticeTest } from "@/components/assessments-view";
import type { AvailablePlacementTest } from "@/app/student/assessments/actions";

const test: AvailablePlacementTest = {
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
};

describe("student assessment submission view", () => {
  it("keeps the question, options, and selected answer visible after submission", () => {
    const markup = renderToStaticMarkup(
      createElement(ActivePracticeTest, {
        test,
        answers: { 12: "A" },
        submitted: true,
        onAnswer: vi.fn(),
        onSubmit: vi.fn(),
        onBack: vi.fn(),
      }),
    );

    expect(markup).toContain("Your answers are recorded in this page session only.");
    expect(markup).toContain("What does HTML stand for?");
    expect(markup).toContain("HyperText Markup Language");
    expect(markup).toContain("Option B");
    expect(markup).toContain("Option C");
    expect(markup).toContain("Option D");
    const selectedInput = markup.match(/<input[^>]*name="question-12"[^>]*>/)?.[0];
    expect(selectedInput).toContain('value="A"');
    expect(selectedInput).toContain('checked=""');
    expect(selectedInput).toContain('disabled=""');
    expect(markup).not.toContain("Submit answers");
    expect(markup).not.toContain("correctOption");
  });
});
