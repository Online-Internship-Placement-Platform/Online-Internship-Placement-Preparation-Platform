"use client";

import { useRef, useState, type FormEvent } from "react";
import { AppShell } from "@/components/app-shell";
import {
  ANSWER_OPTIONS,
  getDifficultyLabel,
  getDomainLabel,
  PLACEMENT_DOMAINS,
  type AnswerOption,
  type PlacementDomain,
} from "@/lib/assessment-options";
import type { AvailablePlacementTest, QuestionResult, AttemptSummary } from "@/app/student/assessments/actions";
import { listAvailablePlacementTests, scoreAttempt, getAttemptHistory } from "@/app/student/assessments/actions";

// ─── Root component: domain selector ────────────────────────────────────────

export default function AssessmentsView({
  initialTests,
  error: initialError,
}: {
  initialTests: AvailablePlacementTest[];
  error?: string;
}) {
  const [selectedDomain, setSelectedDomain] = useState<PlacementDomain | null>(null);
  const [activeTestId, setActiveTestId] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<number, AnswerOption>>({});
  const [submitted, setSubmitted] = useState(false);
  const [tests, setTests] = useState<AvailablePlacementTest[]>(initialTests);
  const [loadError, setLoadError] = useState(initialError ?? "");
  const [loading, setLoading] = useState(false);
  const [scoreResult, setScoreResult] = useState<import("@/app/student/assessments/actions").ScoreResult | null>(null);
  const [scoring, setScoring] = useState(false);
  const [scoreError, setScoreError] = useState("");
  const [attemptHistory, setAttemptHistory] = useState<AttemptSummary[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const activeHistoryTestIdRef = useRef<number | null>(null);
  const historyRequestRef = useRef<{
    testId: number;
    promise: Promise<void>;
  } | null>(null);

  async function loadAttemptHistory(testId: number, refreshAfterCurrent = false) {
    const currentRequest = historyRequestRef.current;
    if (currentRequest?.testId === testId) {
      await currentRequest.promise;
      if (refreshAfterCurrent && activeHistoryTestIdRef.current === testId) {
        await loadAttemptHistory(testId);
      }
      return;
    }

    const request = (async () => {
      if (activeHistoryTestIdRef.current === testId) {
        setHistoryLoading(true);
        setHistoryError("");
      }

      try {
        const result = await getAttemptHistory(testId);
        if (activeHistoryTestIdRef.current !== testId) return;
        if (result.success) {
          setAttemptHistory(result.data);
        } else {
          setHistoryError(result.error);
        }
      } catch {
        if (activeHistoryTestIdRef.current === testId) {
          setHistoryError("Could not load attempt history. Please try again.");
        }
      } finally {
        if (activeHistoryTestIdRef.current === testId) {
          setHistoryLoading(false);
        }
      }
    })();

    historyRequestRef.current = { testId, promise: request };
    try {
      await request;
    } finally {
      if (historyRequestRef.current?.promise === request) {
        historyRequestRef.current = null;
      }
    }
  }

  async function handleDomainSelect(domain: PlacementDomain) {
    setSelectedDomain(domain);
    setActiveTestId(null);
    setAnswers({});
    setSubmitted(false);
    setScoreResult(null);
    setScoreError("");
    setLoadError("");
    setLoading(true);
    try {
      const result = await listAvailablePlacementTests(domain);
      if (result.success) {
        setTests(result.data);
      } else {
        setLoadError(result.error);
        setTests([]);
      }
    } catch {
      setLoadError("Could not load practice tests. Please try again.");
      setTests([]);
    } finally {
      setLoading(false);
    }
  }

  function startTest(testId: number) {
    setActiveTestId(testId);
    setAnswers({});
    setSubmitted(false);
    setScoreResult(null);
    setScoreError("");
    setAttemptHistory([]);
    setHistoryError("");
    activeHistoryTestIdRef.current = testId;
    void loadAttemptHistory(testId);
  }

  async function submitAttempt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeTestId || scoring) return;
    setScoring(true);
    setScoreError("");
    try {
      const result = await scoreAttempt(activeTestId, answers);
      if (result.success) {
        setScoreResult(result);
        setSubmitted(true);
        // Refresh history to include the just-saved attempt
        void loadAttemptHistory(activeTestId, true);
      } else {
        setScoreError(result.error);
      }
    } catch {
      setScoreError("Scoring failed. Please try again.");
    } finally {
      setScoring(false);
    }
  }

  function retakeTest() {
    setAnswers({});
    setSubmitted(false);
    setScoreResult(null);
    setScoreError("");
  }

  const activeTest = tests.find((test) => test.id === activeTestId);

  // ── Domain picker ──────────────────────────────────────────────────────────
  if (!selectedDomain) {
    return (
      <AppShell role="student" title="Assessments" eyebrow="Preparation center">
        <div className="mb-6">
          <p className="text-sm text-[#6e786f]">
            Choose a domain to see available practice tests.
          </p>
        </div>

        {loadError && (
          <p className="mb-4 rounded-lg border border-[#f1d1ce] bg-[#fff8f7] p-3 text-sm text-[#b94b48]" role="alert">
            {loadError}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PLACEMENT_DOMAINS.map((domain) => (
            <button
              key={domain.value}
              type="button"
              onClick={() => void handleDomainSelect(domain.value)}
              className="rounded-xl border border-[#e2e7e1] bg-white p-6 text-left hover:border-[#176b50] hover:shadow-sm transition-shadow"
            >
              <h2 className="text-sm font-semibold text-[#17211b]">{domain.label}</h2>
              <p className="mt-1 text-xs text-[#6e786f]">
                3 default tests + any published tests
              </p>
              <span className="mt-3 inline-block rounded-lg bg-[#e6f2ec] px-3 py-1 text-xs font-semibold text-[#176b50]">
                Practice →
              </span>
            </button>
          ))}
        </div>
      </AppShell>
    );
  }

  // ── Active test ────────────────────────────────────────────────────────────
  if (activeTest) {
    return (
      <AppShell role="student" title="Assessments" eyebrow="Preparation center">
        <ActivePracticeTest
          test={activeTest}
          answers={answers}
          submitted={submitted}
          scoring={scoring}
          scoreError={scoreError}
          scoreResult={submitted && scoreResult && scoreResult.success ? scoreResult : null}
          attemptHistory={attemptHistory}
          historyLoading={historyLoading}
          historyError={historyError}
          onRetryHistory={() => {
            if (activeTestId !== null) void loadAttemptHistory(activeTestId);
          }}
          onAnswer={(questionId, answer) =>
            setAnswers((current) => ({ ...current, [questionId]: answer }))
          }
          onSubmit={submitAttempt}
          onRetake={retakeTest}
          onBack={() => {
            activeHistoryTestIdRef.current = null;
            setActiveTestId(null);
          }}
        />
      </AppShell>
    );
  }

  // ── Test list for selected domain ──────────────────────────────────────────
  const domainLabel = getDomainLabel(selectedDomain);

  return (
    <AppShell role="student" title="Assessments" eyebrow="Preparation center">
      {/* Back to domain picker */}
      <button
        type="button"
        onClick={() => setSelectedDomain(null)}
        className="mb-6 flex items-center gap-1 text-sm font-semibold text-[#176b50] hover:underline"
        aria-label="Back to domain selection"
      >
        ← All domains
      </button>

      <div className="mb-6">
        <h2 className="text-lg font-semibold">{domainLabel}</h2>
        <p className="mt-1 text-sm text-[#6e786f]">
          Select a practice test to begin.
        </p>
      </div>

      {loadError && (
        <p className="mb-4 rounded-lg border border-[#f1d1ce] bg-[#fff8f7] p-3 text-sm text-[#b94b48]" role="alert">
          {loadError}
        </p>
      )}

      {loading ? (
        <p className="rounded-xl border border-[#e2e7e1] bg-white p-8 text-center text-sm text-[#6e786f]" role="status">
          Loading tests…
        </p>
      ) : tests.length === 0 ? (
        <p className="rounded-xl border border-[#e2e7e1] bg-white p-8 text-center text-sm text-[#6e786f]">
          No practice tests are currently available for this domain.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {tests.map((test) => (
            <article key={test.id} className="rounded-xl border border-[#e2e7e1] bg-white p-5">
              <div className="mb-3 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-[#69736b]">
                <span className="rounded-md bg-[#f1f3ef] px-2 py-1">
                  {getDifficultyLabel(test.difficulty)}
                </span>
                {test.isDefault && (
                  <span className="rounded-md bg-[#e6f2ec] px-2 py-1 text-[#176b50]">
                    Default
                  </span>
                )}
              </div>
              <h3 className="text-sm font-semibold">{test.title}</h3>
              {test.description && (
                <p className="mt-1 text-xs text-[#6e786f]">{test.description}</p>
              )}
              <p className="mt-3 text-xs text-[#6e786f]">
                {test.questions.length}{" "}
                {test.questions.length === 1 ? "question" : "questions"}
              </p>
              <button
                type="button"
                onClick={() => startTest(test.id)}
                className="mt-4 rounded-lg border border-[#b9d6c4] px-4 py-2 text-xs font-semibold text-[#176b50]"
              >
                Start practice
              </button>
            </article>
          ))}
        </div>
      )}
    </AppShell>
  );
}

