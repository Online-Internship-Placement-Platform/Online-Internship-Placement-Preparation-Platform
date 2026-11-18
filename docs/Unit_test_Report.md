# Software Testing Report

## Online Internship and Placement Preparation Platform

**Document type:** Software Test Execution Report

**Project phase:** Software Engineering Mini-Project

**Reporting date:** 18 November 2026

**Prepared for:** Project review and viva examination

---

# 1. Introduction

## 1.1 Purpose

This report documents the software testing work performed for the Online Internship and Placement Preparation Platform.

The project is a full-stack Next.js application containing modules for:

- Student and administrator authentication

- Student profile management

- Internship listing and eligibility

- Internship applications

- Placement test and question-bank management

- Attempt history and automatic scoring

- Recommended learning material

- Administrative dashboards

## 1.2 Objectives of testing

The principal testing objectives were:

1. Verify functional requirements for each implemented module.

2. Verify role-based access control.

3. Verify validation of user input.

4. Verify scoring and percentage calculations.

5. Verify question-bank filtering.

6. Verify placement-test result and attempt-history behavior.

7. Verify basic browser-level behavior using Playwright.

8. Measure or attempt to verify selected performance requirements.

9. Identify implemented behavior that has not yet been confirmed through real database integration or browser execution.

Testing was performed at unit, component, server-action and browser levels.

---

# 2. Testing Scope and Levels

## 2.1 Unit testing

Unit testing verifies small functions or modules independently.

Examples include:

- Placement-test filtering functions

- Internship input validation

- Profile validation

- Score calculation

- Password verification

- Eligibility validation

## 2.2 Component testing

Component testing verifies the behavior and rendered output of React components.

Examples include:

- Admin question-bank forms

- Assessment result display

- Student profile components

- Dashboard empty states

- Registration forms

- Attempt-history error and retry states

## 2.3 Integration-oriented testing

Some Vitest tests invoke server actions and verify calls made to Prisma. These tests are integration-shaped unit tests, but most use mocked Prisma methods.

They verify application logic and call parameters. They do not establish that a real MySQL database accepts and returns the data.

## 2.4 Browser-based testing

Playwright tests operate through a real browser.

The browser tests cover:

- Login

- Student and administrator navigation

- Practice-test submission

- Question-bank filtering

- Internship filtering

- Display and interaction time thresholds

## 2.5 Testing not verified

The following areas were not fully demonstrated by the available evidence:

- Real MySQL database integration

- Test-code coverage execution (coverage is configured but not run by default with `npm test`)

- Branch coverage

- Full system testing

- Real-world load testing

- Security penetration testing

---

# 3. Testing Environment and Tools

## 3.1 Application environment

| Item | Technology |
|---|---|
| Application framework | Next.js 16.4.2 |
| Language | TypeScript |
| Runtime | Node.js |
| Frontend library | React 19.3.0 |
| Database | MySQL |
| Database ORM | Prisma 7.10.1 |
| Runtime database adapter | Prisma MariaDB adapter |
| Unit/component runner | Vitest 3.2.7 |
| Browser test runner | Playwright 1.64.1 |
| Component simulation | jsdom |
| Browser | Chromium |
| CI platform | GitHub Actions |
| CI Node.js version | Node.js 22 |

Testing dependencies are declared in `package.json`.

## 3.2 Vitest technologies

Vitest uses:

- `vitest.config.ts`

- `@vitejs/plugin-react`

- `vite-tsconfig-paths`

- Testing Library React

- Testing Library DOM

- jsdom

- Vitest mocks through `vi.mock()` and `vi.fn()`

- React server-side rendering for selected component tests

The default Vitest environment is jsdom. Server-action test files that need Node semantics use the `// @vitest-environment node` directive.

Coverage is configured in `vitest.config.ts` with the v8 provider, text/html/lcov reporters, and a reports directory at `./coverage`. However, the default `npm test` command (`vitest run --reporter=verbose`) does not include the `--coverage` flag. Separate coverage scripts (`test:coverage:backend`, `test:coverage:frontend`) use dedicated configuration files.

## 3.3 Playwright technologies

Playwright is configured by `playwright.config.ts`.

The configuration includes:

- Chromium desktop browser

- HTML reporter

- One worker

- `tests/performance.spec.ts` as the test target

- Automatic startup of `npm run dev` when no external `PLAYWRIGHT_BASE_URL` is supplied

- A wait for the `/login` page before Playwright considers the server ready

- Disabled trace collection

- No automatic Playwright execution in the CI workflow

The browser test implementation is `tests/performance.spec.ts`.

Authentication credentials are read from environment variables:

- `PLAYWRIGHT_STUDENT_EMAIL`

- `PLAYWRIGHT_STUDENT_PASSWORD`

- `PLAYWRIGHT_ADMIN_EMAIL`

- `PLAYWRIGHT_ADMIN_PASSWORD`

No credentials are stored in the test file.

## 3.4 Test commands

| Command | Purpose |
|---|---|
| `npm test` | Runs the Vitest files included by `vitest.config.ts` |
| `npm run test:e2e:performance` | Runs `playwright test tests/performance.spec.ts` |
| `npm run test:coverage:backend` | Runs Vitest with backend coverage config and `--coverage` |
| `npm run test:coverage:frontend` | Runs Vitest with frontend coverage config and `--coverage` |
| `npm run lint` | Executes ESLint |
| `npm run build` | Generates the application build |
| `npm run dev` | Starts Next.js development mode |

Vitest and Playwright commands produce separate results and must not be combined into a single test count.

---

# 4. Vitest Test Selection

## 4.1 Included test files

The following include patterns are defined by `vitest.config.ts`:

- `__tests__/**/*.{test,spec}.{ts,tsx}`

- `src/modules/applications/**/*_test.ts`

- `src/tests/placement-test-management/sprint1/**/*.test.ts`

- `src/tests/placement-test-management/sprint2/**/*.test.ts`

Vitest therefore includes:

- 43 files under `__tests__/`

- 3 files under `src/modules/applications/` (using the `_test.ts` suffix)

- 4 Sprint 1 placement-test files

- 2 Sprint 2 placement-test files

The total selected by the confirmed run was **52 test files**.

## 4.2 Excluded files

The following test-looking files are not included in the default Vitest configuration:

- Files under `src/tests/placement-test-management/additional/`

- `src/app/admin/assessments/actions.test.ts`

- `src/app/admin/assessments/page.test.ts`

- `src/app/student/assessments/actions.test.ts`

- `src/components/admin-question-bank.test.ts`

- `src/components/assessments-view.test.ts`

- `src/lib/assessment-options.test.ts`

- Standalone Node assertion scripts under `src/modules/` (excluding `src/modules/applications/`)

These files require a separate invocation or a configuration change before they contribute to `npm test`.

---

# 5. Overall Vitest Execution Summary

The confirmed Vitest execution was performed on **18 November 2026**.

| Metric | Confirmed result |
|---|---|
| Test files passed | 52 |
| Individual tests passed | 372 |
| Execution duration | 17.58 seconds |
| Placement Test Management tests passed | 91 |
| Placement Test Management files passed | 6 |

The Placement Test Management result is a subset of the overall Vitest count and must not be added to the 372 tests again.

The placement-test contribution was distributed across:

- `tc14-admin-crud.test.ts` — 17 tests

- `tc15-filtering-access.test.ts` — 19 tests

- `tc16-student-domain-selection.test.ts` — 11 tests

- `tc17-scoring-display.test.ts` — 17 tests

- `tc18-attempt-history.test.ts` — 24 tests

- `tc18-history-ui.test.ts` — 3 tests

---

# 6. Unit and Component Test Cases

## 6.1 Placement Test Management

### TC-14 — Question and Placement-Test CRUD

**Test file:** `src/tests/placement-test-management/sprint1/tc14-admin-crud.test.ts`

**Tests:** 17

**Requirements covered:**

- REQ-14

- Admin CRUD for questions and grouped placement tests

- Domain and difficulty tagging

- Test publication and unpublication

| Test scenario | Input | Expected result | Confirmed status |
|---|---|---|---|
| Create valid question | Valid prompt, four distinct options, correct option, domain and difficulty | Question creation succeeds and data is passed to Prisma | Pass |
| Store question tags | Domain `WEB_DEVELOPMENT`, difficulty `EASY` | Domain and difficulty are included in `prisma.question.create()` data | Pass |
| Reject empty prompt | Prompt set to an empty string | Question creation fails with a required-field error | Pass |
| Reject duplicate options | Two identical answer options | Question creation fails with a distinct-options error | Pass |
| Update question | Valid updated question | `prisma.question.update()` is called successfully | Pass |
| Block incompatible domain update | Question belongs to a test in `AI_ML`; update is requested for `DATABASES` | Domain change is rejected | Pass |
| Delete valid question | Positive question ID | Question deletion succeeds | Pass |
| Reject invalid question ID | Negative question ID | Deletion fails | Pass |
| Create grouped test | Valid test title, domain, difficulty and question ID | Test is created as an unpublished custom test | Pass |
| Reject test without questions | Empty `questionIds` array | Test creation fails | Pass |
| Reject mismatched questions | Questions do not share the test's domain/difficulty | Test creation fails | Pass |
| Update custom test | Valid title, description, domain, difficulty and questions | Test and question assignments are updated | Pass |
| Replace test questions | Existing test with existing question assignments | Existing assignments are deleted and replacements are added | Pass |
| Publish custom test | Valid unpublished custom test | `isPublished` is set to `true` | Pass |
| Unpublish custom test | Valid published custom test | `isPublished` is set to `false` | Pass |
| Delete custom test | Valid custom test ID | Test deletion succeeds | Pass |
| Prevent default-test deletion | Default test ID | Deletion is rejected | Pass |

