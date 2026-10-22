import { describe, expect, it } from "vitest";
import {
  filterPlacementTests,
  filterQuestions,
  isAnswerOption,
  isPlacementDifficulty,
  isPlacementDomain,
  type PlacementDifficulty,
  type PlacementDomain,
} from "@/lib/assessment-options";

const questions = [
  {
    id: 1,
    prompt: "React component lifecycle",
    options: ["render", "mount", "join", "route"],
    domain: "WEB_DEVELOPMENT" as PlacementDomain,
    difficulty: "EASY" as PlacementDifficulty,
  },
  {
    id: 2,
    prompt: "Neural network activation",
    options: ["sigmoid", "table", "index", "packet"],
    domain: "AI_ML" as PlacementDomain,
    difficulty: "HARD" as PlacementDifficulty,
  },
  {
    id: 3,
    prompt: "Database index",
    options: ["B-tree", "array", "stack", "queue"],
    domain: "DATABASES" as PlacementDomain,
    difficulty: "MEDIUM" as PlacementDifficulty,
  },
];

describe("assessment option validation", () => {
  it("validates configured domains, difficulties, and correct-answer options", () => {
    expect(isPlacementDomain("WEB_DEVELOPMENT")).toBe(true);
    expect(isPlacementDomain("UNKNOWN")).toBe(false);
    expect(isPlacementDifficulty("HARD")).toBe(true);
    expect(isPlacementDifficulty("EXPERT")).toBe(false);
    expect(isAnswerOption("D")).toBe(true);
    expect(isAnswerOption("E")).toBe(false);
  });
});

describe("question bank filtering", () => {
  it("filters question-bank entries by selected domain and difficulty", () => {
    expect(filterQuestions(questions, "", "AI_ML", "HARD").map(({ id }) => id)).toEqual([
      2,
    ]);
    expect(filterQuestions(questions, "", "AI_ML", "EASY")).toEqual([]);
  });

  it("searches question text and answer options case-insensitively", () => {
    expect(filterQuestions(questions, "  SIGMOID ", "ALL", "ALL").map(({ id }) => id)).toEqual([
      2,
    ]);
    expect(filterQuestions(questions, "B-tree", "ALL", "ALL").map(({ id }) => id)).toEqual([
      3,
    ]);
  });

  it("filters placement tests by selected domain and difficulty", () => {
    const tests = [
      { id: 1, domain: "WEB_DEVELOPMENT" as PlacementDomain, difficulty: "EASY" as PlacementDifficulty },
      { id: 2, domain: "AI_ML" as PlacementDomain, difficulty: "HARD" as PlacementDifficulty },
      { id: 3, domain: "AI_ML" as PlacementDomain, difficulty: "MEDIUM" as PlacementDifficulty },
    ];

    expect(
      filterPlacementTests(tests, "AI_ML", "HARD").map(({ id }) => id),
    ).toEqual([2]);
    expect(filterPlacementTests(tests, "ALL", "ALL")).toEqual(tests);
  });
});