// ─── Active test component ───────────────────────────────────────────────────

export function ActivePracticeTest({
  test,
  answers,
  submitted,
  scoring = false,
  scoreError = "",
  scoreResult = null,
  attemptHistory = [],
  historyLoading = false,
  historyError = "",
  onRetryHistory,
  onAnswer,
  onSubmit,
  onRetake,
  onBack,
}: {
  test: AvailablePlacementTest;
  answers: Record<number, AnswerOption>;
  submitted: boolean;
  scoring?: boolean;
  scoreError?: string;
  scoreResult?: {
    totalQuestions: number;
    answeredCount: number;
    correctCount: number;
    percentage: number;
    questionResults: QuestionResult[];
  } | null;
  attemptHistory?: AttemptSummary[];
  historyLoading?: boolean;
  historyError?: string;
  onRetryHistory?: () => void;
  onAnswer: (questionId: number, answer: AnswerOption) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onRetake?: () => void;
  onBack: () => void;
}) {
  // Build a lookup map from questionResults for fast access.
  const resultByQuestionId = new Map<number, QuestionResult>(
    scoreResult?.questionResults.map((r) => [r.questionId, r]) ?? [],
  );

  return (
    <section aria-labelledby="active-test-heading" className="rounded-xl border border-[#e2e7e1] bg-white p-5">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="active-test-heading" className="text-lg font-semibold">
            {test.title}
          </h2>
          <p className="mt-1 text-xs text-[#6e786f]">
            {getDomainLabel(test.domain)} · {getDifficultyLabel(test.difficulty)}
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-semibold text-[#176b50]"
        >
          Back to tests
        </button>
      </div>

      {test.description && (
        <p className="mb-5 text-sm text-[#6e786f]">{test.description}</p>
      )}

      {/* Score summary — shown only after successful scoring */}
      {submitted && scoreResult && (
        <div
          className="mb-5 rounded-lg border border-[#b9d6c4] bg-[#f7fbf8] p-4 text-sm text-[#176b50]"
          role="status"
          aria-live="polite"
        >
          You scored {scoreResult.correctCount} / {scoreResult.totalQuestions} (
          {scoreResult.percentage % 1 === 0
            ? scoreResult.percentage.toFixed(0)
            : scoreResult.percentage.toFixed(1)}
          %)
        </div>
      )}

      {/* Scoring error — allows retry */}
      {scoreError && !submitted && (
        <p
          className="mb-5 rounded-lg border border-[#f1d1ce] bg-[#fff8f7] p-3 text-sm text-[#b94b48]"
          role="alert"
        >
          {scoreError}
        </p>
      )}

      {/* Previous attempt history */}
      {(historyLoading || historyError || attemptHistory.length > 0) && (
        <section aria-labelledby="attempt-history-heading" className="mb-5">
          <h3 id="attempt-history-heading" className="mb-2 text-xs font-bold uppercase tracking-widest text-[#69736b]">
            Previous attempts
          </h3>
          {historyLoading ? (
            <p className="text-xs text-[#6e786f]" role="status">Loading history…</p>
          ) : null}
          {historyError && (
            <div className="mb-2 rounded-lg border border-[#f1d1ce] bg-[#fff8f7] p-3 text-sm text-[#b94b48]" role="alert">
              <p>{historyError}</p>
              {onRetryHistory && (
                <button
                  type="button"
                  onClick={onRetryHistory}
                  disabled={historyLoading}
                  className="mt-2 font-semibold underline disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Retry loading history
                </button>
              )}
            </div>
          )}
          {attemptHistory.length > 0 && (
            <ol className="space-y-2">
              {attemptHistory.map((attempt, index) => (
                <li
                  key={attempt.id}
                  className="rounded-lg border border-[#edf0ec] bg-[#fafbf9] px-4 py-3 text-xs"
                >
                  <span className="font-semibold text-[#17211b]">Attempt {index + 1}</span>
                  <span className="ml-3 text-[#176b50]">
                    {attempt.correctCount} / {attempt.totalQuestions} ({
                      attempt.percentage % 1 === 0
                        ? attempt.percentage.toFixed(0)
                        : attempt.percentage.toFixed(1)
                    }%)
                  </span>
                  <span className="ml-3 text-[#6e786f]">
                    {new Date(attempt.completedAt).toLocaleString("en-IN", {
                      day: "numeric", month: "short", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      <form onSubmit={onSubmit}>
        <div className="space-y-5">
          {test.questions.map((question, index) => {
            const result = resultByQuestionId.get(question.id);
            const isUnanswered = submitted && result?.studentAnswer === null;
            const isCorrect = submitted && result?.isCorrect === true;
            const isIncorrect = submitted && result !== undefined && !result.isCorrect;

            // Border color after submission
            let fieldsetClass = "rounded-lg border border-[#edf0ec] p-4";
            if (isCorrect) fieldsetClass = "rounded-lg border border-[#b9d6c4] bg-[#f7fbf8] p-4";
            else if (isIncorrect) fieldsetClass = "rounded-lg border border-[#f1d1ce] bg-[#fff8f7] p-4";

            return (
              <fieldset key={question.id} className={fieldsetClass}>
                <legend className="px-1 text-sm font-semibold">
                  {index + 1}. {question.prompt}
                </legend>

                {/* Post-submission status badge */}
                {submitted && result && (
                  <p className="mt-1 text-xs font-semibold" aria-live="polite">
                    {isUnanswered ? (
                      <span className="text-[#6e786f]">Not answered</span>
                    ) : isCorrect ? (
                      <span className="text-[#176b50]">✓ Correct</span>
                    ) : (
                      <span className="text-[#b94b48]">✗ Incorrect</span>
                    )}
                  </p>
                )}

                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {question.options.map((option, optionIndex) => {
                    const answer = ANSWER_OPTIONS[optionIndex];
                    const isStudentPick = answers[question.id] === answer;
                    const isCorrectOption = submitted && result?.correctAnswer === answer;

                    // Highlight correct option after submission
                    let labelClass = "flex items-start gap-2 rounded-md border border-[#edf0ec] p-3 text-sm text-[#405147]";
                    if (submitted) {
                      if (isCorrectOption) {
                        labelClass = "flex items-start gap-2 rounded-md border border-[#b9d6c4] bg-[#eaf5ef] p-3 text-sm text-[#176b50] font-semibold";
                      } else if (isStudentPick && !isCorrectOption) {
                        labelClass = "flex items-start gap-2 rounded-md border border-[#f1d1ce] bg-[#fff8f7] p-3 text-sm text-[#b94b48]";
                      }
                    }

                    return (
                      <label key={answer} className={labelClass}>
                        <input
                          type="radio"
                          name={`question-${question.id}`}
                          value={answer}
                          checked={isStudentPick}
                          onChange={() => onAnswer(question.id, answer)}
                          disabled={submitted}
                          className="mt-0.5 accent-[#176b50]"
                        />
                        <span>
                          {option}
                          {submitted && isCorrectOption && (
                            <span className="ml-1 text-xs">(correct)</span>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}
        </div>

        {!submitted && (
          <button
            type="submit"
            disabled={scoring}
            aria-disabled={scoring}
            className="mt-5 rounded-lg bg-[#176b50] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#12563f] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {scoring ? "Scoring…" : "Submit answers"}
          </button>
        )}
        {submitted && onRetake && (
          <button
            type="button"
            onClick={onRetake}
            className="mt-5 rounded-lg border border-[#b9d6c4] px-4 py-2.5 text-sm font-semibold text-[#176b50] hover:bg-[#f7fbf8]"
          >
            Retake test
          </button>
        )}
      </form>
    </section>
  );
}