These tests mock Prisma and server authentication. They confirm the server-action logic but do not confirm an actual database deletion or insertion in MySQL.

---

### TC-15 — Filtering and Role-Based Access

**Test file:** `src/tests/placement-test-management/sprint1/tc15-filtering-access.test.ts`

**Tests:** 19

| Test scenario | Input | Expected result | Confirmed status |
|---|---|---|---|
| Filter questions by domain | Domain `AI_ML` | Only AI/ML questions are returned | Pass |
| Filter questions by difficulty | Difficulty `EASY` | Only Easy questions are returned | Pass |
| Combined question filters | Domain and difficulty | Only questions matching both filters are returned | Pass |
| No question filter | `ALL` domain and difficulty | All questions are returned | Pass |
| Search question text/options | Text or option such as "SIGMOID" | Matching questions are found without case sensitivity | Pass |
| Filter placement tests | Domain and difficulty values | Matching tests are returned | Pass |
| Filter tests by difficulty | Difficulty value | Matching tests are returned | Pass |
| Filter tests by both domain and difficulty | Both filters | Matching tests are returned | Pass |
| Validate placement domains | Five known domains | Domain values are accepted | Pass |
| Reject unknown domain | `UNKNOWN` | Domain validation fails | Pass |
| Validate difficulty levels | Easy, Medium and Hard | Difficulty values are accepted | Pass |
| Reject unknown difficulty | `EXPERT` | Difficulty validation fails | Pass |
| Allow admin question-bank access | Admin session | Question-bank access succeeds | Pass |
| Reject student question-bank management | Student session | Creation is rejected | Pass |
| Apply domain filter to Prisma query | `WEB_DEVELOPMENT` | Correct Prisma `where` condition is used | Pass |
| Allow student test listing | Student session | Available tests are listed | Pass |
| Hide unpublished/draft tests | Student test query | Only default or published tests are requested | Pass |
| Reject admin from student test listing | Administrator session | Student-only action rejects the request | Pass |
| Do not expose correct answers | Student test-listing request | Correct-answer fields are not included in the response | Pass |

---

### TC-16 — Student Domain Selection and Test Attempt

**Test file:** `src/tests/placement-test-management/sprint1/tc16-student-domain-selection.test.ts`

**Tests:** 11

| Test scenario | Input | Expected result | Confirmed status |
|---|---|---|---|
| Provide five domains | Domain configuration | All five domain options exist | Pass |
| Filter by Web Development | Test list containing Web Development and AI/ML tests | Only Web Development test is returned | Pass |
| Request domain-specific tests | `WEB_DEVELOPMENT` | Prisma query includes the domain filter | Pass |
| Reject invalid domain | `INVALID_DOMAIN` | Server action returns a validation error | Pass |
| Return available tests | Mocked student test record | Test data is returned successfully | Pass |
| Return four options | Test question record | Question exposes exactly four options | Pass |
| Submit with no answers | Empty answer object | Submission is allowed and no incorrect required-field message is shown | Pass |
| Submit partially answered test | One answer out of two | Submission is still allowed | Pass |
| Submit fully answered test | Both answers supplied | Submission is allowed | Pass |
| Render questions after submission | Submitted test state | Questions and options remain visible | Pass |
| Hide correct answers before submission | Pre-submission state | Correct answer and final score are not displayed | Pass |

---

### TC-17 — Automatic Scoring and Display

**Test file:** `src/tests/placement-test-management/sprint1/tc17-scoring-display.test.ts`

**Tests:** 17

| Test scenario | Input | Expected result | Confirmed status |
|---|---|---|---|
| Fully answered test, one correct | Answers A and B; correct answers A and C | Score is 1 and answered count is 2 | Pass |
| Partial answer | Only answer A is supplied | Answered count is 1; correct count is 1 | Pass |
| No answers | Empty answer object | Correct count is 0 | Pass |
| All answers correct | A and C | Correct count is 2 | Pass |
| 50 percent | One correct answer from two | Percentage is 50 | Pass |
| 100 percent | Two correct answers | Percentage is 100 | Pass |
| 0 percent | No correct answers | Percentage is 0 | Pass |
| Zero-question test | Test with an empty question array | No division by zero; percentage is 0 | Pass |
| Unanswered question | No student answer | Student answer is null and result is incorrect | Pass |
| Client-supplied incorrect value | Student submits B when correct answer is A | Database answer A is used to calculate and report correctness | Pass |
| Selected-test result isolation | Answers for test containing question IDs 12 and 13 | Only questions belonging to the selected test are returned | Pass |
| Display score summary | Submitted score of 1/2 | UI contains `You scored 1 / 2 (50%)` | Pass |
| Hide submit button | Submitted state | Submit button is not rendered | Pass |
| Mark correct answers | Submitted state | UI identifies correct and incorrect answers | Pass |
| Reveal correct answers | Submitted state | Correct answer text is shown | Pass |
| Label unanswered answers | Answer null | UI displays "Not answered" | Pass |
| Prevent duplicate submission | Scoring in progress | Scoring state is shown and submit button is disabled | Pass |

Vitest verifies server-side score logic and rendered result text. It does not execute real timing or real database persistence.

---

### TC-18 — Attempt History and Retakes

**Test file:** `src/tests/placement-test-management/sprint2/tc18-attempt-history.test.ts`

**Tests:** 24

| Test scenario | Input | Expected result | Confirmed status |
|---|---|---|---|
| Persist submitted attempt | One valid answer submission | `prisma.testAttempt.create()` is called once | Pass |
| Return attempt ID | Mock attempt ID 42 | Response includes attempt ID 42 | Pass |
| Missing student identity | Session returns no email | Scoring and persistence are rejected | Pass |
| Store correct score | Two correct answers | Correct count is 2 | Pass |
| Store percentage | One correct out of two | Percentage is 50 | Pass |
| Store question-wise answers | One correct and one incorrect answer | JSON answer data contains both question results | Pass |
| Store unanswered questions | Empty answer object | Student answer is null and correctness is false | Pass |
| Scope attempt to session student | Authenticated student email | Database attempt uses the verified session email | Pass |
| Persistence failure | Prisma create rejects | Server action returns a safe error | Pass |
| Retake | Two submissions for the same test | Two separate create calls and attempt IDs are produced | Pass |
| Independent retake scores | First all-correct; second all-incorrect | Each attempt retains its own score | Pass |
| Empty history | No matching attempt rows | Empty attempt list is returned | Pass |
| Return timestamp | Stored attempt timestamp | Timestamp is returned in ISO format | Pass |
| Return question-wise history | Stored attempt JSON | Question-wise correctness is returned | Pass |
| Student-history database filter | Student email and test ID | Prisma query is scoped to the student and test | Pass |
| Prevent cross-student history | Student A signs in and requests history | Student A is the only student used in the database filter | Pass |
| Reject admin history access | Admin session | Access is rejected | Pass |
| Reject invalid test ID | Test ID 0 | History request fails | Pass |
| Reject inaccessible test | Test ID not available to student | Access fails safely | Pass |
| Handle history database error | Prisma findMany rejects | Safe error is returned | Pass |
| Preserve scoring after persistence | Valid submission | Score still calculates correctly | Pass |
| Zero-question test safety | Empty question array | No division by zero | Pass |
| Reject invalid test ID (scoring) | Test ID 0 | Scoring is rejected | Pass |
| Reject non-student role (scoring) | Admin session | Scoring is rejected | Pass |

**History UI test file:** `src/tests/placement-test-management/sprint2/tc18-history-ui.test.ts`

**Tests:** 3

| Test scenario | Expected result | Confirmed status |
|---|---|---|
| History-load failure | UI displays an accessible alert and retry control | Pass |
| Retry callback | Retry button calls the supplied reload callback | Pass |
| Existing history with refresh error | Previous attempts remain visible with the refresh error | Pass |

---

## 6.2 Account and Authentication Module

| Test file | Tests | Tests performed | Execution status |
|---|---|---|---|
| `account-management.test.ts` | 21 | Admin account requests, approvals and deletion | Pass |
| `account-request-view.test.tsx` | 4 | Loading, error, retry and account-request display | Pass |
| `auth-actions.test.ts` | 2 | Legacy demo sign-in actions credential validation | Pass |
| `auth-me.test.ts` | 3 | Database-backed session identity and invalid-session handling | Pass |
| `authentication-backend.test.ts` | 5 | Password hash and account authentication | Pass |
| `demo-auth-accounts.test.ts` | 4 | Demo credential lookup and role mapping | Pass |
| `register-page.test.tsx` | 1 | Registration success and form reset | Pass |
| `registration.test.ts` | 6 | Student registration and invalid email validation | Pass |
| `request-admin-account.test.tsx` | 2 | Admin account request status and resubmission | Pass |
| `server-auth.test.ts` | 5 | Role session creation and configuration | Pass |
| `server-session.test.ts` | 8 | Verified server sessions and legacy session handling | Pass |
| `transport-security.test.ts` | 5 | HSTS behavior in production and non-production environments | Pass |

**Module total:** 12 files, 66 tests, all passed.

---

## 6.3 Internship Module

