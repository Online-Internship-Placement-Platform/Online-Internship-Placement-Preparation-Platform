# InPlace — Cursor AI Project Handoff

## 1. Project overview

InPlace is a frontend-first internship and campus placement preparation portal. The current implementation is a Next.js App Router prototype with three role experiences: Student, Admin, and Super Admin.

The repository currently contains UI, client-side navigation, mock data, and prototype authentication. It does **not** contain a database, API layer, server-side session validation, persistent CRUD, or production authorization. Treat all displayed records and credentials as demo data unless a future backend integration explicitly replaces them.

### Verified technology stack

- Next.js `16.4.2` with the App Router (`package.json`).
- React `19.3.0` and React DOM `19.3.0` (`package.json`).
- TypeScript `5` (`package.json`, `tsconfig.json`).
- Tailwind CSS `4` with the Tailwind Turbopack package (`package.json`, `src/app/globals.css`).
- ESLint 9 with `eslint-config-next` (`package.json`, `eslint.config.mjs`).
- No component library or external state-management package is currently listed in `package.json`.
- The root layout uses `next/font/google` with Geist and Geist Mono (`src/app/layout.tsx`), while the body explicitly uses an Arial/Helvetica fallback in `src/app/globals.css`.

Available scripts:

```text
npm dev
npm build
npm start
npm lint
```

The repository currently includes `package-lock.json`; use the repository's existing package-manager conventions and do not change dependency management casually.

## 2. Verified project structure

```text
/
├── AGENTS.md                         # Repository instructions; preserve and follow it
├── README.md                         # Existing project documentation; do not modify
├── CURSOR_HANDOFF.md                 # This guide
├── docs/                             # Protected project reference documents; do not modify
├── public/                           # Default static assets
├── next.config.ts                    # Next.js configuration
├── package.json                      # Scripts and dependencies
├── tsconfig.json                     # TypeScript configuration and path aliases
├── eslint.config.mjs                 # ESLint configuration
└── src/
    ├── app/
    │   ├── layout.tsx                # Root HTML layout and metadata
    │   ├── globals.css               # Global tokens and base styles
    │   ├── login/page.tsx            # Client-side demo login
    │   ├── student/                  # Student route wrappers
    │   ├── admin/                    # Admin route wrappers and legacy admin pages
    │   └── super-admin/              # Super Admin route wrappers
    ├── components/                   # Reusable page and shell components
    └── lib/
        ├── auth.ts                   # Demo accounts and session helpers
        └── placement-data.ts         # TypeScript models, mock records, and formatters
```

The exact route/page files currently present are:

- Student: `src/app/student/dashboard/page.tsx`, `src/app/student/internships/page.tsx`, `src/app/student/applications/page.tsx`, `src/app/student/assessments/page.tsx`.
- Admin: `src/app/admin/dashboard/page.tsx`, `src/app/admin/internships/page.tsx`, `src/app/admin/applications/page.tsx`, `src/app/admin/assessments/page.tsx`.
- Super Admin: `src/app/super-admin/dashboard/page.tsx`, `src/app/super-admin/internships/page.tsx`, `src/app/super-admin/applications/page.tsx`, `src/app/super-admin/assessments/page.tsx`.
- Login: `src/app/login/page.tsx`.

## 3. App Router and shared-component architecture

### Root layout

`src/app/layout.tsx` is the global server layout. It:

- Imports `src/app/globals.css`.
- Sets `lang="en"`.
- Registers Geist and Geist Mono CSS variables.
- Exports metadata with the title `InPlace · Internship & Placement Hub` and a placement-focused description.
- Renders the route content inside a full-height flex body.

Do not add route-specific navigation to the root layout. Role navigation belongs in `AppShell`.

### `AppShell`

`src/components/app-shell.tsx` is the main authenticated application frame. It is a client component because it uses `usePathname`, `useRouter`, `useEffect`, and `sessionStorage`.

It accepts:

```ts
{
  children: ReactNode;
  role?: Role;
  title: string;
  eyebrow?: string;
}
```

Its responsibilities are:

