# Refactoring & Generator Sync Plan

Derived from a gap review of the original 13 tasks. Two categories of work:

1. **Generalization (R-series)** — code implemented in `apps/jira` that belongs in `libs/`
   so any platform app can use it without duplication.
2. **Generator sync (G-series)** — architectural decisions made in Tasks 01–13 that were
   never reflected in the NX generator templates; every new app scaffolded after those
   tasks generates outdated or incomplete scaffolding.

Phases:

- **Phase 1 — Generalization** — move app-specific code to shared libs
- **Phase 2 — Generator template sync** — bring generator in line with current architecture

---

## Phase 1 — Generalization

### Task R01 — Move rateLimit.ts from apps/jira to libs/shared

**Status:** `[x] completed`

**Context:** Task 05 created the sliding-window rate limiter in
`apps/jira/src/lib/rateLimit.ts`. Every OAuth platform app needs rate limiting on its
auth routes (callback, connect, refresh). Keeping this in `apps/jira` forces every new
platform app (Wrike, Linear, Monday) to re-implement or copy-paste the same logic.

**What to do:**

1. Move `apps/jira/src/lib/rateLimit.ts` → `libs/shared/src/lib/rateLimit.ts`
2. Move `apps/jira/src/lib/__tests__/rateLimit.spec.ts` →
   `libs/shared/src/lib/__tests__/rateLimit.spec.ts`
3. Re-export `rateLimit`, `getClientKey`, and the `RateLimitResult` type from
   `libs/shared/src/index.ts`
4. Update all three Jira auth routes to import from `@mp/shared` instead of
   `@/lib/rateLimit`:
   - `apps/jira/src/app/api/auth/jira/callback/route.ts`
   - `apps/jira/src/app/api/auth/jira/connect/route.ts`
   - `apps/jira/src/app/api/auth/jira/refresh/route.ts`
5. Run `npm test` to confirm no regressions

**Files to move / modify:**

- `apps/jira/src/lib/rateLimit.ts` → `libs/shared/src/lib/rateLimit.ts` _(move)_
- `apps/jira/src/lib/__tests__/rateLimit.spec.ts` →
  `libs/shared/src/lib/__tests__/rateLimit.spec.ts` _(move)_
- `libs/shared/src/index.ts` _(add re-exports)_
- `apps/jira/src/app/api/auth/jira/callback/route.ts` _(update import)_
- `apps/jira/src/app/api/auth/jira/connect/route.ts` _(update import)_
- `apps/jira/src/app/api/auth/jira/refresh/route.ts` _(update import)_

---

### Task R02 — Add @mp/task-core sub-path aliases to tsconfig.base.json and vitest.config.ts

**Status:** `[x] completed`

**Context:** Task 10 added `package.json` `exports` for `./types`, `./errors`, and
`./contexts` sub-paths in `libs/task-core`. However, neither `tsconfig.base.json` nor
`vitest.config.ts` was updated with matching path aliases. TypeScript and Vitest both
fail to resolve `@mp/task-core/types` etc., making the sub-path exports effectively
unusable until this is fixed.

**What to do:**

1. Add to `tsconfig.base.json` under `compilerOptions.paths`:

   ```json
   "@mp/task-core/types": ["libs/task-core/src/types/index.ts"],
   "@mp/task-core/errors": ["libs/task-core/src/errors/index.ts"],
   "@mp/task-core/contexts": ["libs/task-core/src/contexts/index.ts"]
   ```

2. Add to `vitest.config.ts` under `resolve.alias`:

   ```ts
   "@mp/task-core/types": fileURLToPath(
     new URL("./libs/task-core/src/types/index.ts", import.meta.url)
   ),
   "@mp/task-core/errors": fileURLToPath(
     new URL("./libs/task-core/src/errors/index.ts", import.meta.url)
   ),
   "@mp/task-core/contexts": fileURLToPath(
     new URL("./libs/task-core/src/contexts/index.ts", import.meta.url)
   ),
   ```

3. Run `npm run typecheck` to confirm all sub-paths resolve

**Files to modify:**

- `tsconfig.base.json`
- `vitest.config.ts`

---

### Task R03 — Apply shared normalizers in JiraServiceAdapter

**Status:** `[x] completed`