| Test file | Tests | Tests performed | Execution status |
|---|---|---|---|
| `admin-internship-api.test.ts` | 6 | Admin internship API authorization and CRUD operations | Pass |
| `admin-internships.test.tsx` | 5 | Admin listing navigation and empty/invalid input behavior | Pass |
| `internship-detail-eligibility.test.tsx` | 1 | Internships UI does not present employer skills as hard eligibility controls | Pass |
| `internship-management.test.ts` | 6 | Draft creation and independent publication/application flags | Pass |
| `internship-service.test.ts` | 3 | Published-listing retrieval and student eligibility behavior | Pass |
| `internship-validation.test.ts` | 12 | Location and compensation validation | Pass |
| `internships-eligibility.test.ts` | 3 | Authenticated student eligibility API and safe profile output | Pass |
| `internships-view.test.tsx` | 5 | Student internship directory rendering, filtering, and navigation | Pass |

**Module total:** 8 files, 41 tests, all passed.

---

## 6.4 Profile and Student Directory Module

| Test file | Tests | Tests performed | Execution status |
|---|---|---|---|
| `admin-student-directory-view.test.tsx` | 3 | Admin directory filtering, error handling, and empty results | Pass |
| `admin-student-directory.test.ts` | 2 | Admin-only directory API and sensitive-field protection | Pass |
| `private-resume-storage.test.ts` | 3 | Private resume storage validation | Pass |
| `profile-response.test.ts` | 2 | Student profile response projection | Pass |
| `profile-resume.test.ts` | 8 | Resume upload authentication, validation and filename handling | Pass |
| `profile-role.test.tsx` | 7 | Profile API role behavior and profile view | Pass |
| `student-directory-search.test.ts` | 14 | Skill filtering, deduplication and blank-value handling | Pass |
| `student-profile-update.test.ts` | 20 | Valid profile updates and empty-name rejection | Pass |
| `student-profile-view.test.tsx` | 4 | Profile editing, skill management, resume upload and validation | Pass |
| `student-resume-file.test.ts` | 2 | Student resume validation | Pass |

**Module total:** 10 files, 65 tests, all passed.

---

## 6.5 Dashboard Module

| Test file | Tests | Tests performed | Execution status |
|---|---|---|---|
| `admin-dashboard.test.tsx` | 4 | Role-based redirect and empty dashboard states | Pass |
| `shared-setup.test.tsx` | 3 | React and jsdom test-environment smoke verification | Pass |
| `student-dashboard-view.test.tsx` | 4 | Profile completion, recent applications, deadlines, and skill chips | Pass |

**Module total:** 3 files, 11 tests, all passed.

---

## 6.6 Recommended Videos Module

| Test file | Tests | Tests performed | Execution status |
|---|---|---|---|
| `recommended-video-api.test.ts` | 5 | Student read access and administrator management access | Pass |
| `recommended-video-service.test.ts` | 3 | Persistence and trusted YouTube URL derivation | Pass |
| `recommended-video-validation.test.ts` | 12 | Video category, payload and YouTube ID validation | Pass |
| `recommended-videos.test.tsx` | 4 | YouTube URL construction and category filtering | Pass |

**Module total:** 4 files, 24 tests, all passed.

---

## 6.7 Applications Module

| Test file | Tests | Tests performed | Execution status |
|---|---|---|---|
| `application-api.test.ts` | 7 | Student and administrative application APIs, resume ownership | Pass |
| `application-module.test.ts` | 7 | Application service preconditions, formatting, and error mapping | Pass |
| `applications-frontend.test.tsx` | 16 | Student application views, admin review, and detail forms | Pass |
| `src/modules/applications/eligibility_test.ts` | 19 | Application eligibility logic (deadline, CGPA, branch) | Pass |
| `src/modules/applications/application-validation_test.ts` | 4 | Application request validation (IDs, statuses, filters) | Pass |
| `src/modules/applications/application-access_test.ts` | 2 | Application resume ownership filter | Pass |

**Module total:** 6 files, 55 tests, all passed.

---

## 6.8 Role Routing Module

| Test file | Tests | Tests performed | Execution status |
|---|---|---|---|
| `role-pages.test.tsx` | 3 | Shared role page dispatch by role | Pass |
| `role-route-bindings.test.tsx` | 14 | Role route bindings for all roles and routes | Pass |

**Module total:** 2 files, 17 tests, all passed.

---

## 6.9 Assessments View Module

| Test file | Tests | Tests performed | Execution status |
|---|---|---|---|
| `assessments-view-flow.test.tsx` | 2 | Student assessments workflow, scoring, history, and error states | Pass |

**Module total:** 1 file, 2 tests, all passed.

---

## 6.10 Module Summary

| Module | Files | Tests | Status |
|---|---|---|---|
| Placement Test Management | 6 | 91 | All passed |
| Account and Authentication | 12 | 66 | All passed |
| Internship | 8 | 41 | All passed |
| Profile and Student Directory | 10 | 65 | All passed |
| Dashboard | 3 | 11 | All passed |
| Recommended Videos | 4 | 24 | All passed |
| Applications | 6 | 55 | All passed |
| Role Routing | 2 | 17 | All passed |
| Assessments View | 1 | 2 | All passed |
| **Total** | **52** | **372** | **All passed** |

---

# 7. Limitations of the Vitest Results

Most placement-test and other module tests mock the Prisma client.

Example mocks include:

- `prisma.question.create`

- `prisma.question.update`

- `prisma.question.delete`

- `prisma.placementTest.findMany`

- `prisma.testAttempt.create`

- `prisma.testAttempt.findMany`

Because these methods are mocked:

- The test does not send SQL to MySQL.

- It does not prove that the model was created in a migrated database.

- It does not prove that foreign-key constraints work.

- It does not prove that a MySQL transaction succeeds.

- It does not prove that a test-attempt record survived an application restart.

- It does not prove that a concurrent retake is handled correctly.

Vitest therefore verifies application behavior with controlled responses. Live database integration testing is still required for those behaviors.

Some Vitest tests intentionally log error messages to stderr as part of testing error-handling paths. These stderr entries are expected behavior from tests that verify safe error reporting, not test failures. All 372 tests passed.

---

# 8. Playwright Browser-Based End-to-End and Performance Testing

## 8.1 Playwright architecture

The browser tests follow this architecture:

```text
Playwright
  -> Chromium browser
  -> Next.js login page
  -> Application session
  -> Protected student/admin route
  -> Browser interactions
  -> DOM assertions
  -> Performance timing
```

The test implementation is `tests/performance.spec.ts`.

Authentication credentials are read from environment variables:

- `PLAYWRIGHT_STUDENT_EMAIL`

- `PLAYWRIGHT_STUDENT_PASSWORD`

- `PLAYWRIGHT_ADMIN_EMAIL`

- `PLAYWRIGHT_ADMIN_PASSWORD`

No credentials are stored in the test file.

## 8.2 Browser configuration

`playwright.config.ts` defines:

- `testDir: ./tests`

- Match pattern `**/performance.spec.ts`

- Chromium desktop device

- One browser worker

- No retries

- HTML reporting

- Trace collection disabled

- Local development server startup when `PLAYWRIGHT_BASE_URL` is absent

- Server startup command: `npm run dev -- --hostname 127.0.0.1`

- Readiness URL: `/login`

## 8.3 Execution command

```bash
npm run test:e2e:performance
```

This command expands to:

```bash
playwright test tests/performance.spec.ts
```

The Playwright suite is not included in `npm test`.

## 8.4 Execution result

The confirmed Playwright execution was performed on **18 November 2026**.

| Metric | Confirmed result |
|---|---|
| Tests passed | 4 |
| Tests failed | 0 |
| Tests skipped | 0 |
| Execution duration | 25.5 seconds |
| Browser | Chromium (desktop) |
| Workers | 1 |

All four browser-based performance tests passed.

---

## 8.5 TC-24 — Student Dashboard Readiness

**Test title:** `TC-24: student dashboard becomes interactive within 4 seconds`

**SRS target:** Dashboard readiness and primary interaction within 4 seconds.

**Implementation:**

- Sign in as a student

- Open `/student/dashboard`

- Measure from navigation

- Verify the "Good morning" heading is visible

- Verify the "Browse internships" link is visible and enabled

- Click the link

- Verify navigation to `/student/internships`

- Require elapsed time to be at most 4000 milliseconds

**Confirmed result:**

| Metric | Value |
|---|---|
| Elapsed time | 792 ms (0.792 s) |
| Threshold | 4000 ms (4.000 s) |
| Status | **Pass** |

The dashboard became interactive and primary navigation completed in 792 ms, well within the 4-second threshold.

---

## 8.6 TC-25 — Practice-Test Score Display

**Test title:** `TC-25: practice-test score and percentage appear within 3 seconds`

**SRS target:** NFR-2 / TC-25 — score and percentage must appear within 3 seconds of submission.

**Implementation:**

- Sign in as a student

- Open `/student/assessments`

- Select Web Development

- Locate a practice card with at least one question

- Answer the first radio button in every question

- Start a performance timer immediately before clicking `Submit answers`

- Wait up to 3 seconds for the score status

- Verify:

  - Correct score

  - Question count

  - Displayed percentage

- Require elapsed time to be at most 3000 milliseconds

**Confirmed result:**

| Metric | Value |
|---|---|
| Elapsed time | 289 ms (0.289 s) |
| Threshold | 3000 ms (3.000 s) |
| Status | **Pass** |

The practice-test score and percentage appeared in 289 ms, well within the 3-second threshold. The test executed successfully with valid Playwright student credentials and a populated Web Development practice test.

---

## 8.7 TC-26 — Internship Filtering Performance

**Test title:** `TC-26: client-side internship filtering updates within 3 seconds (initial API load excluded)`

**SRS target:** Internship-filter behavior within 3 seconds.

**Implementation:**

- Sign in as a student

- Wait for and verify the internship-listing API response