- Render the InPlace sidebar/header frame.
- Select navigation from the `navItems` record keyed by `Role`.
- Highlight the current route using `usePathname`.
- Check `window.sessionStorage` for `AUTH_STORAGE_KEY` after mount.
- Redirect to `/login` when there is no session or the stored role does not equal the supplied role.
- Render role-specific home links, avatar initials, display names, and logout behavior.
- Remove the session key and redirect to `/login` when Log out is clicked.

`SectionHeading` and `StatusBadge` are also exported from this file and reused by dashboard/list views. `StatusBadge` currently maps `Open` and `Shortlisted` to green, `Closed` and `Rejected` to red, and all other statuses to amber.

Important limitation: the shell's auth check is only a browser-side session check. It is not server-side authentication or authorization and can be bypassed by a user who edits browser storage or navigates directly.

### Role composition

`src/components/role-pages.tsx` is the role-to-view composition layer:

- `DashboardViewByRole`: student uses `DashboardView`; admin and super-admin use `AdminDashboardView`.
- `InternshipsViewByRole`: student uses `InternshipsView`; admin and super-admin use `AdminInternshipsView`.
- `ApplicationsViewByRole`: student uses `ApplicationsView`; admin and super-admin use `AdminApplicationsView`.
- `AssessmentsViewByRole`: student uses `AssessmentsView`; admin and super-admin use `AdminAssessmentsView`.

The file also exports aliases (`DashboardPage`, `InternshipsPage`, `ApplicationsPage`, and `AssessmentsPage`) used by route wrappers.

Keep this composition pattern. Shared components should receive role from route/page composition rather than hardcoding a role internally. In particular, preserve the exact union value `"super-admin"` across `Role`, login accounts, session storage, `AppShell`, and route wrappers. Do not introduce variants such as `superAdmin` or `superadmin` without deliberately updating every dependent map and type.

### Route wrappers

The role page files are intentionally thin. For example, `src/app/student/dashboard/page.tsx` imports `DashboardPage` and returns `<DashboardPage role="student" />`. The admin and super-admin route wrappers follow the same idea for their corresponding role.

When adding a role route:

1. Keep the route wrapper small.
2. Pass the literal role from the route (`student`, `admin`, or `super-admin`).
3. Let `role-pages.tsx` choose the shared view.
4. Let `AppShell` receive the same role.
5. Do not embed a different role inside the shared child component.

## 4. UI patterns and design system

`src/app/globals.css` defines the visual foundation:

- Light mode is explicit: `html { color-scheme: light; }`.
- Background: `#f5f6f2`.
- Foreground: `#17211b`.
- Cards: white.
- Borders: `#e2e7e1`.
- Primary accent: `#176b50`.
- Soft accent: `#e6f2ec`.
- Warning: `#a86618` / `#fff4df`.
- Danger: `#b94b48` / `#fcedeb`.
- Base typography uses Arial/Helvetica; Geist variables remain available from the root layout.
- Form controls receive white backgrounds, dark text, and the shared border color.

The UI uses Tailwind utility classes directly in components. Common patterns include white rounded-xl cards, subtle `#e2e7e1` borders, compact uppercase eyebrow labels, `text-sm` body copy, responsive `md:grid-cols-*` layouts, and a desktop sidebar that becomes a horizontally scrollable mobile navigation in `AppShell`.

Do not add dark mode, another theme, or a broad visual redesign unless explicitly requested. Reuse the existing tokens and spacing patterns. Prefer semantic HTML (`main`, `header`, `nav`, `section`, tables with headers) and preserve accessible labels and `role="alert"` error messages.

## 5. Role-specific functionality inventory

### Student

#### Dashboard — `/student/dashboard`

Implemented in `src/components/dashboard-view.tsx` and routed through `src/app/student/dashboard/page.tsx`.

