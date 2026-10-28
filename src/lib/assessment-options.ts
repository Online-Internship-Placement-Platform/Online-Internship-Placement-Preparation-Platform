export const PLACEMENT_DOMAINS = [
  { value: "WEB_DEVELOPMENT", label: "Web Development" },
  { value: "AI_ML", label: "AI/ML" },
  { value: "CORE_CS", label: "Core CS" },
  { value: "NETWORKS", label: "Networks" },
  { value: "DATABASES", label: "Databases" },
] as const;

export const PLACEMENT_DIFFICULTIES = [
  { value: "EASY", label: "Easy" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HARD", label: "Hard" },
] as const;

export const ANSWER_OPTIONS = ["A", "B", "C", "D"] as const;

export type PlacementDomain = (typeof PLACEMENT_DOMAINS)[number]["value"];
export type PlacementDifficulty = (typeof PLACEMENT_DIFFICULTIES)[number]["value"];
export type AnswerOption = (typeof ANSWER_OPTIONS)[number];

type FilterableQuestion = {
  prompt: string;
  options: readonly string[];
  domain: PlacementDomain;
  difficulty: PlacementDifficulty;
};

type FilterableTest = {
  domain: PlacementDomain;
  difficulty: PlacementDifficulty;
};

export function filterQuestions<T extends FilterableQuestion>(
  questions: T[],
  query: string,
  domain: PlacementDomain | "ALL",
  difficulty: PlacementDifficulty | "ALL",
) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return questions.filter((question) => {
    const matchesDomain = domain === "ALL" || question.domain === domain;
    const matchesDifficulty =
      difficulty === "ALL" || question.difficulty === difficulty;
    const matchesQuery =
      !normalizedQuery ||
      `${question.prompt} ${question.options.join(" ")}`
        .toLocaleLowerCase()
        .includes(normalizedQuery);
    return matchesDomain && matchesDifficulty && matchesQuery;
  });
}

export function filterPlacementTests<T extends FilterableTest>(
  tests: T[],
  domain: PlacementDomain | "ALL",
  difficulty: PlacementDifficulty | "ALL",
) {
  return tests.filter(
    (test) =>
      (domain === "ALL" || test.domain === domain) &&
      (difficulty === "ALL" || test.difficulty === difficulty),
  );
}

export function isPlacementDomain(value: unknown): value is PlacementDomain {
  return (
    typeof value === "string" &&
    PLACEMENT_DOMAINS.some((domain) => domain.value === value)
  );
}

export function isPlacementDifficulty(value: unknown): value is PlacementDifficulty {
  return (
    typeof value === "string" &&
    PLACEMENT_DIFFICULTIES.some((difficulty) => difficulty.value === value)
  );
}

export function isAnswerOption(value: unknown): value is AnswerOption {
  return typeof value === "string" && ANSWER_OPTIONS.some((option) => option === value);
}

export function getDomainLabel(value: PlacementDomain) {
  return PLACEMENT_DOMAINS.find((domain) => domain.value === value)?.label ?? value;
}

export function getDifficultyLabel(value: PlacementDifficulty) {
  return PLACEMENT_DIFFICULTIES.find((difficulty) => difficulty.value === value)?.label ?? value;
}