- Load the visible internship list

- Enter a guaranteed no-match search term

- Verify the "No internships match your filters" message

- Verify all visible result links disappear

- Require elapsed time to be at most 3000 milliseconds

**Limitation:** The initial API load is deliberately excluded from the timing measurement.

**Confirmed result:**

| Metric | Value |
|---|---|
| Elapsed time | 17 ms (0.017 s) |
| Threshold | 3000 ms (3.000 s) |
| Status | **Pass** |

Client-side internship filtering updated in 17 ms, well within the 3-second threshold.

---

## 8.8 TC-27 — Question-Bank Filtering Performance

**Test title:** `TC-27: client-side question-bank filtering updates within 3 seconds`

**SRS target:** NFR-4 / TC-27 — question-bank filtering should respond within 3 seconds.

**Implementation:**

- Sign in as an administrator

- Open `/admin/assessments`

- Select Web Development

- Wait for the question bank to finish loading

- Enter `__tc27_no_matching_question__`

- Verify the empty-result message

- Verify question headings disappear

- Require elapsed time to be at most 3000 milliseconds

**Important measurement limitation:**

TC-27 measures browser-side filtering after question-bank records have already loaded. It does **not** measure a MySQL query or a server-side database search.

**Confirmed result:**

| Metric | Value |
|---|---|
| Elapsed time | 33 ms (0.033 s) |
| Threshold | 3000 ms (3.000 s) |
| Status | **Pass** |

Client-side question-bank filtering updated in 33 ms, well within the 3-second threshold.

---

## 8.9 Playwright Summary

| Test case | Measured time | Threshold | Status |
|---|---|---|---|
| TC-24 — Dashboard readiness | 792 ms | 4000 ms | Pass |
| TC-25 — Score display | 289 ms | 3000 ms | Pass |
| TC-26 — Internship filtering | 17 ms | 3000 ms | Pass |
| TC-27 — Question-bank filtering | 33 ms | 3000 ms | Pass |
| **Total** | — | — | **4 passed** |

All Playwright browser tests passed with measured timings well below their respective thresholds.

---

# 9. Implemented, Executed, Skipped and Unverified Test Status

## 9.1 Implemented

Tests are considered implemented when source code exists.

Examples:

- Placement-test Vitest suites

- Mocked Prisma server-action tests

- React component tests

- Playwright performance specifications

- Other-module Vitest suites

- Standalone Node assertion scripts

## 9.2 Executed — Vitest

The confirmed Vitest run establishes:

- 52 test files passed

- 372 tests passed

- 91 Placement Test Management tests passed (subset of 372)

- Execution duration of 17.58 seconds

This result does not include Playwright tests.

## 9.3 Executed — Playwright

The confirmed Playwright run establishes:

- 4 tests passed

- 0 tests skipped

- 0 tests failed

- Execution duration of 25.5 seconds

All four browser-based performance tests (TC-24 through TC-27) passed with confirmed timing measurements.

## 9.4 Intentionally skipped

No tests were intentionally skipped in the confirmed Playwright run. All four tests executed and passed.

The Playwright test implementation includes conditional skip logic for cases where credentials or test data are unavailable. In the confirmed run, all preconditions were met and no skips occurred.

## 9.5 Not individually confirmed

All Vitest and Playwright tests in the default configurations have been executed and confirmed. The following remain unconfirmed:

- Real MySQL database integration (Vitest mocks Prisma)

- Coverage report generation (coverage is configured but not run by default)

- Tests excluded from the default Vitest configuration (see Section 4.2)

---

# 10. Testing Limitations and Gaps

## 10.1 Database integration gap

Most Vitest tests mock Prisma. Their pass result proves controlled application logic, but not the following:

- Actual MySQL connectivity

- Migration state

- Database constraints

- Persistence between application restarts

- Real foreign-key relationships

- Real attempt-history retrieval

- Real concurrent use

A dedicated integration test with a test MySQL database is required.

## 10.2 TC-27 measurement scope

TC-27 measures client-side filtering after question-bank records have already loaded. It does not measure server response time or database query time.

A separate server/database filtering test would be required to verify NFR-4 in its full intended meaning.

## 10.3 TC-26 measurement scope

TC-26 measures client-side internship filtering after the initial API response has been received. The initial API load is deliberately excluded from the timing measurement.

## 10.4 NFR-10 score reliability gap

TC-17 contains 17 representative scoring cases covering correct, partial, zero, all-correct, percentage, zero-question, unanswered, and client-supplied-value scenarios. A dedicated exhaustive valid-input test suite would be required to support a 100-percent reliability claim.

## 10.5 TC-36 admin-only management gap

Role-based access is tested for the question bank (TC-15), and internship UI tests exist. A dedicated shared TC-36 suite should verify both question-bank and internship listings using real role restrictions and mutation actions.

## 10.6 Configuration gap

Vitest does not include:

- Every file whose name contains `test`

- The standalone Node assertion scripts under `src/modules/` (excluding `src/modules/applications/`)

- The `additional/original-*` test files under `src/tests/placement-test-management/additional/`

- Several placement-component test files under `src/app`, `src/components` and `src/lib`

These files require explicit inclusion or separate execution.

## 10.7 Coverage gap

Code coverage is configured in `vitest.config.ts` with the v8 provider, text/html/lcov reporters, and include/exclude patterns. However, the default `npm test` command does not pass the `--coverage` flag, so no coverage report is generated by the standard test run.

Separate coverage scripts exist (`test:coverage:backend`, `test:coverage:frontend`) that use dedicated configuration files and the `--coverage` flag. These were not executed in the confirmed run.

Therefore:

- Line coverage is not reported from the confirmed run

- Statement coverage is not reported from the confirmed run

- Function coverage is not reported from the confirmed run

- Branch coverage is not reported from the confirmed run

- Critical branch coverage for score calculation and authorization is not reported

## 10.8 System testing gap

The Playwright browser tests (TC-24 through TC-27) have been executed and all passed with confirmed timing measurements. However, these tests cover a subset of the full application workflow. A complete system test report would require additional browser-level tests covering end-to-end workflows such as:

- Full registration to application submission

- Admin internship creation to student application

- Assessment attempt to history review

- Account request to super-admin approval

---

# 11. Final Conclusion

Unit and component testing is implemented across the project and was confirmed for 52 Vitest test files. The confirmed Vitest run passed 372 individual tests in 17.58 seconds.

The Placement Test Management module had 91 passing Vitest tests across six Sprint 1 and Sprint 2 test files. These tests cover:

- Question CRUD

- Placement-test CRUD

- Domain and difficulty tagging

- Question/test filtering

- Role-based access

- Student domain selection

- Answer submission

- Score and percentage calculation

- Question-wise correctness

- Attempt persistence calls

- Retakes

- Attempt-history retrieval

- History UI error handling

However, most Placement Test Management tests use mocked Prisma and server-auth dependencies. They verify application logic and function call structure. They do not prove live MySQL persistence or real database integration.

Playwright browser testing is configured and implemented for TC-24 through TC-27. All four tests were executed and passed with confirmed timing measurements:

- TC-24 (dashboard readiness): 792 ms (threshold: 4000 ms) — Pass

- TC-25 (score display): 289 ms (threshold: 3000 ms) — Pass

- TC-26 (internship filtering): 17 ms (threshold: 3000 ms) — Pass

- TC-27 (question-bank filtering): 33 ms (threshold: 3000 ms) — Pass

The completed and confirmed testing phase provides strong automated evidence for both Vitest behavior and Playwright browser performance. Before final project submission, the team should add:

1. Live MySQL integration tests

2. A dedicated exhaustive scoring-reliability suite

3. Coverage report generation using the configured coverage scripts

4. Additional browser-level system tests for end-to-end workflows

5. Explicit execution status for all tests excluded from `npm test`

---

# Appendix A: Vitest Execution Output

The following is the confirmed Vitest output from 18 November 2026.