- Displays a greeting using `currentStudent`.
- Shows profile completion, application count, and assessment average metrics.
- Shows recent mock applications with internship lookup and status badges.
- Shows preparation snapshot and assessment progress bars.
- Shows upcoming mock internship deadlines linking to `/internships/[id]`.
- Uses static values such as `82%`, `3` applications, and `72%`; these are prototype data, not calculated from a backend.
- There is no verified editable student profile or persistent resume upload feature in the inspected implementation.

#### Internship browsing — `/student/internships`

Implemented in `src/components/internships-view.tsx`.

- Searches company, role, location, and skills using React `useState` and `useMemo`.
- Filters by domain and calculated Open/Closed status.
- Shows the current student's branch and CGPA for context.
- Renders cards/links to the internship detail route.
- Eligibility context is represented by the mock student's branch and CGPA and by listing fields such as `branches` and `minCgpa`; no verified server-side eligibility enforcement exists.
- All records come from the in-memory `internships` array.

#### Internship details — `/internships/[id]`

Implemented in `src/app/internships/[id]/page.tsx` and `src/components/internship-detail.tsx`.

- Looks up an internship by id from mock data.
- Presents opportunity details and the current student context.
- The detail page must be checked before changing its apply interaction; the current codebase is frontend-only and does not persist applications.

#### Applications — `/student/applications`

Implemented in `src/components/applications-view.tsx`.

- Shows mock application rows, dates, linked internship names, and statuses.
- Uses `StatusBadge` and `formatDate`.
- The current student view is read-only. There is no verified persistent submit/update flow.

#### Assessments — `/student/assessments`

Implemented in `src/components/assessments-view.tsx`.

- Displays mock domain assessments, scores, totals, latest-attempt dates, and progress cards.
- Includes `View feedback` buttons, but the inspected component does not show a completed feedback dialog or persisted assessment attempt workflow.
- Scores and completion statuses are mock data.

### Admin

#### Dashboard — `/admin/dashboard`

Implemented in `src/components/admin-dashboard-view.tsx` and routed through the admin route wrapper.

- Displays mock totals for students, active internships, applications, and pending decisions.
- Calculates active internship count from mock deadlines with `getInternshipStatus`.
- Displays a recent applications table and links to management pages.
- The large totals and trends are hardcoded presentation values, not backend aggregates.

#### Internship management — `/admin/internships`

Implemented in `src/components/admin-internships-view.tsx`.

- Searches the in-memory internship list.
- Opens an inline create/edit form.
- Validates required company, role, and deadline fields in the browser.
- Adds, edits, and deletes records using React state.
- Delete uses `window.confirm` and explicitly describes the action as prototype-only.
- New records receive placeholder values for location, skills, branches, CGPA, and stipend.
- All mutations disappear on refresh/navigation because they are local in-memory state; there is no API or database.

#### Application management — `/admin/applications`

Implemented in `src/components/admin-applications-view.tsx`.

- Displays mock student applications and linked internship roles.
- Includes a `Review` button, but the inspected implementation does not attach a review modal, status mutation, or persistence.

#### Assessment management — `/admin/assessments`

`src/components/admin-assessments-view.tsx` currently delegates to `AssessmentsView` with the admin/super-admin role. The displayed cards are therefore the same mock score-oriented assessment cards rather than a verified question-bank CRUD interface.

Any assessment/question management described in product documents remains incomplete unless later code adds it. Do not describe the current cards as a full assessment authoring system.

### Super Admin

#### Routes

The intended routes are `/super-admin/dashboard`, `/super-admin/internships`, `/super-admin/applications`, and `/super-admin/assessments`. Their wrappers pass `role="super-admin"` into the shared role composition layer.

#### Current behavior

The inspected architecture treats Super Admin as an administrative variant:

- Dashboard uses `AdminDashboardView`.
- Internship management uses `AdminInternshipsView`.
- Application management uses `AdminApplicationsView`.
- Assessment management uses `AdminAssessmentsView` and therefore currently renders the shared assessment card view.

No verified Super Admin-only admin-account approval workflow was found in the inspected source files. If an account-request feature is needed, it should be implemented explicitly rather than assumed to exist because the role route exists.

## 6. Authentication and state management

`src/lib/auth.ts` contains the complete demo auth model:

