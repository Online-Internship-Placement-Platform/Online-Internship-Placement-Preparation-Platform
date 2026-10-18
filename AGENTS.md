<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:nextjs-agent-feedback -->

## Report Next.js feedback

The project owner enabled `experimental.agentFeedback`, authorizing this feedback pass. When enabled, `next dev` writes this block and restores it if removed. Commit `AGENTS.md` with your work to keep the tree clean.

During the current user request, retain anonymized facts as feedback candidates for meaningful or recurring Next.js issues:

- Crashes, hangs, OOMs, or unexpected slowness
- Incorrect behavior, output, errors, or diagnostics
- Missing, unclear, or conflicting documentation
- Unexpected CLI, codemod, Skill, or upgrade behavior and non-obvious workarounds

Continue the current user request without reporting immediately. Routine debugging is not feedback. Verify changes before retaining them as feedback candidates. Never retain code, logs, paths, URLs, secrets, personal information, or project-specific data.

Retain qualifying friction even if it is later fixed or worked around; record the final outcome during the reporting pass.

Before the final response, run one reporting pass. If candidates remain, from this file's directory run `npx --no-install next internal agent-feedback-instructions` once without piping or truncating its output. Follow its output or error guidance. If a network sandbox blocks it, retry with network access; if it still returns no output, continue normally.

<!-- END:nextjs-agent-feedback -->

# InPlace Development Guide

InPlace is a college internship and placement management platform. It is a frontend-first prototype with three roles: **Student**, **Admin**, and **Super Admin**. The application uses Next.js App Router, React, TypeScript, and Tailwind CSS.

This guide is for Cursor and other coding agents working on future features, bug fixes, and extensions. Follow the existing implementation instead of redesigning the application or inventing a parallel architecture.

## Before Changing Code

1. Read the relevant route, shared component, type, data, and utility files.
2. Trace the feature from its route wrapper through shared components and data/state dependencies.
3. Check whether the component is used by another role or route.
4. Identify the smallest change that solves the request.
5. Preserve unrelated behavior and files.
6. After implementation, inspect the affected routes and run the narrowest relevant checks.

Keep `docs/` and `README.md` unchanged. Do not remove or rewrite working files, routes, dependencies, or project configuration without a clear reason.

## Repository Rules

- Never modify or delete anything inside `docs/`.
- Never modify `README.md`.
- Preserve this guide's existing Next.js-generated instruction blocks when updating `AGENTS.md`.
- Avoid unrelated changes outside the requested scope.
- Prefer targeted edits over wholesale replacement of configuration.
- Do not add a backend unless the user explicitly requests it.

## Architecture and Routes

Route files under `src/app` are intentionally thin wrappers around shared page implementations in `src/components`. Keep route files simple when a shared component already provides the page. Pass role props explicitly and use only these canonical role values:

- `student`
- `admin`
- `super-admin`

Do not hardcode a role inside a shared component when it should come from its parent. When changing a shared component, check every route that imports it.

The verified role-specific route structure is:

### Student

- `/student/dashboard`
- `/student/internships`
- `/student/applications`
- `/student/assessments`

### Admin

- `/admin/dashboard`
- `/admin/internships`
- `/admin/applications`
- `/admin/assessments`

### Super Admin

- `/super-admin/dashboard`
- `/super-admin/internships`
- `/super-admin/applications`
- `/super-admin/assessments`

### Authentication

- `/login`
- `/` is the application entry route and is intended to redirect users to `/login`; verify the current root implementation before changing it.

Avoid introducing duplicate or obsolete generic routes when a role-specific route already exists.

## Shared Components and Data

Shared views currently cover the main dashboard, internship browsing/management, applications, assessments, and role-specific administrative views. Reuse existing components, types, mock records, icons, and styling conventions before creating new versions.

The current application is frontend-first and uses static mock data and component/browser state rather than a persistent backend. Treat that as prototype behavior:

- Reuse existing data structures and TypeScript types.
- Do not create conflicting copies of internship, application, assessment, or role models.
- Preserve existing interactions and clearly handle empty, loading, error, and success states.
- Do not claim that a mutation persists after refresh unless persistence is actually implemented.
- Keep UI components reasonably independent from eventual data-fetching code.
- Do not invent API endpoints or assume a backend exists.
- When preparing for backend integration, identify which mock-data and state logic will later be replaced by service/API calls.

## Coding Standards

- Use TypeScript with accurate types; avoid `any` unless genuinely necessary.
- Follow the existing Next.js App Router conventions.
- Use client components only when state, event handlers, effects, or browser APIs require them.
- Reuse installed dependencies and existing utilities; avoid unnecessary packages and abstractions.
- Keep components readable. Extract reusable logic when it improves clarity.
- Use semantic HTML and accessible controls with labels, keyboard support, and appropriate ARIA attributes.
- Make interactive controls functional. Do not add placeholder buttons, fake success messages, or controls that do nothing.
- Validate required form fields and provide useful feedback.
- Preserve responsive behavior across student, admin, and super-admin pages.

## UI and Design Consistency

InPlace uses a minimal, professional, light-theme SaaS design. Unless a redesign is explicitly requested:

- Reuse the existing colors, typography, spacing, borders, cards, tables, buttons, badges, and responsive layout patterns.
- Maintain visual consistency between all three roles.
- Avoid introducing dark mode, a new theme, unrelated visual changes, or a completely new design system.
- Check shared layout changes at every affected route and viewport.

## Role Responsibilities

These describe the intended product responsibilities, not a claim that every workflow is fully implemented.

### Student

Students should be able to manage profile and academic information, browse internships, check eligibility, apply, track application status, take assessments, and view results and progress.

### Admin

Admins should be able to view and filter student information, create and manage internship listings, review applications and update statuses, and manage assessments and questions.

### Super Admin

Super Admins should have administrative management access, review admin account requests, approve or reject requests, and preserve the rule that at least one Super Admin remains.

When extending an unfinished responsibility, distinguish the requested implementation from existing prototype behavior in the final report.

## Authentication and Security

The current login flow is prototype authentication. It uses frontend logic, `sessionStorage`, and mock credentials/roles rather than production-grade identity or server-side authorization. Keep role values consistent across login, session storage, TypeScript types, and routes. Preserve the current logout behavior unless a change is requested.

Frontend role checks are not sufficient authorization. When real authentication is introduced, add server-side authorization and backend validation rather than relying on client state. Never expose secrets, API keys, passwords, or sensitive configuration in client-side code.

## Required Workflow for Every Task

1. Understand the requested feature or bug.
2. Inspect the relevant implementation before editing.
3. Trace related routes, shared components, types, and state dependencies.
4. Choose the smallest appropriate change.
5. Implement it using the established architecture and visual language.
6. Check all roles/routes affected by shared functionality.
7. Run relevant lint, type-check, build, and browser checks when available.
8. Fix regressions introduced by the change.
9. Report changed files, behavior implemented, checks actually run, and remaining limitations.

For larger tasks, provide a brief implementation plan before extensive edits. Report test results honestly; never claim a command passed if it was not run.

## Validation Commands

The project currently exposes these package scripts:

```bash
npm lint
npm build
npm dev
```

Use the narrowest relevant check first, then broaden validation when the change warrants it. For user-visible changes, verify the affected route in the browser and inspect responsive behavior. Do not modify application code, routes, styling, dependencies, mock data, `docs/`, or `README.md` for a documentation-only request.

