# Implementation Plan

Derived from the tech-lead analysis (see conversation). Tasks are ordered by priority and
designed so each one can be fully completed in a single execution. Check off each task
as it is done.

Phases:

- **Phase 1 — Tooling** (scripts, eslint config) — low risk, no logic changes
- **Phase 2 — TypeScript checking** — type-safety infrastructure
- **Phase 3 — Runtime safety** — startup validation, error pages
- **Phase 4 — Security** — rate limiting on auth routes
- **Phase 5 — Code quality** — small targeted refactors
- **Phase 6 — Architecture & documentation** — generator, shadowing, exports
- **Phase 7 — Future platform foundations** — GraphQL, normalizers, Wrike tests

---

## Phase 1 — Tooling

### Task 01 — Fix package.json scripts and harden tooling config

**Status:** `[x] completed`

**What to do:**

1. **`package.json` scripts** — make the following changes:

   | Script               | Current                      | Change to                                      |
   | -------------------- | ---------------------------- | ---------------------------------------------- |
   | `start`              | `cd apps/jira && next start` | `nx run jira:serve --configuration=production` |
   | `prepare`            | `husky \|\| true`            | `is-ci \|\| husky`                             |
   | `typecheck`          | _(missing)_                  | `nx run-many --target=typecheck --all`         |
   | `typecheck:affected` | _(missing)_                  | `nx affected --target=typecheck`               |
   | `lint:fix`           | _(missing)_                  | `nx run-many --target=lint --all -- --fix`     |
   | `clean`              | _(missing)_                  | `nx reset && rimraf apps/jira/.next`           |
   | `generate`           | _(missing)_                  | `nx g @mp/generators:platform-app`             |

2. **Add `is-ci` devDependency** (`npm install -D is-ci`) — detects CI without swallowing errors.

3. **Add `rimraf` devDependency** (`npm install -D rimraf`) — cross-platform `rm -rf`.

4. **Sync `eslint-config-next`** to `^16.2.0` to match `next: ^16.2.x`.

5. **Harden `@nx/eslint-plugin` import** — remove try/catch dynamic import; use static import.

**Files to modify:**

- `package.json`
- `eslint.config.mjs`

---

### Task 02 — Add `typecheck` NX target to all projects + CI step

**Status:** `[x] completed`

**What to do:**

1. Add a `typecheck` target to every `project.json` that doesn't already have one:

   ```json
   "typecheck": {
     "executor": "nx:run-commands",
     "inputs": ["default", "{workspaceRoot}/tsconfig.base.json"],
     "cache": true,
     "options": {
       "command": "tsc --noEmit --project tsconfig.json",
       "cwd": "{projectRoot}"
     }
   }
   ```

   Apply to all 8 projects: `apps/jira`, `libs/adapter-test-kit`, `libs/ai`, `libs/auth`,
   `libs/shared`, `libs/task-core`, `libs/token-storage`, `libs/ui`.

2. **Add CI step** in `.github/workflows/testing-pipeline.yaml` after "Lint affected projects":

   ```yaml
   - name: Typecheck affected projects
     run: npx nx affected --target=typecheck --parallel=3
   ```

3. Run `npm run typecheck` locally to confirm no pre-existing errors.

**Files to modify:**

- `apps/jira/project.json`
- `libs/adapter-test-kit/project.json`
- `libs/ai/project.json`
- `libs/auth/project.json`
- `libs/shared/project.json`
- `libs/task-core/project.json`
- `libs/token-storage/project.json`
- `libs/ui/project.json`
- `.github/workflows/testing-pipeline.yaml`

---

## Phase 2 — Runtime safety

### Task 03 — Force env validation at app startup via instrumentation.ts

**Status:** `[x] completed`

**Context:** `apps/jira/src/lib/config.ts` already validates env vars via Zod at module
load time but is imported lazily. The fix imports it from `instrumentation.ts` so the
server process fails immediately on startup if a required variable is missing.

**What to do:**

1. Create `apps/jira/src/instrumentation.ts`:

   ```ts
   export async function register() {
     if (process.env.NEXT_RUNTIME === "nodejs") {
       await import("./lib/config");
     }
   }
   ```

2. Verify Next.js 15+ enables the hook by default (no config flag needed).

**Files to create:**

- `apps/jira/src/instrumentation.ts`

---

### Task 04 — Add Next.js error pages (error.tsx, global-error.tsx, not-found.tsx)

**Status:** `[x] completed`

**What to do:**

Create three App Router error/fallback pages in `apps/jira/src/app/`:

1. **`error.tsx`** — segment-level error boundary; retry button.
2. **`global-error.tsx`** — root-level; must include `<html>` and `<body>` tags.
3. **`not-found.tsx`** — shown on `notFound()` or unmatched routes; link to extension root.

**Files to create:**

- `apps/jira/src/app/error.tsx`
- `apps/jira/src/app/global-error.tsx`
- `apps/jira/src/app/not-found.tsx`

---

## Phase 3 — Security