```text
student@gmail.com / student       -> student       -> /student/dashboard
admin@gmail.com   / admin         -> admin         -> /admin/dashboard
superadmin@gmail.com / superadmin -> super-admin   -> /super-admin/dashboard
```

The exported pieces are:

- `AuthAccount` type.
- `AUTH_STORAGE_KEY = "inplace-auth-session"`.
- `authAccounts` array.
- `getAccount(email, password)`, which normalizes email and compares the password against the in-memory array.
- `getDashboardRoute(role)`, which maps a role to its configured route.

`src/app/login/page.tsx` is a client component. It:

1. Checks `sessionStorage` on mount and redirects an existing demo session to its role route.
2. Validates that email and password are present.
3. Calls `getAccount`.
4. Stores only the role string under `AUTH_STORAGE_KEY`.
5. Redirects with `router.replace`.
6. Supports a show/hide password button and inline error messaging.

`AppShell` reads the same key and compares it to the route-provided role. Logout removes the key.

This is **not production authentication**:

- Passwords are shipped in source and compared in the browser.
- Session storage is user-controlled and not HttpOnly.
- There is no server session, password hashing, CSRF protection, token expiry, or database user record.
- There is no server-side route guard or API authorization.
- Role checks only protect the rendered prototype experience.

Do not extend this model for real users. Replace it gradually with a server-backed auth provider/session while keeping the route and shared-view contracts stable.

## 7. Existing limitations and unfinished work

Verified limitations include:

- All placement, student, application, and assessment data lives in `src/lib/placement-data.ts`.
- Admin CRUD is in-memory React state only.
- Student applications are displayed but are not verified as persistently created by the UI.
- Admin `Review` and assessment `View feedback` controls are presentational buttons without verified completed workflows.
- No API route, server action, ORM, database client, migration, or backend service was found in the inspected file structure.
- No verified file upload/resume storage flow exists.
- No verified notification/email flow exists.
- No verified assessment question delivery, timed attempt, answer submission, grading, or feedback persistence exists.
- No verified admin account request/approval workflow exists.
- Legacy routes and role routes coexist; preserve them until usage is confirmed.
- The app uses fixed mock dates around October 18, 2026 in `placement-data.ts` and `AppShell`; replace date handling carefully when introducing real dates/time zones.

A button existing in the UI is not evidence that its backend behavior is implemented.

## 8. Backend integration roadmap

Integrate incrementally and preserve the existing UI contracts.

### Phase 1: Define server contracts

Create typed API/server-action contracts for:

- Users and roles.
- Internship listings and eligibility.
- Applications and status transitions.
- Assessments, questions, attempts, scores, and feedback.
- Admin accounts/requests if that feature is approved.

Keep response shapes close to the existing `Student`, `Internship`, `Application`, and `Assessment` types in `src/lib/placement-data.ts`, then move those types into a domain/types module only when there is a clear reason.

### Phase 2: Replace read-only mock data

Add server-side data access for dashboard metrics and list/detail pages first. Pass fetched data from Server Components into existing client views where possible. Avoid fetching inside `useEffect`; use Server Components, Route Handlers, Server Actions, or an approved data-fetching library according to the chosen backend.

Preserve existing props and visual components so the UI does not need to be rewritten. Replace imports of static arrays with typed data-access functions one feature at a time.

### Phase 3: Replace mutations

Move admin create/edit/delete, student apply, application review, and assessment submissions to authenticated server actions or API endpoints. Validate all inputs on the server, authorize by role on every mutation, and return structured errors for the existing form/error states.

Use stable database ids rather than `Date.now()` ids. Revalidate or refresh the affected route after successful writes and handle concurrent updates.

### Phase 4: Real authentication and authorization

Replace `src/lib/auth.ts` demo credentials and browser session storage with a real authentication system. Keep the route names and `Role` union unless the product intentionally changes them.

Server-side authorization must happen in:

- Protected route/layout logic.
- Server Actions.
- Route Handlers.
- Database queries or repository functions.