```
 ✓ __tests__/request-admin-account.test.tsx (2 tests) 463ms
   ✓ RequestAdminAccountPage status workflow (2)
     ✓ shows the checked status and offers to resubmit rejected requests  335ms
     ✓ submits a super-admin account request with the selected role 126ms

 ✓ __tests__/admin-student-directory-view.test.tsx (3 tests) 509ms
   ✓ admin student directory (3)
     ✓ loads results and filters by contact, academics and selected skills  397ms
     ✓ shows server errors and supports clearing filters and empty results  48ms
     ✓ handles malformed responses and skill searches with no matches  61ms

 ✓ __tests__/student-dashboard-view.test.tsx (4 tests) 641ms
   ✓ student dashboard (4)
     ✓ shows profile completion, recent applications, deadlines, and skill chips  538ms
     ✓ shows an authentication alert for a missing or mismatched student session 29ms
     ✓ handles database failure and missing or mismatched student records 42ms
     ✓ uses incomplete-profile and empty-list states when optional data is absent 30ms

 ✓ __tests__/account-request-view.test.tsx (4 tests) 698ms
   ✓ AccountRequestsView (4)
     ✓ loads pending requests in the super-admin view  456ms
     ✓ sends the approve decision and refreshes the list 111ms
     ✓ sends the reject decision and refreshes the list 86ms
     ✓ shows a loading error and supports retry 43ms

 ✓ __tests__/recommended-videos.test.tsx (4 tests) 675ms
   ✓ recommended videos (4)
     ✓ constructs watch and thumbnail URLs from the validated YouTube ID 6ms
     ✓ shows all categories by default and filters to the selected category  494ms
     ✓ opens each video link safely in a new tab 78ms
     ✓ shows a text fallback when a YouTube thumbnail fails to load 95ms

 ✓ __tests__/assessments-view-flow.test.tsx (2 tests) 719ms
   ✓ student assessments workflow (2)
     ✓ loads a domain test, shows history, scores an attempt, and supports retake and back navigation  421ms
     ✓ shows empty domain results and server errors, including scoring and history failures 296ms

 ✓ __tests__/internships-view.test.tsx (5 tests) 798ms
   ✓ student internship directory (5)
     ✓ renders eligibility results, filters listings, and supports row navigation by mouse and keyboard  511ms
     ✓ renders incomplete profile and empty listing states 78ms
     ✓ renders the error profile label and retries a failed request 96ms
     ✓ shows server error text and filter empty state 93ms
     ✓ does not fetch student data for an administrative role 16ms

 ✓ __tests__/student-profile-view.test.tsx (4 tests) 843ms
   ✓ student profile view (4)
     ✓ edits profile fields, adds a skill and resume, then confirms saved prototype data  407ms
     ✓ shows field and skill validation errors without saving invalid values 162ms
     ✓ supports Enter-to-add, skill editing and removal, resume removal, and cancel reset 153ms
     ✓ reports invalid PDF uploads and oversize resume files 116ms

 ✓ __tests__/admin-internships.test.tsx (5 tests) 1285ms
   ✓ admin internship management UI (5)
     ✓ navigates to the detail page when an admin clicks a listing row  303ms
     ✓ does not create an internship with an empty description 282ms
     ✓ sends all new fields when creating an internship  303ms
     ✓ loads and saves edits from the admin detail view  302ms
     ✓ does not save a detail edit with a whitespace-only description 92ms

 ✓ __tests__/profile-role.test.tsx (7 tests) 532ms
   ✓ GET /api/profile (2)
     ✓ returns the authenticated student profile without exposing sensitive auth data 21ms
     ✓ returns only common profile fields for admin accounts 2ms
   ✓ PATCH /api/profile (2)
     ✓ rejects name and email edits for all accounts 9ms
     ✓ accepts valid student-specific updates and updates only the student profile fields 3ms
   ✓ ProfileView (3)
     ✓ renders the correct fields for student and admin accounts 172ms
     ✓ uploads a resume and updates its displayed filename 113ms
     ✓ lets an admin confirm account deletion and redirects to sign in 209ms

 ✓ __tests__/applications-frontend.test.tsx (16 tests) 1849ms
   ✓ student application views (4)
     ✓ renders application history and filters by status and search text  313ms
     ✓ shows empty and API error states 98ms
     ✓ uses fallback response data and supports deadline and oldest sorting 113ms
     ✓ falls back for a non-Error load failure and missing applications 70ms
   ✓ admin application review (6)
     ✓ filters applications and confirms a successful status update 161ms
     ✓ reports an unsuccessful update 78ms
     ✓ retries after an application load failure 59ms
     ✓ shows the unfiltered empty state and clears all selected filters 57ms
     ✓ rejects unconfirmed server updates and defaults missing error messages 71ms
     ✓ uses empty defaults for absent result collections and fallback for unknown load errors 81ms
   ✓ internship application detail (6)
     ✓ validates an uploaded resume, submits an application, and shows its status and resume 140ms
     ✓ shows ineligibility and duplicate application states 70ms
     ✓ shows an availability error, then exposes the closed application reason 52ms
     ✓ covers resume size, empty-file, optional-data and cancelled form states 123ms
     ✓ shows submit errors, handles missing confirmation fields, and catches network failures 246ms
     ✓ uses availability and submit fallbacks when the server omits error messages 113ms

 ✓ src/tests/placement-test-management/sprint2/tc18-history-ui.test.ts (3 tests) 66ms
   ✓ TC-18 attempt history UI (3)
     ✓ shows failed history loads as an accessible error with a retry control 22ms
     ✓ wires the retry control to the history reload callback 3ms
     ✓ keeps previously loaded attempts visible alongside a refresh error 38ms

 ✓ __tests__/account-management.test.ts (21 tests) 69ms
   ✓ Issue #9 — Admin account requests (11)
     ✓ creates a pending admin request 19ms
     ✓ creates a pending super-admin request 5ms
     ✓ rejects unsupported requested roles 3ms
     ✓ rejects invalid email 2ms
     ✓ rejects an existing user email 3ms
     ✓ lists pending requests for super-admin 3ms
     ✓ blocks students from listing admin requests 1ms
     ✓ returns the status of an admin request by normalized email 6ms
     ✓ validates status lookup email and returns not found for unknown requests 5ms
     ✓ resubmits only a rejected admin request by setting it back to pending 4ms
     ✓ does not resubmit requests that are not rejected 2ms
   ✓ Issue #10 — Account deletion (5)
     ✓ deletes the signed-in student's account and clears session 1ms
     ✓ deletes the signed-in admin's account and clears session 1ms
     ✓ deletes a super-admin account when at least two exist 2ms
     ✓ prevents deleting the last super-admin account 1ms
     ✓ rejects unauthenticated deletion 1ms
   ✓ Issue #11 — Super-admin approval (5)
     ✓ creates a super-admin account when its request is approved 2ms
     ✓ blocks a student from approving requests 1ms
     ✓ rejects an invalid request ID 1ms
     ✓ rejects a pending account request 2ms
     ✓ returns not found when a request was already processed 1ms

 ✓ src/tests/placement-test-management/sprint1/tc16-student-domain-selection.test.ts (11 tests) 47ms
   ✓ TC-16 — student selects a domain to see relevant tests (4)
     ✓ five placement domains are available for selection 5ms
     ✓ selecting WEB_DEVELOPMENT returns only WEB_DEVELOPMENT tests 1ms
     ✓ filters domain-specific tests from the server for an authenticated student 5ms
     ✓ rejects an invalid domain value 1ms
   ✓ TC-16 — only relevant (default or published) tests are presented (2)
     ✓ lists available tests for an authenticated student 1ms
     ✓ each test exposes four answer options per question 1ms
   ✓ TC-16 — student can answer questions and submit the test (5)
     ✓ renders the submit button when no questions are answered (student can submit anytime) 20ms
     ✓ renders the submit button when only some questions are answered 3ms
     ✓ renders the submit button when all questions are answered 3ms
     ✓ questions and options remain visible after submission 3ms
     ✓ does not reveal correct answers before the student submits 3ms

 ✓ __tests__/shared-setup.test.tsx (3 tests) 168ms
   ✓ shared testing environment (3)
     ✓ renders a React component with jsdom 160ms
     ✓ jsdom provides a window object 1ms
     ✓ Vitest matchers work correctly 2ms

 ✓ __tests__/register-page.test.tsx (1 test) 255ms
   ✓ RegisterPage (1)
     ✓ shows registration success and resets the form after the async response 252ms

 ✓ __tests__/role-pages.test.tsx (3 tests) 108ms
   ✓ shared role page dispatch (3)
     ✓ selects the student or administrative dashboard and internship views by role 78ms
     ✓ dispatches application, assessment and profile views for all roles 20ms
     ✓ does not render a student directory for students and renders it for admin roles 8ms

 ✓ __tests__/internship-detail-eligibility.test.tsx (1 test) 349ms
   ✓ InternshipDetail eligibility (1)
     ✓ shows employer-listed skills as informational and does not render skill eligibility controls  347ms

 ✓ __tests__/admin-dashboard.test.tsx (4 tests) 273ms
   ✓ administrative dashboard (4)
     ✓ loads database-backed dashboard data for admin 183ms
     ✓ loads database-backed dashboard data for super-admin 38ms
     ✓ redirects users whose session role does not match the dashboard route 3ms
     ✓ shows empty states when the database has no applications or eligible deadlines 41ms

 ✓ __tests__/recommended-video-api.test.ts (5 tests) 72ms
   ✓ recommended video APIs (5)
     ✓ lets a student read videos and rejects other roles from the student API 9ms
     ✓ requires authentication and blocks students from video management APIs 35ms
     ✓ lets admin create, edit, and delete videos 16ms
     ✓ lets super-admin create, edit, and delete videos 7ms
     ✓ rejects invalid YouTube URLs before writing 2ms

 ✓ __tests__/role-route-bindings.test.tsx (14 tests) 129ms
   ✓ role route bindings (14)
     ✓ binds student dashboard to its canonical role 54ms
     ✓ binds student internships to its canonical role 8ms
     ✓ binds student applications to its canonical role 14ms
     ✓ binds student profile to its canonical role 6ms
     ✓ binds admin dashboard to its canonical role 8ms
     ✓ binds admin internships to its canonical role 5ms
     ✓ binds admin applications to its canonical role 6ms
     ✓ binds admin profile to its canonical role 3ms
     ✓ binds admin student directory to its canonical role 5ms
     ✓ binds super-admin dashboard to its canonical role 4ms
     ✓ binds super-admin internships to its canonical role 4ms
     ✓ binds super-admin applications to its canonical role 3ms
     ✓ binds super-admin profile to its canonical role 3ms
     ✓ binds super-admin student directory to its canonical role 3ms

 ✓ __tests__/internships-eligibility.test.ts (3 tests) 33ms
   ✓ GET /api/internships (3)
     ✓ uses the authenticated student ID and returns only eligibility-safe profile fields 16ms
     ✓ rejects a failed profile/listing request with a useful error 14ms
     ✓ does not allow a client to select another student's identity 2ms

 ✓ src/modules/applications/eligibility_test.ts (19 tests) 46ms
   ✓ application eligibility (19)
     ✓ reports availability as open before the deadline 11ms
     ✓ reports availability as open at the deadline boundary 0ms
     ✓ reports availability as closed after the deadline 0ms
     ✓ reports availability as closed for invalid deadlines 0ms
     ✓ accepts a valid timestamp deadline string 0ms
     ✓ accepts an eligible student using branch and CGPA 22ms
     ✓ reports CGPA below the minimum 0ms
     ✓ reports an ineligible branch 0ms
     ✓ accepts any branch when the internship allows all branches 1ms
     ✓ does not use student or employer skills as eligibility criteria 1ms
     ✓ returns CGPA, branch, and deadline results for the eligibility UI 1ms
     ✓ does not treat missing profile fields as eligible 1ms
     ✓ treats a genuinely missing profile as undetermined 1ms
     ✓ uses each internship's own CGPA requirement without checking skills 1ms
     ✓ reports an expired deadline 0ms
     ✓ collects multiple simultaneous failures 0ms
     ✓ reports invalid student and minimum CGPA values and an invalid deadline 0ms
     ✓ treats the exact deadline instant as eligible 0ms
     ✓ rejects an impossible date-only deadline and an invalid current time 1ms

 ✓ __tests__/student-directory-search.test.ts (14 tests) 35ms
   ✓ filterStudents (14)
     ✓ builds skill filter options from student-entered skills, not a fixed catalog 24ms
     ✓ deduplicates skill options case-insensitively and ignores blanks 1ms
     ✓ searches skill options case-insensitively and limits the rendered matches 1ms
     ✓ matches a name substring case-insensitively 0ms
     ✓ returns an empty list for a name miss 0ms
     ✓ matches an email substring 1ms
     ✓ matches branch exactly 0ms
     ✓ uses inclusive CGPA bounds 0ms
     ✓ requires every selected skill with case-insensitive comparison 1ms
     ✓ combines name, branch, CGPA, year, and skills as AND filters 0ms
     ✓ returns every record in a new array when criteria are empty 1ms
     ✓ returns an empty list for an impossible filter combination 0ms
     ✓ does not mutate the source list or student records 1ms
     ✓ treats a missing skills list as having no skills 0ms

 ✓ __tests__/recommended-video-validation.test.ts (12 tests) 20ms
   ✓ recommended video input validation (12)
     ✓ extracts a video ID from BgLTDT03QtU 3ms
     ✓ extracts a video ID from https://www.youtube.com/watch?v=KLlXCFG5TnA 2ms
     ✓ extracts a video ID from https://youtu.be/WTzjTskDFMg 1ms
     ✓ extracts a video ID from https://youtube.com/shorts/AmdcTuEJ5o4 1ms
     ✓ extracts a video ID from https://www.youtube.com/embed/iifXCRd3FyA 1ms
     ✓ rejects untrusted or malformed URL https://example.com/watch?v=BgLTDT03QtU 1ms
     ✓ rejects untrusted or malformed URL http://youtube.com/watch?v=BgLTDT03QtU 1ms
     ✓ rejects untrusted or malformed URL https://youtube.com.evil.example/watch?v=BgLTDT03QtU 1ms
     ✓ rejects untrusted or malformed URL https://youtube.com/watch?v=too-short 1ms
     ✓ rejects untrusted or malformed URL javascript:alert(1) 1ms
     ✓ validates the complete management payload and returns a normalized video ID 3ms
     ✓ rejects invalid categories and invalid YouTube inputs 2ms

 ✓ __tests__/internship-management.test.ts (6 tests) 26ms
   ✓ internship management service (6)
     ✓ creates an unpublished draft with application status explicitly closed 10ms
     ✓ persists publication and accepting-application flags independently on edit 3ms
     ✓ protects applications by refusing to delete an internship they reference 3ms
     ✓ lists and serializes internships with newline-separated list fields 4ms
     ✓ returns a serialized record or null from admin lookup 1ms
     ✓ deletes only unused internships and recognizes only Prisma missing-row errors 2ms

 ✓ __tests__/application-module.test.ts (7 tests) 39ms
   ✓ application service (7)
     ✓ distinguishes missing internships, missing students, and available contexts 8ms
     ✓ lists published internships for valid students and returns missing-account states 5ms
     ✓ formats a student's applications across expired, closed, today, soon, and open deadlines 5ms
     ✓ creates eligible applications and handles each precondition and resume validation result 5ms
     ✓ removes a stored resume if application creation fails and propagates database errors 5ms
     ✓ filters and maps administrative applications without exposing storage keys 3ms
     ✓ recognizes Prisma uniqueness and missing-row errors and forwards status/resume queries 3ms

 ✓ __tests__/student-profile-update.test.ts (20 tests) 21ms
   ✓ updateStudentProfile (20)
     ✓ accepts a valid personal, academic, and skills update 7ms
     ✓ rejects an empty name without changing the saved record 1ms
     ✓ rejects invalid email not-an-email 1ms
     ✓ rejects invalid email missing-domain@ 1ms
     ✓ rejects invalid email @university.edu 1ms
     ✓ rejects a duplicate email without case sensitivity 1ms
     ✓ allows keeping the student's own email with whitespace and casing 0ms
     ✓ rejects invalid CGPA -0.1 0ms
     ✓ rejects invalid CGPA 10.1 1ms
     ✓ rejects invalid CGPA NaN 1ms
     ✓ rejects invalid CGPA Infinity 0ms
     ✓ rejects invalid academic year 0 0ms
     ✓ rejects invalid academic year 5 0ms
     ✓ rejects invalid academic year 1.5 0ms
     ✓ rejects a blank branch 0ms
     ✓ adds, edits, and removes skills from a draft list 1ms
     ✓ rejects blank or duplicate skills and leaves the saved list unchanged 1ms
     ✓ applies multiple valid changes atomically 1ms
     ✓ rejects a multi-field update atomically and returns field errors 1ms
     ✓ validates optional PDF resume type and size 1ms

 ✓ __tests__/internship-service.test.ts (3 tests) 21ms
   ✓ listStudentInternshipEligibility (3)
     ✓ queries only published internships and includes published closed listings 14ms
     ✓ returns undetermined eligibility when the authenticated student has no saved profile 1ms
     ✓ creates an application when skills do not match employer-listed skills 3ms

 ✓ __tests__/internship-validation.test.ts (12 tests) 20ms
   ✓ parseInternshipInput location and compensation (4)
     ✓ clears location for remote internships 5ms
     ✓ requires a location for hybrid and on-site internships 1ms
     ✓ rejects negative stipends and unsupported work types 1ms
     ✓ rejects missing or whitespace-only descriptions 1ms
   ✓ parseInternshipInput validation edges (8)
     ✓ rejects a non-object payload: null 1ms
     ✓ rejects a non-object payload: %j 0ms
     ✓ rejects a non-object payload: "not an object" 0ms
     ✓ trims required text fields and enforces their maximum lengths 1ms
     ✓ rejects non-finite and out-of-range stipend and CGPA values while accepting numeric strings 2ms
     ✓ validates on-site locations, descriptions, and calendar deadlines 1ms
     ✓ normalizes list values and rejects missing, oversized, or wrongly typed lists 2ms
     ✓ requires explicit boolean publication flags 1ms

 ✓ __tests__/auth-me.test.ts (3 tests) 21ms
   ✓ GET /api/auth/me (3)
     ✓ returns the database-backed identity for a valid cookie session 15ms
     ✓ rejects and clears a missing or invalid session 2ms
     ✓ clears a session whose user no longer exists 1ms

 ✓ __tests__/admin-student-directory.test.ts (2 tests) 22ms
   ✓ GET /api/admin/students (2)
     ✓ returns student directory records for admin roles without exposing sensitive fields 17ms
     ✓ rejects non-admin access 2ms

 ✓ __tests__/recommended-video-service.test.ts (3 tests) 18ms
   ✓ recommended video persistence service (3)
     ✓ loads saved records and derives trusted watch and thumbnail URLs 10ms
     ✓ creates and updates database records with the stored domain enum 4ms
     ✓ deletes the persisted record by ID 2ms

 ✓ __tests__/profile-resume.test.ts (8 tests) 85ms
   ✓ profile resume API (8)
     ✓ requires a signed-in student to upload a resume 13ms
     ✓ saves validated PDF bytes and a sanitized filename for the session student 38ms
     ✓ rejects a non-PDF extension without changing the saved resume 5ms
     ✓ rejects invalid PDF contents without changing the saved resume 5ms
     ✓ rejects an empty file without changing the saved resume 3ms
     ✓ rejects an oversized file without changing the saved resume 14ms
     ✓ downloads only the signed-in student's resume as a private attachment 4ms
     ✓ does not allow administrator access to profile resumes 1ms

 ✓ __tests__/application-api.test.ts (7 tests) 104ms
   ✓ student application APIs (3)
     ✓ protects the student application list and reports service failures 24ms
     ✓ checks application availability for authentication, account, publication, and eligibility states 22ms
     ✓ submits applications with optional resumes and maps validation, eligibility, duplicate, and error results 31ms
   ✓ administrative application APIs (2)
     ✓ authorizes application listing, validates filters, and maps lookup/database errors 6ms
     ✓ validates application status updates and handles missing records and database failures 8ms
   ✓ application resume APIs (2)
     ✓ restricts administrative resume access and returns private PDF responses 4ms
     ✓ enforces student resume ownership while allowing administrative access 4ms

 ✓ src/tests/placement-test-management/sprint1/tc17-scoring-display.test.ts (17 tests) 58ms
   ✓ TC-17 — correct score calculation (4)
     ✓ calculates correct score for a fully answered test (1 correct, 1 wrong) 10ms
     ✓ calculates correct score for a partially answered test 1ms
     ✓ returns score of zero when no questions are answered 1ms
     ✓ scores correctly when all questions are answered correctly 1ms
   ✓ TC-17 — correct percentage calculation (4)
     ✓ calculates 50% for one correct answer out of two 1ms
     ✓ calculates 100% when all questions are answered correctly 1ms
     ✓ calculates 0% when no questions are answered 1ms
     ✓ handles a zero-question test safely without division by zero 0ms
   ✓ TC-17 — handling known correct and incorrect answers (3)
     ✓ marks unanswered questions as incorrect with studentAnswer: null 1ms
     ✓ scores from the database — never trusts a client-supplied answer as correct 1ms
     ✓ question results contain only questions belonging to the selected test 2ms
   ✓ TC-17 — score and percentage displayed immediately after submission (6)
     ✓ shows the score summary in 'You scored X / Y (Z%)' format 19ms
     ✓ hides the submit button after submission 4ms
     ✓ indicates which answers were correct after submission 3ms
     ✓ reveals correct answers for every question after submission 2ms
     ✓ labels unanswered questions as 'Not answered' and still reveals the correct answer 3ms
     ✓ prevents duplicate submissions by showing 'Scoring…' and disabling the button 3ms

 ✓ src/tests/placement-test-management/sprint2/tc18-attempt-history.test.ts (24 tests) 62ms
   ✓ TC-18 — a submitted attempt is persisted (9)
     ✓ creates a TestAttempt row after successful scoring 9ms
     ✓ returns the persisted attempt ID on success 1ms
     ✓ does not score or persist when the authenticated student email is missing 1ms
     ✓ stores the correct score in the persisted attempt 1ms
     ✓ stores the correct percentage in the persisted attempt 1ms
     ✓ stores question-wise results (answers JSON) in the persisted attempt 3ms
     ✓ stores unanswered questions with studentAnswer: null 1ms
     ✓ uses the student email from the verified session — never from client input 1ms
     ✓ handles persistence failure safely and returns an error 28ms
   ✓ TC-18 — a retake creates a new separate attempt (2)
     ✓ calls testAttempt.create twice for two submissions 1ms
     ✓ each attempt stores its own score independently 1ms
   ✓ TC-18 — getAttemptHistory returns the student's own attempts (9)
     ✓ returns an empty list when the student has no attempts 1ms
     ✓ returns the correct attempt data including timestamp 2ms
     ✓ returns question-wise results from the attempt 1ms
     ✓ queries the database using the session email — not a client-supplied ID 1ms
     ✓ a student cannot retrieve another student's history by changing the request 1ms
     ✓ rejects non-student role from accessing history 1ms
     ✓ rejects an invalid (non-positive) test ID 0ms
     ✓ returns an error when the test is not accessible to students 0ms
     ✓ handles database errors safely 2ms
   ✓ TC-18 — existing scoring functionality is preserved (4)
     ✓ still calculates scores correctly after adding persistence 1ms
     ✓ still handles zero-question tests without division by zero 1ms
     ✓ still rejects invalid test ID 0ms
     ✓ still rejects non-student role 0ms

 ✓ __tests__/server-auth.test.ts (5 tests) 26ms
   ✓ role session creation and configuration (2)
     ✓ recognizes a usable current or legacy secret and rejects placeholders 4ms
     ✓ creates and clears secure production role cookies and rejects missing secrets 11ms
   ✓ server role session readers (3)
     ✓ prefers a verified server session and resolves its current email 3ms
     ✓ accepts correctly signed legacy sessions with dotted emails 2ms
     ✓ rejects empty, malformed, unsupported, expired, and incorrectly signed legacy sessions 2ms

 ✓ __tests__/authentication-backend.test.ts (5 tests) 1194ms
   ✓ password hash and account authentication (3)
     ✓ verifies current hashes and rejects absent, malformed, truncated, and incorrect hashes  366ms
     ✓ normalizes lookup email and maps supported database roles 211ms
     ✓ rejects unknown accounts, accounts without hashes, incorrect passwords and unsupported roles 296ms
   ✓ login handler request and failure paths (2)
     ✓ rejects malformed JSON, non-object bodies, invalid credentials and oversized values 25ms
     ✓ returns role-aware success and a generic 503 for lookup or session failures 291ms

 ✓ __tests__/admin-internship-api.test.ts (6 tests) 59ms
   ✓ admin internship API authorization and collection operations (3)
     ✓ requires an admin for listing and creation 12ms
     ✓ lists internships with private caching and reports service errors 7ms
     ✓ validates create requests and handles successful and failed persistence 23ms
   ✓ admin internship record operations (3)
     ✓ authorizes, returns missing records, and handles lookup failures 4ms
     ✓ validates patches, returns successful updates, and distinguishes missing rows from failures 7ms
     ✓ handles delete authorization, conflict, success, missing record, and unexpected failure 4ms

 ✓ __tests__/auth-actions.test.ts (2 tests) 13ms
   ✓ legacy demo sign-in actions (2)
     ✓ validates credentials, authentication configuration, and account lookup 7ms
     ✓ creates a role session for valid demo credentials and forwards session helpers 3ms

 ✓ __tests__/student-resume-file.test.ts (2 tests) 10ms
   ✓ student resume validation (2)
     ✓ rejects empty, oversized, non-PDF and malformed PDF uploads 4ms
     ✓ accepts valid PDF bytes and sanitizes the stored filename 3ms

 ✓ src/modules/applications/application-validation_test.ts (4 tests) 11ms
   ✓ application request validation (4)
     ✓ accepts positive safe integer IDs and rejects malformed or unsafe IDs 3ms
     ✓ accepts canonical application statuses and rejects unknown values 1ms
     ✓ trims admin filters and uses an empty status when none is requested 3ms
     ✓ rejects invalid statuses and student-name searches longer than 100 characters 1ms

 ✓ src/tests/placement-test-management/sprint1/tc14-admin-crud.test.ts (17 tests) 28ms
   ✓ TC-14 — creating questions with domain and difficulty tags (4)
     ✓ creates a question when all required fields are valid 5ms
     ✓ stores domain and difficulty tags on the created question 5ms
     ✓ rejects a question with an empty prompt 1ms
     ✓ rejects a question with duplicate answer options 1ms
   ✓ TC-14 — updating existing questions (2)
     ✓ updates a question when there is no domain conflict 1ms
     ✓ blocks a domain change when the question belongs to a test of a different domain 1ms
   ✓ TC-14 — deleting questions (2)
     ✓ deletes a question by valid id 0ms
     ✓ rejects deletion with an invalid id 0ms
   ✓ TC-14 — creating grouped placement tests (3)
     ✓ creates a placement test tagged with domain and difficulty 2ms
     ✓ rejects a test with an empty question list 0ms
     ✓ rejects questions whose domain or difficulty does not match the test 0ms
   ✓ TC-14 — updating grouped placement tests (4)
     ✓ updates a custom test when input is valid 2ms
     ✓ replaces question assignments when a test is updated 1ms
     ✓ publishes a custom draft test 1ms
     ✓ unpublishes a custom published test 0ms
   ✓ TC-14 — deleting grouped placement tests (2)
     ✓ deletes a custom (non-default) test 2ms
     ✓ prevents deletion of default tests 1ms

 ✓ __tests__/demo-auth-accounts.test.ts (4 tests) 7ms
   ✓ demo credential lookup (4)
     ✓ normalizes email and returns the configured  STUDENT@gmail.com  role 3ms
     ✓ normalizes email and returns the configured ADMIN@gmail.com role 1ms
     ✓ normalizes email and returns the configured superadmin@gmail.com role 0ms
     ✓ rejects unknown addresses and incorrect passwords 1ms

 ✓ __tests__/profile-response.test.ts (2 tests) 8ms
   ✓ student profile response projection (2)
     ✓ returns common student fields with only valid string skills 4ms
     ✓ returns null without a student profile and an empty list for non-array skills 1ms

 ✓ __tests__/private-resume-storage.test.ts (3 tests) 54ms
   ✓ private resume storage validation (3)
     ✓ validates non-empty PDF type, extension, size, and file signature 32ms
     ✓ stores and reads valid bytes, and rejects invalid content or storage keys 18ms
     ✓ treats deleting an already missing valid key as harmless 2ms

 ✓ src/modules/applications/application-access_test.ts (2 tests) 7ms
   ✓ application resume ownership filter (2)
     ✓ restricts students to their own application 4ms
     ✓ allows administrators to review resumes across students 1ms

 ✓ __tests__/transport-security.test.ts (5 tests) 11ms
   ✓ transport security configuration (5)
     ✓ sets HSTS in production 4ms
     ✓ does not set HSTS outside production 1ms
     ✓ registers the HSTS header in Next.js production configuration 2ms
     ✓ requires MariaDB TLS with certificate verification in production 0ms
     ✓ leaves the local MariaDB connection configuration unchanged 0ms

 ✓ src/tests/placement-test-management/sprint1/tc15-filtering-access.test.ts (19 tests) 28ms
   ✓ TC-15 — admin filters questions by domain and difficulty (5)
     ✓ filters questions to only those matching the selected domain 4ms
     ✓ filters questions to only those matching the selected difficulty 1ms
     ✓ filters questions by both domain and difficulty together 1ms
     ✓ returns all questions when no filter is applied 2ms
     ✓ searches question text and options case-insensitively 1ms
   ✓ TC-15 — admin filters placement tests by domain and difficulty (3)
     ✓ filters tests by domain 1ms
     ✓ filters tests by difficulty 0ms
     ✓ filters tests by both domain and difficulty 1ms
   ✓ TC-15 — valid domain and difficulty values are enforced (4)
     ✓ recognises all five placement domains as valid 1ms
     ✓ rejects unknown domain values 1ms
     ✓ recognises all three difficulty levels as valid 0ms
     ✓ rejects unknown difficulty values 0ms
   ✓ TC-15 — only admins can manage the question bank (3)
     ✓ allows admin role to access the question bank 1ms
     ✓ rejects student role from managing the question bank 1ms
     ✓ listQuestionBank accepts an optional domain filter 4ms
   ✓ TC-15 — students can only view assigned/selected tests (not manage) (4)
     ✓ allows authenticated students to list available tests 1ms
     ✓ students only see default or published tests — not all tests 1ms
     ✓ rejects admin role from the student-facing test list endpoint 0ms
     ✓ never exposes correct answers to students before submission 1ms

 ✓ __tests__/registration.test.ts (6 tests) 39ms
   ✓ POST /api/auth/register (6)
     ✓ creates a student account 20ms
     ✓ rejects an invalid email 5ms
     ✓ rejects a short password 3ms
     ✓ rejects duplicate emails 3ms
     ✓ rejects invalid academic years 3ms
     ✓ rejects invalid CGPA 2ms

 ✓ __tests__/server-session.test.ts (8 tests) 26ms
   ✓ verified server sessions (5)
     ✓ rejects a missing or malformed cookie 5ms
     ✓ rejects a missing, weak, or mismatched signing secret and bad signatures 3ms
     ✓ rejects invalid payload shapes, identities, roles, and expired sessions 3ms
     ✓ checks the current database role and handles missing users and lookup failures 7ms
     ✓ rejects malformed signed payload JSON 1ms
   ✓ legacy server sessions (3)
     ✓ accepts a valid legacy cookie only after checking its signature and current account role 2ms
     ✓ rejects legacy cookies with invalid configuration, format, role, expiry, signature, or account 2ms
     ✓ ignores legacy cookies when the legacy secret is absent or a placeholder 1ms

 Test Files  52 passed (52)
      Tests  372 passed (372)
   Start at  20:47:12
   Duration  17.58s (transform 6.14s, setup 0ms, collect 34.21s, tests 12.70s, environment 102.17s, prepare 17.83s)
```