**Context:** Task 12 created `toISODateString`, `mapPriority`, `mapAssignee`, and
`stripHtml` in `libs/shared/src/lib/normalizers.ts`, but `JiraServiceAdapter.ts` was not
updated to use them. Without a production consumer, the helpers are untested in real
usage and future adapter authors have no reference implementation showing the pattern.

**What to do:**

1. Audit `apps/jira/src/platforms/JiraServiceAdapter.ts` for inline date formatting,
   priority mapping, and assignee mapping logic
2. Replace inline implementations with calls to the shared normalizers where the
   function signature matches
3. For any mismatches (e.g., Jira's assignee shape includes `avatarUrl` which the current
   `mapAssignee` helper doesn't handle), either:
   - Extend the `mapAssignee` signature in `normalizers.ts` to accept an optional
     `avatarUrl` field and update the unit tests, or
   - Document the gap with a comment explaining why the local implementation is kept
4. Run `npm test` to confirm no regressions

**Files to modify:**

- `apps/jira/src/platforms/JiraServiceAdapter.ts`
- `libs/shared/src/lib/normalizers.ts` _(if signature extended)_
- `libs/shared/src/lib/__tests__/normalizers.spec.ts` _(if new cases added)_

---

## Phase 2 — Generator Template Sync

### Task G01 — Add instrumentation.ts template to generator

**Status:** `[x] completed`

**Context:** Task 03 created `apps/jira/src/instrumentation.ts` to trigger startup env
validation via Next.js's `register()` hook. Every platform app needs this identical file.
Without a generator template, every new app either ships without startup validation or
has to add it manually post-generation.

**What to do:**

1. Create `tools/generators/src/generators/platform-app/files/src/instrumentation.ts__tmpl__`
   with the `register()` hook importing `./lib/config` on the Node.js runtime.
2. Confirm the generator's files walker picks it up automatically (NX generators walk the
   entire `files/` tree; no explicit file list required).

**Files to create:**

- `tools/generators/src/generators/platform-app/files/src/instrumentation.ts__tmpl__`

---

### Task G02 — Add error page templates to generator

**Status:** `[x] completed`

**Context:** Task 04 created `error.tsx`, `global-error.tsx`, and `not-found.tsx` only in
`apps/jira`. New platform apps scaffolded by the generator receive none of these, so they
ship without error boundaries or require manual post-generation work.

**What to do:**

1. Create `error.tsx__tmpl__` — segment-level error boundary with retry button; heading
   uses `<%= platformDisplay %>`.
2. Create `global-error.tsx__tmpl__` — root-level boundary; must include `<html>` and
   `<body>` tags per Next.js requirements.
3. Create `not-found.tsx__tmpl__` — 404 page with link back to extension root; heading
   references `<%= platformDisplay %>`.
4. Mirror the implementation style used in `apps/jira/src/app/` for each page.

**Files to create:**

- `tools/generators/src/generators/platform-app/files/src/app/error.tsx__tmpl__`
- `tools/generators/src/generators/platform-app/files/src/app/global-error.tsx__tmpl__`
- `tools/generators/src/generators/platform-app/files/src/app/not-found.tsx__tmpl__`

---

### Task G03 — Sync platformRoute.ts**tmpl** with Task 06's withAdapter consolidation

**Status:** `[x] completed`

**Context:** Task 06 removed `withAdapterOrEmpty` from `apps/jira/src/lib/platformRoute.ts`
and replaced it with `withAdapter({ emptyOnNoAuth?: boolean })`. The generator template
`tools/generators/.../files/src/lib/platformRoute.ts__tmpl__` was never updated. Every
app scaffolded after Task 06 gets the obsolete two-function pattern.

**What to do:**

1. Read `apps/jira/src/lib/platformRoute.ts` (post-Task-06 version)
2. Replace the body of `platformRoute.ts__tmpl__` with the consolidated pattern, using
   EJS variables for platform-specific identifiers
3. Search for any other generator route templates that call `withAdapterOrEmpty` and
   update them to use `withAdapter({ emptyOnNoAuth: true })`

**Files to modify:**

- `tools/generators/src/generators/platform-app/files/src/lib/platformRoute.ts__tmpl__`
- Any `*.ts__tmpl__` or `*.tsx__tmpl__` files under `files/` that reference
  `withAdapterOrEmpty`

---

### Task G04 — Add typecheck NX target to generator's project.json template

**Status:** `[x] completed`

