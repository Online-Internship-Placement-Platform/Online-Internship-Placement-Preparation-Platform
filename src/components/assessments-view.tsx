"use client";

import { useState, type FormEvent } from "react";
import { AppShell } from "@/components/app-shell";
import {
  ANSWER_OPTIONS,
  getDifficultyLabel,
  getDomainLabel,
  type AnswerOption,
} from "@/lib/assessment-options";
import type { AvailablePlacementTest } from "@/app/student/assessments/actions";

export default function AssessmentsView({
  tests,
  error,
}: {
  tests: AvailablePlacementTest[];
  error?: string;
}) {
  const [activeTestId, setActiveTestId] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<number, AnswerOption>>({});
  const [submitted, setSubmitted] = useState(false);
  const activeTest = tests.find((test) => test.id === activeTestId);

  function startTest(testId: number) {
    setActiveTestId(testId);
    setAnswers({});
    setSubmitted(false);
  }

  function submitAttempt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <AppShell role="student" title="Assessments" eyebrow="Preparation center">
      <div className="mb-6">
        <p className="text-sm text-[#6e786f]">
          Choose an available placement test and answer its questions.
        </p>
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-[#f1d1ce] bg-[#fff8f7] p-3 text-sm text-[#b94b48]" role="alert">
          {error}
        </p>
      )}

      {activeTest ? (
        <ActivePracticeTest
          test={activeTest}
          answers={answers}
          submitted={submitted}
          onAnswer={(questionId, answer) =>
            setAnswers((current) => ({ ...current, [questionId]: answer }))
          }
          onSubmit={submitAttempt}
          onBack={() => setActiveTestId(null)}
        />
      ) : tests.length === 0 ? (
        <p className="rounded-xl border border-[#e2e7e1] bg-white p-8 text-center text-sm text-[#6e786f]">
          No practice tests are currently available.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {tests.map((test) => (
            <article key={test.id} className="rounded-xl border border-[#e2e7e1] bg-white p-5">
              <div className="mb-3 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wide text-[#69736b]">
                <span className="rounded-md bg-[#f1f3ef] px-2 py-1">
                  {getDomainLabel(test.domain)}
                </span>
                <span className="rounded-md bg-[#f1f3ef] px-2 py-1">
                  {getDifficultyLabel(test.difficulty)}
                </span>
              </div>
              <h2 className="text-sm font-semibold">{test.title}</h2>
              {test.description && (
                <p className="mt-1 text-xs text-[#6e786f]">{test.description}</p>
              )}
              <p className="mt-3 text-xs text-[#6e786f]">
                {test.questions.length} {test.questions.length === 1 ? "question" : "questions"}
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

export function ActivePracticeTest({
  test,
  answers,
  submitted,
  onAnswer,
  onSubmit,
  onBack,
}: {
  test: AvailablePlacementTest;
  answers: Record<number, AnswerOption>;
  submitted: boolean;
  onAnswer: (questionId: number, answer: AnswerOption) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onBack: () => void;
}) {
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

      {submitted && (
        <div className="mb-5 rounded-lg border border-[#b9d6c4] bg-[#f7fbf8] p-4 text-sm text-[#176b50]" role="status">
          Your answers are recorded in this page session only. Scores and saved attempt history are not available yet.
        </div>
      )}
      <form onSubmit={onSubmit}>
        <div className="space-y-5">
          {test.questions.map((question, index) => (
            <fieldset
              key={question.id}
              className="rounded-lg border border-[#edf0ec] p-4"
            >
              <legend className="px-1 text-sm font-semibold">
                {index + 1}. {question.prompt}
              </legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {question.options.map((option, optionIndex) => {
                  const answer = ANSWER_OPTIONS[optionIndex];
                  return (
                    <label
                      key={answer}
                      className="flex items-start gap-2 rounded-md border border-[#edf0ec] p-3 text-sm text-[#405147]"
                    >
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        value={answer}
                        checked={answers[question.id] === answer}
                        onChange={() => onAnswer(question.id, answer)}
                        required
                        disabled={submitted}
                        className="mt-0.5 accent-[#176b50]"
                      />
                      <span>{option}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>
        {!submitted && (
          <button
            type="submit"
            className="mt-5 rounded-lg bg-[#176b50] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#12563f]"
          >
            Submit answers
          </button>
        )}
      </form>
    </section>
  );
}