**Note:** Some tests intentionally log error messages to stderr as part of testing error-handling paths. These are expected and do not indicate failures. All 372 tests passed.

---

# Appendix B: Playwright Execution Output

The following is the confirmed Playwright output from 18 November 2026.

```
Running 4 tests using 1 worker

…rmance.spec.ts:28:1 › TC-24: student dashboard becomes interactive within 4 seconds
TC-24 Dashboard: 792 ms (0.792 s)

…ce.spec.ts:45:1 › TC-25: practice-test score and percentage appear within 3 seconds
TC-25 Score calculation: 289 ms (0.289 s)

…ient-side internship filtering updates within 3 seconds (initial API load excluded)
TC-26 Internship filtering: 17 ms (0.017 s)

…spec.ts:135:1 › TC-27: client-side question-bank filtering updates within 3 seconds
TC-27 Question-bank filtering: 33 ms (0.033 s)

  4 passed (25.5s)

To open last HTML report run:
  npx playwright show-report
```

All four Playwright browser-based performance tests passed with measured timings well below their respective thresholds.

---

# Appendix C: Complete Test File Inventory

## Vitest — Included Files (52 files, 372 tests)

### Placement Test Management (6 files, 91 tests)

| # | File path | Tests |
|---|---|---|
| 1 | `src/tests/placement-test-management/sprint1/tc14-admin-crud.test.ts` | 17 |
| 2 | `src/tests/placement-test-management/sprint1/tc15-filtering-access.test.ts` | 19 |
| 3 | `src/tests/placement-test-management/sprint1/tc16-student-domain-selection.test.ts` | 11 |
| 4 | `src/tests/placement-test-management/sprint1/tc17-scoring-display.test.ts` | 17 |
| 5 | `src/tests/placement-test-management/sprint2/tc18-attempt-history.test.ts` | 24 |
| 6 | `src/tests/placement-test-management/sprint2/tc18-history-ui.test.ts` | 3 |

