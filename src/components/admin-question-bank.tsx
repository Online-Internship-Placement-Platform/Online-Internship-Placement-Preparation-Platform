"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { AppShell } from "@/components/app-shell";
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
  type QuestionInput,
  type QuestionRecord,
  type TestInput,
  type TestRecord,
} from "@/app/admin/assessments/actions";
import {
  ANSWER_OPTIONS,
  filterQuestions,
  getDifficultyLabel,
  getDomainLabel,
  isAnswerOption,
  isPlacementDifficulty,
  isPlacementDomain,
  PLACEMENT_DIFFICULTIES,
  PLACEMENT_DOMAINS,
  type AnswerOption,
  type PlacementDifficulty,
  type PlacementDomain,
} from "@/lib/assessment-options";
import type { Role } from "@/lib/placement-data";

const fieldClassName =
  "w-full rounded-lg border border-[#dfe5df] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#176b50]";

async function requestQuestionBank(domain: PlacementDomain) {
  try {
    return await listQuestionBank(domain);
  } catch {
    return {
      success: false as const,
      error: "Could not load the question bank. Please try again.",
    };
  }
}

// ─── Domain selector ────────────────────────────────────────────────────────

function DomainSelector({
  role,
  onSelect,
}: {
  role: Role;
  onSelect: (domain: PlacementDomain) => void;
}) {
  return (
    <AppShell role={role} title="Assessments" eyebrow="Placement practice management">
      <div className="mb-6">
        <p className="text-sm text-[#6e786f]">
          Select a domain to manage its questions and practice tests.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PLACEMENT_DOMAINS.map((domain) => (
          <button
            key={domain.value}
            type="button"
            onClick={() => onSelect(domain.value)}
            className="rounded-xl border border-[#e2e7e1] bg-white p-6 text-left hover:border-[#176b50] hover:shadow-sm transition-shadow"
          >
            <h2 className="text-sm font-semibold text-[#17211b]">{domain.label}</h2>
            <p className="mt-1 text-xs text-[#6e786f]">
              Questions · Practice tests
            </p>
            <span className="mt-3 inline-block rounded-lg bg-[#e6f2ec] px-3 py-1 text-xs font-semibold text-[#176b50]">
              Open →
            </span>
          </button>
        ))}
      </div>
    </AppShell>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function AdminQuestionBank({ role }: { role: Role }) {
  const [selectedDomain, setSelectedDomain] = useState<PlacementDomain | null>(null);

  if (!selectedDomain) {
    return <DomainSelector role={role} onSelect={setSelectedDomain} />;
  }

  return (
    <DomainView
      role={role}
      domain={selectedDomain}
      onBack={() => setSelectedDomain(null)}
    />
  );
}

// ─── Domain view ─────────────────────────────────────────────────────────────

function DomainView({
  role,
  domain,
  onBack,
}: {
  role: Role;
  domain: PlacementDomain;
  onBack: () => void;
}) {
  const [questions, setQuestions] = useState<QuestionRecord[]>([]);
  const [tests, setTests] = useState<TestRecord[]>([]);
  const [difficultyFilter, setDifficultyFilter] = useState<PlacementDifficulty | "ALL">("ALL");
  const [query, setQuery] = useState("");
  const [questionForm, setQuestionForm] = useState<"closed" | "create" | QuestionRecord>(
    "closed",
  );
  const [testForm, setTestForm] = useState<"closed" | "create" | TestRecord>("closed");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    const result = await requestQuestionBank(domain);
    if (!result.success) {
      setError(result.error);
    } else {
      setQuestions(result.data.questions);
      setTests(result.data.tests);
    }
    setLoading(false);
  }, [domain]);

  useEffect(() => {
    let active = true;
    void requestQuestionBank(domain)
      .then((result) => {
        if (!active) return;
        if (!result.success) {
          setError(result.error);
        } else {
          setQuestions(result.data.questions);
          setTests(result.data.tests);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [domain]);

  const filteredQuestions = useMemo(
    () => filterQuestions(questions, query, domain, difficultyFilter),
    [difficultyFilter, domain, query, questions],
  );

  // Group questions by difficulty for structured display
  const questionsByDifficulty = useMemo(() => {
    const grouped: Record<PlacementDifficulty, QuestionRecord[]> = {
      EASY: [],
      MEDIUM: [],
      HARD: [],
    };
    filteredQuestions.forEach((q) => {
      grouped[q.difficulty].push(q);
    });
    return grouped;
  }, [filteredQuestions]);

  async function removeQuestion(question: QuestionRecord) {
    if (
      !window.confirm(
        "Delete this question? It will also be removed from every test that contains it.",
      )
    ) {
      return;
    }
    setError("");
    setNotice("");
    try {
      const result = await deleteQuestion(question.id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setNotice("Question deleted.");
      await loadData();
    } catch {
      setError("Could not delete the question. Please try again.");
    }
  }

  async function removeTest(test: TestRecord) {
    if (!window.confirm(`Delete the test "${test.title}"?`)) return;
    setError("");
    setNotice("");
    try {
      const result = await deletePlacementTest(test.id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setNotice("Test deleted.");
      await loadData();
    } catch {
      setError("Could not delete the test. Please try again.");
    }
  }

  async function togglePublish(test: TestRecord) {
    setError("");
    setNotice("");
    try {
      const result = test.isPublished
        ? await unpublishPlacementTest(test.id)
        : await publishPlacementTest(test.id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setNotice(test.isPublished ? "Test unpublished — no longer visible to students." : "Test published — now visible to students.");
      await loadData();
    } catch {
      setError("Could not update the test. Please try again.");
    }
  }

  async function completeSave(message: string) {
    setQuestionForm("closed");
    setTestForm("closed");
    setNotice(message);
    setError("");
    await loadData();
  }

  const domainLabel = getDomainLabel(domain);

  return (
    <AppShell role={role} title={`${domainLabel} — Questions & Tests`} eyebrow="Placement practice management">
      {/* Back navigation */}
      <button
        type="button"
        onClick={onBack}
        className="mb-6 flex items-center gap-1 text-sm font-semibold text-[#176b50] hover:underline"
        aria-label="Back to domain selection"
      >
        ← All domains
      </button>

      {error && (
        <p className="mb-4 rounded-lg border border-[#f1d1ce] bg-[#fff8f7] p-3 text-sm text-[#b94b48]" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="mb-4 rounded-lg border border-[#b9d6c4] bg-[#f7fbf8] p-3 text-sm text-[#176b50]" role="status">
          {notice}
        </p>
      )}

      {/* ── Question bank section ─────────────────────────────────────────── */}
      <section aria-labelledby="question-bank-heading" className="mb-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="question-bank-heading" className="text-lg font-semibold">
              Question bank
            </h2>
            <p className="mt-1 text-xs text-[#7b857c]">
              {filteredQuestions.length} of {questions.length} questions in {domainLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setQuestionForm("create")}
            className="rounded-lg bg-[#176b50] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#12563f]"
          >
            + Add question
          </button>
        </div>

        {questionForm !== "closed" && (
          <QuestionForm
            initial={questionForm === "create" ? null : questionForm}
            defaultDomain={domain}
            onCancel={() => setQuestionForm("closed")}
            onSaved={() => completeSave("Question saved.")}
          />
        )}

        {/* Filters */}
        <div className="mb-4 grid gap-3 rounded-xl border border-[#e2e7e1] bg-white p-4 sm:grid-cols-[minmax(0,1fr)_180px]">
          <label className="sr-only" htmlFor="question-search">
            Search questions
          </label>
          <input
            id="question-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search questions and options..."
            className={fieldClassName}
          />
          <label className="sr-only" htmlFor="question-difficulty-filter">
            Filter by difficulty
          </label>
          <select
            id="question-difficulty-filter"
            value={difficultyFilter}
            onChange={(event) => {
              const value = event.target.value;
              setDifficultyFilter(
                value === "ALL" || isPlacementDifficulty(value) ? value : "ALL",
              );
            }}
            className={fieldClassName}
          >
            <option value="ALL">All difficulties</option>
            {PLACEMENT_DIFFICULTIES.map((difficulty) => (
              <option value={difficulty.value} key={difficulty.value}>
                {difficulty.label}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="rounded-xl border border-[#e2e7e1] bg-white p-8 text-center text-sm text-[#6e786f]" role="status">
            Loading question bank…
          </p>
        ) : filteredQuestions.length === 0 ? (
          <p className="rounded-xl border border-[#e2e7e1] bg-white p-8 text-center text-sm text-[#6e786f]">
            {questions.length === 0
              ? "No questions yet. Add a question to begin building the bank."
              : "No questions match these filters."}
          </p>
        ) : (
          /* Grouped by difficulty */
          <div className="space-y-6">
            {(["EASY", "MEDIUM", "HARD"] as PlacementDifficulty[]).map((diff) => {
              const group = questionsByDifficulty[diff];
              if (group.length === 0) return null;
              return (
                <div key={diff}>
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-[#69736b]">
                    {getDifficultyLabel(diff)} · {group.length} {group.length === 1 ? "question" : "questions"}
                  </h3>
                  <div className="space-y-3">
                    {group.map((question) => (
                      <article
                        key={question.id}
                        className="rounded-xl border border-[#e2e7e1] bg-white p-5"
                      >
                        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                          <h4 className="max-w-3xl text-sm font-semibold">{question.prompt}</h4>
                        </div>
                        <ul className="grid gap-2 text-xs text-[#5e6b61] sm:grid-cols-2">
                          {question.options.map((option, index) => {
                            const letter = ANSWER_OPTIONS[index];
                            return (
                              <li
                                className={`rounded-lg border px-3 py-2 ${
                                  question.correctOption === letter
                                    ? "border-[#b9d6c4] bg-[#f7fbf8] text-[#176b50]"
                                    : "border-[#edf0ec] bg-[#fafbf9]"
                                }`}
                                key={letter}
                              >
                                <span className="mr-2 font-bold">{letter}.</span>
                                {option}
                                {question.correctOption === letter && (
                                  <span className="ml-2 font-semibold">Correct answer</span>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                        <div className="mt-4 flex justify-end gap-4">
                          <button
                            type="button"
                            onClick={() => setQuestionForm(question)}
                            className="text-xs font-semibold text-[#176b50]"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void removeQuestion(question)}
                            className="text-xs font-semibold text-[#b94b48]"
                          >
                            Delete
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Placement tests section ───────────────────────────────────────── */}
      <section aria-labelledby="placement-tests-heading">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="placement-tests-heading" className="text-lg font-semibold">
              Placement tests
            </h2>
            <p className="mt-1 text-xs text-[#7b857c]">
              {tests.length} {tests.length === 1 ? "test" : "tests"} in {domainLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setTestForm("create")}
            disabled={questions.length === 0}
            className="rounded-lg bg-[#176b50] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#12563f] disabled:cursor-not-allowed disabled:opacity-50"
          >
            + Create test
          </button>
        </div>

        {testForm !== "closed" && (
          <TestForm
            initial={testForm === "create" ? null : testForm}
            questions={questions}
            defaultDomain={domain}
            onCancel={() => setTestForm("closed")}
            onSaved={() => completeSave("Test saved.")}
          />
        )}

        {loading ? (
          <p className="rounded-xl border border-[#e2e7e1] bg-white p-8 text-center text-sm text-[#6e786f]" role="status">
            Loading tests…
          </p>
        ) : tests.length === 0 ? (
          <p className="rounded-xl border border-[#e2e7e1] bg-white p-8 text-center text-sm text-[#6e786f]">
            No tests yet.
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {tests.map((test) => (
              <article
                key={test.id}
                className="rounded-xl border border-[#e2e7e1] bg-white p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold">{test.title}</h3>
                      {test.isDefault && (
                        <span className="shrink-0 rounded-md bg-[#e6f2ec] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#176b50]">
                          Default
                        </span>
                      )}
                      {!test.isDefault && (
                        <span
                          className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                            test.isPublished
                              ? "bg-[#e6f2ec] text-[#176b50]"
                              : "bg-[#f5f6f2] text-[#69736b]"
                          }`}
                        >
                          {test.isPublished ? "Published" : "Draft"}
                        </span>
                      )}
                    </div>
                    {test.description && (
                      <p className="mt-1 text-xs text-[#6e786f]">{test.description}</p>
                    )}
                  </div>
                  <span className="shrink-0 rounded-md bg-[#f1f3ef] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#69736b]">
                    {getDifficultyLabel(test.difficulty)}
                  </span>
                </div>
                <p className="mt-4 text-xs font-semibold text-[#176b50]">
                  {test.questions.length} {test.questions.length === 1 ? "question" : "questions"}
                </p>
                <ol className="mt-2 list-inside list-decimal space-y-1 text-xs text-[#5e6b61]">
                  {test.questions.map((question) => (
                    <li key={question.id}>{question.prompt}</li>
                  ))}
                </ol>
                <div className="mt-4 flex flex-wrap justify-end gap-3">
                  {!test.isDefault && (
                    <button
                      type="button"
                      onClick={() => void togglePublish(test)}
                      className={`text-xs font-semibold ${
                        test.isPublished
                          ? "text-[#a86618]"
                          : "text-[#176b50]"
                      }`}
                    >
                      {test.isPublished ? "Unpublish" : "Publish"}
                    </button>
                  )}
                  {!test.isDefault && (
                    <button
                      type="button"
                      onClick={() => setTestForm(test)}
                      className="text-xs font-semibold text-[#176b50]"
                    >
                      Edit
                    </button>
                  )}
                  {!test.isDefault && (
                    <button
                      type="button"
                      onClick={() => void removeTest(test)}
                      className="text-xs font-semibold text-[#b94b48]"
                    >
                      Delete
                    </button>
                  )}
                  {test.isDefault && (
                    <span className="text-xs text-[#9aa49b]">Default — always available to students</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}

// ─── Question form ───────────────────────────────────────────────────────────

function QuestionForm({
  initial,
  defaultDomain,
  onCancel,
  onSaved,
}: {
  initial: QuestionRecord | null;
  defaultDomain: PlacementDomain;
  onCancel: () => void;
  onSaved: () => Promise<void>;
}) {
  const [prompt, setPrompt] = useState(initial?.prompt ?? "");
  const [options, setOptions] = useState<[string, string, string, string]>(
    initial?.options ?? ["", "", "", ""],
  );
  const [correctOption, setCorrectOption] = useState<AnswerOption>(
    initial?.correctOption ?? "A",
  );
  const [domain, setDomain] = useState<PlacementDomain>(
    initial?.domain ?? defaultDomain,
  );
  const [difficulty, setDifficulty] = useState<PlacementDifficulty>(
    initial?.difficulty ?? "EASY",
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);
    const input: QuestionInput = {
      prompt,
      options,
      correctOption,
      domain,
      difficulty,
    };

    try {
      const result = initial
        ? await updateQuestion(initial.id, input)
        : await createQuestion(input);
      if (!result.success) {
        setError(result.error);
        return;
      }
      await onSaved();
    } catch {
      setError("Could not save the question. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mb-5 rounded-xl border border-[#b9d6c4] bg-[#f7fbf8] p-5"
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold">{initial ? "Edit question" : "New question"}</h3>
        <button type="button" onClick={onCancel} className="text-xs text-[#6e786f]">
          Cancel
        </button>
      </div>
      <label className="mb-2 block text-xs font-semibold" htmlFor="question-prompt">
        Question
      </label>
      <textarea
        id="question-prompt"
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        required
        maxLength={5000}
        rows={3}
        className={`${fieldClassName} mb-4`}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((option, index) => {
          const letter = ANSWER_OPTIONS[index];
          return (
            <label className="text-xs font-semibold" key={letter}>
              Option {letter}
              <input
                value={option}
                onChange={(event) => {
                  const nextOptions: [string, string, string, string] = [...options];
                  nextOptions[index] = event.target.value;
                  setOptions(nextOptions);
                }}
                required
                maxLength={1000}
                className={`${fieldClassName} mt-1 font-normal`}
              />
            </label>
          );
        })}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-semibold">
          Domain
          <select
            value={domain}
            onChange={(event) => {
              if (isPlacementDomain(event.target.value)) setDomain(event.target.value);
            }}
            className={`${fieldClassName} mt-1 font-normal`}
          >
            {PLACEMENT_DOMAINS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold">
          Difficulty
          <select
            value={difficulty}
            onChange={(event) => {
              if (isPlacementDifficulty(event.target.value)) {
                setDifficulty(event.target.value);
              }
            }}
            className={`${fieldClassName} mt-1 font-normal`}
          >
            {PLACEMENT_DIFFICULTIES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold">
          Correct answer
          <select
            value={correctOption}
            onChange={(event) => {
              if (isAnswerOption(event.target.value)) {
                setCorrectOption(event.target.value);
              }
            }}
            className={`${fieldClassName} mt-1 font-normal`}
          >
            {ANSWER_OPTIONS.map((item) => (
              <option key={item} value={item}>
                Option {item}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && <p className="mt-3 text-xs text-[#b94b48]" role="alert">{error}</p>}
      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-[#176b50] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save question"}
        </button>
      </div>
    </form>
  );
}

// ─── Test form ───────────────────────────────────────────────────────────────

function TestForm({
  initial,
  questions,
  defaultDomain,
  onCancel,
  onSaved,
}: {
  initial: TestRecord | null;
  questions: QuestionRecord[];
  defaultDomain: PlacementDomain;
  onCancel: () => void;
  onSaved: () => Promise<void>;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [domain, setDomain] = useState<PlacementDomain>(
    initial?.domain ?? defaultDomain,
  );
  const [difficulty, setDifficulty] = useState<PlacementDifficulty>(
    initial?.difficulty ?? "EASY",
  );
  const [questionIds, setQuestionIds] = useState<number[]>(
    initial?.questions.map((question) => question.id) ?? [],
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const matchingQuestions = questions.filter(
    (question) => question.domain === domain && question.difficulty === difficulty,
  );

  function updateDomain(value: PlacementDomain) {
    setDomain(value);
    setQuestionIds((current) =>
      current.filter((id) => {
        const question = questions.find((item) => item.id === id);
        return question?.domain === value && question.difficulty === difficulty;
      }),
    );
  }

  function updateDifficulty(value: PlacementDifficulty) {
    setDifficulty(value);
    setQuestionIds((current) =>
      current.filter((id) => {
        const question = questions.find((item) => item.id === id);
        return question?.domain === domain && question.difficulty === value;
      }),
    );
  }

  function toggleQuestion(id: number) {
    setQuestionIds((current) =>
      current.includes(id) ? current.filter((questionId) => questionId !== id) : [...current, id],
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);
    const input: TestInput = { title, description, domain, difficulty, questionIds };

    try {
      const result = initial
        ? await updatePlacementTest(initial.id, input)
        : await createPlacementTest(input);
      if (!result.success) {
        setError(result.error);
        return;
      }
      await onSaved();
    } catch {
      setError("Could not save the test. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mb-5 rounded-xl border border-[#b9d6c4] bg-[#f7fbf8] p-5"
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold">{initial ? "Edit test" : "New test"}</h3>
        <button type="button" onClick={onCancel} className="text-xs text-[#6e786f]">
          Cancel
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold">
          Test title
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            maxLength={191}
            className={`${fieldClassName} mt-1 font-normal`}
          />
        </label>
        <label className="text-xs font-semibold">
          Description
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={5000}
            className={`${fieldClassName} mt-1 font-normal`}
          />
        </label>
        <label className="text-xs font-semibold">
          Domain
          <select
            value={domain}
            onChange={(event) => {
              if (isPlacementDomain(event.target.value)) updateDomain(event.target.value);
            }}
            className={`${fieldClassName} mt-1 font-normal`}
          >
            {PLACEMENT_DOMAINS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold">
          Difficulty
          <select
            value={difficulty}
            onChange={(event) => {
              if (isPlacementDifficulty(event.target.value)) {
                updateDifficulty(event.target.value);
              }
            }}
            className={`${fieldClassName} mt-1 font-normal`}
          >
            {PLACEMENT_DIFFICULTIES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <fieldset className="mt-4">
        <legend className="text-xs font-semibold">
          Questions ({questionIds.length} selected)
        </legend>
        {matchingQuestions.length === 0 ? (
          <p className="mt-2 rounded-lg bg-white p-3 text-xs text-[#7b857c]">
            No questions match this test&apos;s domain and difficulty. Add matching questions first.
          </p>
        ) : (
          <div className="mt-2 max-h-64 space-y-2 overflow-y-auto rounded-lg border border-[#dfe5df] bg-white p-3">
            {matchingQuestions.map((question) => (
              <label className="flex items-start gap-2 text-xs text-[#405147]" key={question.id}>
                <input
                  type="checkbox"
                  checked={questionIds.includes(question.id)}
                  onChange={() => toggleQuestion(question.id)}
                  className="mt-0.5 accent-[#176b50]"
                />
                <span>{question.prompt}</span>
              </label>
            ))}
          </div>
        )}
      </fieldset>
      {error && <p className="mt-3 text-xs text-[#b94b48]" role="alert">{error}</p>}
      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-[#176b50] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save test"}
        </button>
      </div>
    </form>
  );
}