### Task 05 — Rate limit auth endpoints (callback, connect, refresh)

**Status:** `[x] completed`

**Context:** OAuth callback, connect, and refresh routes had no brute-force protection.

**What to do:**

1. Create `apps/jira/src/lib/rateLimit.ts` — sliding-window limiter with `Map<string, number[]>`.
2. Apply limits: callback (10/min by IP), connect (20/min by IP), refresh (30/min by userId).
3. Return `429` with `Retry-After` header when exceeded.
4. Unit-test in `apps/jira/src/lib/__tests__/rateLimit.spec.ts`.

**Files to create / modify:**

- `apps/jira/src/lib/rateLimit.ts` _(create)_
- `apps/jira/src/lib/__tests__/rateLimit.spec.ts` _(create)_
- `apps/jira/src/app/api/auth/jira/callback/route.ts`
- `apps/jira/src/app/api/auth/jira/connect/route.ts`
- `apps/jira/src/app/api/auth/jira/refresh/route.ts`

---

## Phase 4 — Code quality

### Task 06 — Consolidate withAdapterOrEmpty into withAdapter via options

**Status:** `[x] completed`

**Context:** `withAdapterOrEmpty` was a separate function encoding a business rule
(return `[]` not `401` for the projects endpoint) inside infrastructure. Merged into
`withAdapter` with an `{ emptyOnNoAuth?: boolean }` option.

**Files modified:**

- `apps/jira/src/lib/platformRoute.ts`
- `apps/jira/src/app/api/jira/projects/route.ts`

---

### Task 07 — Clarify PlatformApiPaths /api base-URL convention

**Status:** `[x] completed`

**Context:** Paths in `apiPaths.ts` omit `/api` because the axios client defaults to
`baseURL="/api"`. This was undocumented. Added explanatory comments to three locations.

**Files modified:**

- `apps/jira/src/lib/apiPaths.ts`
- `libs/shared/src/lib/createPlatformApiClient.ts`
- `tools/generators/src/generators/platform-app/files/src/lib/apiPaths.ts__tmpl__`

---

## Phase 5 — Architecture & documentation

### Task 08 — Document component shadowing TS limitation + add typecheck:shadows

**Status:** `[x] completed`

**What to do:**

1. Add "TypeScript caveats" section to `docs/architecture/component-shadowing.md`.
2. Add `typecheck:shadows` script to `package.json`: `tsc --noEmit --project apps/jira/tsconfig.json`.
3. Add CI step after "Check shadow file coverage": `npm run typecheck:shadows`.

**Files modified:**

- `docs/architecture/component-shadowing.md`
- `package.json`
- `.github/workflows/testing-pipeline.yaml`

---

### Task 09 — Parameterize Jira-specific hardcodings in generator templates

**Status:** `[x] completed`

**Context:** The NX generator replaces `jira`/`Jira`/`JIRA` in templates but several
identifiers are Jira-shaped assumptions, not plain name substitutions. These must become
EJS variables so generated apps start with correct, platform-neutral scaffolding.

**Known hardcodings to parameterize (audit first — there may be more):**

| Location                          | Jira-specific assumption           | EJS variable to use                       |
| --------------------------------- | ---------------------------------- | ----------------------------------------- |
| `jiraErrors.ts__tmpl__`           | `JiraClientError`, `JiraAuthError` | `<%= Name %>ClientError` etc.             |
| cookies helper                    | `jira_session_token` cookie name   | `<%= platform %>_session_token`           |
| `getJiraUserIdFromSession`        | function name ties to "Jira"       | `get<%= Name %>UserIdFromSession`         |
| `JiraServiceAdapter` import paths | adapter class name                 | `<%= Name %>ServiceAdapter`               |
| Error message strings             | "No active Jira connection"        | "No active <%= displayName %> connection" |

**What to do:**

1. Run `grep -ri "jira" tools/generators/src/generators/platform-app/files/` and list
   every occurrence not covered by EJS substitution.
2. Replace each with the appropriate EJS variable.
3. Run `nx g @mp/generators:platform-app wrike --yamlFile capabilities/wrike.yaml --dryRun`
   and confirm no `jira`-named identifiers appear in the output.

**Files to modify:**

- All `*.ts__tmpl__`, `*.tsx__tmpl__`, `*.json__tmpl__` under `tools/generators/.../files/`
  that contain raw `jira`/`Jira` strings.
- `tools/generators/src/generators/platform-app/generator.ts` if needed.

---

### Task 10 — Add sub-path exports to task-core package.json

**Status:** `[x] completed`

**Context:** `libs/task-core/src/index.ts` is a single barrel. Sub-path exports let
consumers import only what they need without changing existing `@mp/task-core` imports.

**What to do:**

1. Add sub-paths to `libs/task-core/package.json` `exports`:

   ```json
   {
     "exports": {
       ".": "./src/index.ts",
       "./types": "./src/types/index.ts",
       "./errors": "./src/errors/index.ts",
       "./contexts": "./src/contexts/index.ts"
     }
   }
   ```