A frontend role prop is useful for rendering navigation, but it is not an authorization boundary. Never trust a role from the browser, URL, hidden form field, or client state. Derive the current user and role from a verified server session and scope every user-owned query accordingly.

### Phase 5: Persistence and operational features

Add migrations, indexes, audit records for administrative actions, pagination, loading/error/empty states, validation, upload storage for resumes, and notification delivery only as product requirements demand them. Keep these changes isolated from unrelated visual refactors.

## 9. Development rules for Cursor

1. Preserve the current Next.js App Router architecture and route structure.
2. Reuse `AppShell`, `SectionHeading`, `StatusBadge`, the view components, `role-pages.tsx`, and the domain types instead of duplicating complete pages.
3. Pass role explicitly from route wrappers. Do not hardcode `student`, `admin`, or `super-admin` inside a shared component when the parent already supplies it.
4. Keep `"super-admin"` exactly consistent across TypeScript types, auth accounts, storage, route maps, and route components.
5. Preserve the light design system in `src/app/globals.css`. Do not add dark mode, alternate themes, or unrelated styling changes.
6. Prefer existing dependencies and utilities. Do not install a new package without a clear feature or infrastructure need.
7. Keep TypeScript types accurate. Avoid `any`; update domain types when API requirements change.
8. Preserve working interactions while adding functionality. Do not replace a real flow with a decorative button, fake success message, or placeholder implementation.
9. Before changing shared behavior, inspect both the parent route wrapper and all current consumers of the shared component.
10. Do not perform unrelated refactors or large rewrites while implementing a feature.
11. Keep `docs/` unchanged. Do not modify `README.md`. Preserve and follow `AGENTS.md`.
12. Do not remove existing files or dependencies unless a demonstrated, documented need exists.
13. Keep user-facing controls accessible: labels for inputs, semantic headings, keyboard-accessible buttons, useful error text, and table headers.
14. Do not claim backend persistence when state is only in memory or session storage.
15. Run `npm lint`, `npm build`, or the narrowest relevant check after changes when appropriate. Report actual command results and distinguish code failures from environment limitations.
16. Explain significant changes in beginner-friendly language, including the files changed and why.

## 10. Safe feature-development workflow

1. Read `AGENTS.md`, the target route, its route wrapper, the shared view, `AppShell`, and relevant types/data before editing.
2. Identify whether the requested behavior is currently mock-only, client-only, or already backed by a real service.
3. Reuse the existing role composition pattern. Decide whether the feature belongs in a shared view, an admin view, a domain helper, or a new route.
4. Update TypeScript types and data contracts before wiring UI that depends on them.
5. Implement the smallest complete change. Keep loading, error, empty, and success states explicit rather than hiding incomplete behavior behind fake feedback.
6. For frontend-only prototype behavior, label its persistence limitation in code/UI when necessary. Do not imply that a local mutation is durable.
7. For backend work, add server validation and authorization before trusting any client-provided role or id.
8. Run the narrowest relevant lint/type/build check, then test the affected route in the browser for user-visible changes.
9. Test both the intended role and a mismatched role/session when changing protected routes.
10. Review the diff to ensure only the requested files changed and that `docs/`, `README.md`, and `AGENTS.md` were preserved.
11. Summarize the implementation, changed files, validation results, and any remaining unverified behavior.

## 11. Common pitfalls

- `AppShell` redirects until its client-side session check has completed; do not remove the loading guard casually.
- A route's role and the `AppShell` role must agree or the shell redirects to login.
- `sessionStorage` is per browser tab/session and is intentionally temporary in this prototype.
- `getInternshipStatus` compares against a fixed date in `src/lib/placement-data.ts`; do not treat it as a real-time backend status source.
- `AdminInternshipsView` mutations are local React state and reset after refresh.
- `AdminApplicationsView`'s `Review` control and assessment cards are not complete workflows merely because they render buttons.
- Verify the current tree before deleting legacy routes or aliases; the handoff describes the observed architecture, not permission to remove compatibility paths.

This file is documentation only. It intentionally does not implement the backend or modify application behavior.