### Account and Authentication (12 files, 66 tests)

| # | File path | Tests |
|---|---|---|
| 7 | `__tests__/account-management.test.ts` | 21 |
| 8 | `__tests__/account-request-view.test.tsx` | 4 |
| 9 | `__tests__/auth-actions.test.ts` | 2 |
| 10 | `__tests__/auth-me.test.ts` | 3 |
| 11 | `__tests__/authentication-backend.test.ts` | 5 |
| 12 | `__tests__/demo-auth-accounts.test.ts` | 4 |
| 13 | `__tests__/register-page.test.tsx` | 1 |
| 14 | `__tests__/registration.test.ts` | 6 |
| 15 | `__tests__/request-admin-account.test.tsx` | 2 |
| 16 | `__tests__/server-auth.test.ts` | 5 |
| 17 | `__tests__/server-session.test.ts` | 8 |
| 18 | `__tests__/transport-security.test.ts` | 5 |

### Internship (8 files, 41 tests)

| # | File path | Tests |
|---|---|---|
| 19 | `__tests__/admin-internship-api.test.ts` | 6 |
| 20 | `__tests__/admin-internships.test.tsx` | 5 |
| 21 | `__tests__/internship-detail-eligibility.test.tsx` | 1 |
| 22 | `__tests__/internship-management.test.ts` | 6 |
| 23 | `__tests__/internship-service.test.ts` | 3 |
| 24 | `__tests__/internship-validation.test.ts` | 12 |
| 25 | `__tests__/internships-eligibility.test.ts` | 3 |
| 26 | `__tests__/internships-view.test.tsx` | 5 |