2. Create the sub-barrel files that re-export only their respective symbols.
3. Root `./src/index.ts` keeps re-exporting everything — existing imports unaffected.
4. Update `tsconfig.base.json` paths if needed.
5. Run `npm run typecheck` to confirm nothing is broken.

**Files to create / modify:**

- `libs/task-core/package.json`
- `libs/task-core/src/types/index.ts` _(create)_
- `libs/task-core/src/errors/index.ts` _(create)_
- `libs/task-core/src/contexts/index.ts` _(create)_
- `tsconfig.base.json` _(add sub-path aliases if needed)_

---

## Phase 6 — Future platform foundations

### Task 11 — Add GraphQL client infrastructure to libs/shared

**Status:** `[x] completed`

**Context:** monday.com and Linear use GraphQL-only APIs. The current stack is
entirely axios + REST. This must exist before scaffolding those platform apps.

**What to do:**

1. Install: `npm install graphql-request graphql`.
2. Create `libs/shared/src/lib/createGraphQLClient.ts` — same interface shape as
   `createPlatformApiClient` (token injection, auth failure callback).
3. Re-export from `libs/shared/src/index.ts`.
4. Add `apiStyle: "rest" | "graphql"` capability flag to `capability-flags.json`.
5. Update generator to emit GraphQL client setup when `apiStyle === "graphql"`.
6. Write unit tests.

**Files to create / modify:**

- `libs/shared/src/lib/createGraphQLClient.ts` _(create)_
- `libs/shared/src/lib/__tests__/createGraphQLClient.spec.ts` _(create)_
- `libs/shared/src/index.ts`
- `capabilities/capability-flags.json`
- `libs/task-core/src/types/platform-capabilities.ts`
- `tools/generators/src/generators/platform-app/generator.ts`

---

### Task 12 — Add normalizer utility helpers to libs/shared

**Status:** `[x] completed`

**Context:** Each platform adapter normalizes raw API responses inline. Shared helpers
prevent the same logic being re-implemented differently per platform.

**What to do:**

1. Create `libs/shared/src/lib/normalizers.ts` with:
   - `toISODateString(value)`
   - `mapPriority(raw, mapping)`
   - `mapAssignee(raw)`
   - `stripHtml(html)` (for Wrike HTML → plain text)
2. Re-export from `libs/shared/src/index.ts`.
3. Update `JiraServiceAdapter.ts` to adopt helpers where applicable.
4. Add unit tests in `libs/shared/src/lib/__tests__/normalizers.spec.ts`.

**Files to create / modify:**

- `libs/shared/src/lib/normalizers.ts` _(create)_
- `libs/shared/src/lib/__tests__/normalizers.spec.ts` _(create)_
- `libs/shared/src/index.ts`
- `apps/jira/src/platforms/JiraServiceAdapter.ts`

---

### Task 13 — Run Wrike adapter through the adapter-test-kit contract suite

**Status:** `[x] completed`

**Context:** `libs/adapter-test-kit` verifies that any `PlatformServiceAdapter`
satisfies the full 23-method contract. Every new adapter must pass before merge.

**What to do:**

1. Check if Jira adapter has a contract test; create it if missing as a reference example.
2. Once Wrike adapter is scaffolded, create its contract test using the same pattern.
3. Document the requirement in `docs/guides/new-platform-app.md` under "Contract testing".

**Files to create / modify:**

- `apps/jira/src/platforms/__tests__/JiraServiceAdapter.contract.spec.ts` _(create if missing)_
- `apps/wrike/src/platforms/__tests__/WrikeServiceAdapter.contract.spec.ts` _(when Wrike exists)_
- `docs/guides/new-platform-app.md`

---

## Quick reference

| Task                                  | Phase           | Effort  | Risk       |
| ------------------------------------- | --------------- | ------- | ---------- |
| 01 — Fix scripts + eslint tooling     | Tooling         | ~1 h    | Low        |
| 02 — typecheck NX target + CI         | TypeScript      | ~1 h    | Low        |
| 03 — Startup env validation           | Runtime safety  | ~30 min | Low        |
| 04 — Error / not-found pages          | Runtime safety  | ~1 h    | Low        |
| 05 — Rate limit auth routes           | Security        | ~2 h    | Low–medium |
| 06 — Consolidate withAdapter          | Code quality    | ~1 h    | Low        |
| 07 — PlatformApiPaths comments        | Code quality    | ~20 min | None       |
| 08 — Shadow TS docs + typecheck       | Architecture    | ~1 h    | Low        |
| 09 — Parameterize generator templates | Architecture    | ~3 h    | Medium     |
| 10 — task-core sub-path exports       | Architecture    | ~2 h    | Low        |
| 11 — GraphQL client in libs/shared    | Future platform | ~3 h    | Low        |
| 12 — Normalizer utilities             | Future platform | ~2 h    | Low        |
| 13 — Wrike adapter contract tests     | Future platform | ~2 h    | Low        |