**Context:** Task 02 added `typecheck` targets to all 8 existing `project.json` files,
but the generator's `project.json__tmpl__` was not updated. New apps do not receive a
`typecheck` target, so `nx run-many --target=typecheck --all` and the CI step silently
skip them.

**What to do:**

1. Add the `typecheck` target to
   `tools/generators/src/generators/platform-app/files/project.json__tmpl__`

**Files to modify:**

- `tools/generators/src/generators/platform-app/files/project.json__tmpl__`

---

### Task G05 — Update generator auth route templates to import rateLimit from @mp/shared

**Status:** `[x] completed`

**Depends on:** Task R01 (rateLimit must be in libs/shared first)

**Context:** After Task R01 moves `rateLimit.ts` to `libs/shared`, the generator's auth
route templates must import from `@mp/shared`. If the templates do not currently include
rate limiting at all, this task adds it so every generated app is protected out of the box.

**What to do:**

1. Locate the generator auth route templates (callback, connect, refresh)
2. If rate limiting is already present: update import to `@mp/shared`
3. If not present: add the rate limit check using the same limits as `apps/jira`
   (callback 10/min by IP, connect 20/min by IP, refresh 30/min by userId)

**Files to modify:**

- `tools/generators/src/generators/platform-app/files/src/app/api/auth/__name__/callback/route.ts__tmpl__`
- `tools/generators/src/generators/platform-app/files/src/app/api/auth/__name__/connect/route.ts__tmpl__`
- `tools/generators/src/generators/platform-app/files/src/app/api/auth/__name__/refresh/route.ts__tmpl__`

---

### Task G06 — Add /api base-URL convention comment to apiPaths.ts**tmpl**

**Status:** `[x] completed` _(already present from original Task 07)_

**Context:** Task 07 added an explanatory comment to `apps/jira/src/lib/apiPaths.ts`
documenting that paths omit `/api` because the axios client defaults to `baseURL="/api"`.
The generator template was not updated, so new apps generate a confusing `apiPaths.ts`
with no explanation of this convention.

**What to do:**

1. Read `apps/jira/src/lib/apiPaths.ts` to get the exact comment added in Task 07
2. Add the same comment to `tools/generators/.../files/src/lib/apiPaths.ts__tmpl__`

**Files to modify:**

- `tools/generators/src/generators/platform-app/files/src/lib/apiPaths.ts__tmpl__`

---

### Task G07 — Add contract test template to generator

**Status:** `[x] completed`

**Context:** Task 13 created a reference contract test for `JiraServiceAdapter`. The
generator should emit this scaffold for every new adapter so contract testing is enforced
by default rather than opt-in.

**What to do:**

1. Create the contract test template using `JiraServiceAdapter.contract.spec.ts` as
   reference; replace Jira-specific identifiers with EJS variables
2. Use `vi.hoisted()` for all mock data (required pattern — see Task 13)
3. Add a note in `docs/guides/new-platform-app.md` that the contract test must pass
   before merge

**Files to create / modify:**

- `tools/generators/src/generators/platform-app/files/src/platforms/__tests__/__className__ServiceAdapter.contract.spec.ts__tmpl__`
  _(create)_
- `docs/guides/new-platform-app.md` _(update)_

---

## Quick reference

| Task                                                   | Category       | Effort  | Risk |
| ------------------------------------------------------ | -------------- | ------- | ---- |
| R01 — Move rateLimit to libs/shared                    | Generalization | ~1 h    | Low  |
| R02 — task-core sub-path aliases in tsconfig + vitest  | Generalization | ~20 min | Low  |
| R03 — Apply normalizers in JiraServiceAdapter          | Generalization | ~1 h    | Low  |
| G01 — instrumentation.ts generator template            | Generator sync | ~20 min | None |
| G02 — Error page generator templates                   | Generator sync | ~1 h    | Low  |
| G03 — Sync platformRoute.ts**tmpl**                    | Generator sync | ~1 h    | Low  |
| G04 — typecheck target in project.json**tmpl**         | Generator sync | ~15 min | None |
| G05 — Auth route templates → rateLimit from @mp/shared | Generator sync | ~30 min | Low  |
| G06 — apiPaths.ts**tmpl** /api convention comment      | Generator sync | ~10 min | None |
| G07 — Contract test generator template                 | Generator sync | ~1 h    | Low  |