### Profile and Student Directory (10 files, 65 tests)

| # | File path | Tests |
|---|---|---|
| 27 | `__tests__/admin-student-directory-view.test.tsx` | 3 |
| 28 | `__tests__/admin-student-directory.test.ts` | 2 |
| 29 | `__tests__/private-resume-storage.test.ts` | 3 |
| 30 | `__tests__/profile-response.test.ts` | 2 |
| 31 | `__tests__/profile-resume.test.ts` | 8 |
| 32 | `__tests__/profile-role.test.tsx` | 7 |
| 33 | `__tests__/student-directory-search.test.ts` | 14 |
| 34 | `__tests__/student-profile-update.test.ts` | 20 |
| 35 | `__tests__/student-profile-view.test.tsx` | 4 |
| 36 | `__tests__/student-resume-file.test.ts` | 2 |

### Dashboard (3 files, 11 tests)

| # | File path | Tests |
|---|---|---|
| 37 | `__tests__/admin-dashboard.test.tsx` | 4 |
| 38 | `__tests__/shared-setup.test.tsx` | 3 |
| 39 | `__tests__/student-dashboard-view.test.tsx` | 4 |

### Recommended Videos (4 files, 24 tests)

| # | File path | Tests |
|---|---|---|
| 40 | `__tests__/recommended-video-api.test.ts` | 5 |
| 41 | `__tests__/recommended-video-service.test.ts` | 3 |
| 42 | `__tests__/recommended-video-validation.test.ts` | 12 |
| 43 | `__tests__/recommended-videos.test.tsx` | 4 |

### Applications (6 files, 55 tests)

| # | File path | Tests |
|---|---|---|
| 44 | `__tests__/application-api.test.ts` | 7 |
| 45 | `__tests__/application-module.test.ts` | 7 |
| 46 | `__tests__/applications-frontend.test.tsx` | 16 |
| 47 | `src/modules/applications/eligibility_test.ts` | 19 |
| 48 | `src/modules/applications/application-validation_test.ts` | 4 |
| 49 | `src/modules/applications/application-access_test.ts` | 2 |

### Role Routing (2 files, 17 tests)

| # | File path | Tests |
|---|---|---|
| 50 | `__tests__/role-pages.test.tsx` | 3 |
| 51 | `__tests__/role-route-bindings.test.tsx` | 14 |

### Assessments View (1 file, 2 tests)

| # | File path | Tests |
|---|---|---|
| 52 | `__tests__/assessments-view-flow.test.tsx` | 2 |

## Playwright — Included Files (1 file, 4 tests)

| # | File path | Tests |
|---|---|---|
| 1 | `tests/performance.spec.ts` | 4 |

## Vitest — Excluded Files (not included by default configuration)

| File path | Reason |
|---|---|
| `src/tests/placement-test-management/additional/original-admin-question-bank.test.ts` | Not matched by include patterns |
| `src/tests/placement-test-management/additional/original-assessments-view.test.ts` | Not matched by include patterns |
| `src/tests/placement-test-management/additional/original-assessment-options.test.ts` | Not matched by include patterns |
| `src/tests/placement-test-management/additional/original-actions-student.test.ts` | Not matched by include patterns |
| `src/tests/placement-test-management/additional/original-page-admin.test.ts` | Not matched by include patterns |
| `src/tests/placement-test-management/additional/original-actions-admin.test.ts` | Not matched by include patterns |
| `src/app/admin/assessments/actions.test.ts` | Not matched by include patterns |
| `src/app/admin/assessments/page.test.ts` | Not matched by include patterns |
| `src/app/student/assessments/actions.test.ts` | Not matched by include patterns |
| `src/components/admin-question-bank.test.ts` | Not matched by include patterns |
| `src/components/assessments-view.test.ts` | Not matched by include patterns |
| `src/lib/assessment-options.test.ts` | Not matched by include patterns |

---

*End of report.*
