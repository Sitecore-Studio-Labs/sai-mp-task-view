# Security Evidence: Source Code & Secrets

> **Project:** sai-mp-jira-task-view (Next.js / TypeScript)
> **Generated:** 2026-04-02
> **Scope:** Environment variable usage, absence of hard-coded secrets, encryption helpers, versioning process, CI/CD secrets management.

**Related compliance docs:** [API endpoint inventory](./api-endpoint-inventory.md) · [Security testing & vulnerability management](./security-testing-and-vulnerability-management.md)

---

## 1. Environment Variable Usage Patterns

### 1.1 Loading mechanism

The application relies on **Next.js built-in `.env` loading** (`.env`, `.env.local`, `.env.development`, etc.). There is no custom `dotenv.config()` call or third-party env loader in application code. Variables are accessed exclusively through `process.env`.

### 1.2 Env template (`.env.example`)

A committed `.env.example` documents every required variable with empty values:

| Variable                              | Purpose                               | Scope           |
| ------------------------------------- | ------------------------------------- | --------------- |
| `NEXT_PUBLIC_APP_URL`                 | Public app URL for iframe/embed flows | Client + Server |
| `NEXT_PUBLIC_SUPABASE_URL`            | Supabase project URL                  | Client + Server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`       | Supabase anonymous key                | Client + Server |
| `SUPABASE_SERVICE_ROLE_KEY`           | Supabase admin key                    | Server only     |
| `JIRA_CLIENT_ID`                      | Jira OAuth 2.0 client ID              | Server only     |
| `JIRA_CLIENT_SECRET`                  | Jira OAuth 2.0 client secret          | Server only     |
| `JIRA_REDIRECT_URI`                   | Jira OAuth callback URL               | Server only     |
| `NEXT_PUBLIC_ENABLE_AI_TASK_CREATION` | Feature flag for AI task breakdown    | Client          |
| `OPENAI_API_KEY`                      | OpenAI API key (optional)             | Server only     |

Additional runtime variables (`VERCEL_URL`, `VERCEL_PROJECT_PRODUCTION_URL`, `CI`, `PLAYWRIGHT_BASE_URL`) are platform-provided or CI-only and do not appear in `.env.example`.

### 1.3 Validation strategy

Every `process.env` access is **guarded at runtime** with explicit null/empty checks and descriptive error messages:

- **Server errors (throw / 500):** `JiraAdapter` constructor, `supabaseClient.createSupabaseServerClient()`, `encryption.ts getEncryptionKey()`, `ai-openai.ts`, `callback/route.ts`, `connect/route.ts`.
- **Client warnings (graceful degradation):** `supabaseBrowserClient` logs `console.warn` and returns `null`; AI feature flag defaults to `false`.

There is no Zod/Joi schema for environment validation. Validation is manual and co-located with usage.

### 1.4 Files that access `process.env`

| File                                                       | Variables used                                                                           |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `src/utils/encryption.ts`                                  | `JIRA_CLIENT_SECRET`                                                                     |
| `src/platforms/jira/JiraAdapter.ts`                        | `JIRA_CLIENT_ID`, `JIRA_CLIENT_SECRET`                                                   |
| `src/lib/supabaseClient.ts`                                | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| `src/lib/ai-openai.ts`                                     | `OPENAI_API_KEY`                                                                         |
| `src/app/api/auth/jira/connect/route.ts`                   | `JIRA_CLIENT_ID`, `JIRA_REDIRECT_URI`                                                    |
| `src/app/api/auth/jira/callback/route.ts`                  | `JIRA_REDIRECT_URI`                                                                      |
| `src/app/api/jira/webhooks/route.ts`                       | `NEXT_PUBLIC_APP_URL`, `VERCEL_URL`, `VERCEL_PROJECT_PRODUCTION_URL`                     |
| `src/app/api/ai/parse-requirements/route.ts`               | `OPENAI_API_KEY`                                                                         |
| `src/components/tasks/CreateTaskView.tsx`                  | `NEXT_PUBLIC_ENABLE_AI_TASK_CREATION`                                                    |
| `src/hooks/useClientOriginUrl.ts`                          | `NEXT_PUBLIC_APP_URL`                                                                    |
| `src/hooks/useOAuthPopupHandler.ts`                        | `NEXT_PUBLIC_APP_URL`                                                                    |
| `src/providers/auth-providers/JiraAuthFailureProvider.tsx` | `NEXT_PUBLIC_APP_URL`                                                                    |
| `apps/jira-e2e/playwright.config.ts`                       | `CI`, `PLAYWRIGHT_BASE_URL`                                                              |

---

## 2. No Hard-Coded Secrets

### 2.1 Scan results

A comprehensive source-code scan was performed across all `*.ts`, `*.tsx`, `*.js`, and `*.jsx` files for the following patterns. **No hard-coded secrets were found.**

| Pattern                                                | Matches                                      | Verdict |
| ------------------------------------------------------ | -------------------------------------------- | ------- |
| `password\s*[:=]`                                      | 0                                            | Clean   |
| `secret\s*[:=]`                                        | 2 — both read from `process.env`             | Clean   |
| `apikey` / `api_key`                                   | 1 — reads `process.env.OPENAI_API_KEY`       | Clean   |
| `token\s*[:=]\s*["']`                                  | 0 (only log messages)                        | Clean   |
| `Bearer [A-Za-z0-9]` (literal)                         | 0 — all use template literals with variables | Clean   |
| `Basic [A-Za-z0-9]`                                    | 0                                            | Clean   |
| Connection strings (`mongodb://`, `postgres://`, etc.) | 0                                            | Clean   |
| Long base64 literals (`[A-Za-z0-9+/]{40,}=`)           | 0                                            | Clean   |
| Long hex literals (`[0-9a-fA-F]{32,}`)                 | 0                                            | Clean   |
| JWT-like (`eyJ...`)                                    | 0                                            | Clean   |
| Platform key patterns (`sk-`, `ghp_`, `AIza`)          | 0                                            | Clean   |

### 2.2 Test fixtures

Test files (`src/test/__tests__/`) use obvious placeholder tokens such as `"new-token"` and `"refresh-token"` — not production credentials.

### 2.3 `.gitignore` protections

```
# env files – ignore all; keep .env.example in git
.env*
!.env.example
```

- `.env.local` is confirmed gitignored: `.gitignore:35:.env* → .env.local`
- `*.pem` files are also gitignored.
- The only committed env file is `.env.example` (empty values only).

---

## 3. Encryption Helpers Usage

### 3.1 Encryption module

**File:** `src/utils/encryption.ts`

- **Algorithm:** AES-256-GCM (authenticated encryption)
- **Key derivation:** `SHA-256(process.env.JIRA_CLIENT_SECRET)` → 32-byte key
- **IV:** 12-byte random per encryption (`crypto.randomBytes(12)`)
- **Output format:** `base64(IV ‖ AuthTag ‖ Ciphertext)`
- **Library:** Node.js built-in `crypto` (no third-party dependencies)

Exports two functions: `encrypt(plainText: string): string` and `decrypt(cipherText: string): string`.

### 3.2 Where tokens are encrypted (write path)

| Step            | File                                                       | Detail                                                                                                                                                                    |
| --------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OAuth exchange  | `src/app/api/auth/jira/callback/route.ts`                  | `JiraAdapter.authenticate(code)` returns plaintext `PlatformToken`                                                                                                        |
| Encrypt + store | `src/services/jiraService.ts` → `saveUserJiraConnection()` | Calls `encrypt(token.accessToken)` and `encrypt(token.refreshToken)`, stores as `access_token_encrypted` / `refresh_token_encrypted` in Supabase `jira_connections` table |
| Token refresh   | `src/services/jiraService.ts` → `refreshUserJiraToken()`   | After `adapter.refreshToken()`, calls `saveUserJiraConnection()` again (re-encrypts new token pair)                                                                       |

### 3.3 Where tokens are decrypted (read path)

| Consumer                  | File                                                      | Detail                                                                                                       |
| ------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Full connection retrieval | `src/services/jiraService.ts` → `getUserJiraConnection()` | Decrypts both `access_token_encrypted` and `refresh_token_encrypted`; on failure marks connection `inactive` |
| Sites API route           | `src/app/api/jira/sites/route.ts`                         | Decrypts `access_token_encrypted` to call Atlassian accessible-resources API                                 |

### 3.4 Database schema

**File:** `supabase/schema.sql`

```sql
-- jira_connections table stores encrypted tokens
access_token_encrypted  TEXT NOT NULL,
refresh_token_encrypted TEXT NOT NULL
```

### 3.5 End-to-end token lifecycle

```
Jira OAuth → plaintext token
    ↓
encrypt(accessToken) + encrypt(refreshToken)
    ↓
Supabase jira_connections (encrypted at rest in DB columns)
    ↓
SELECT access_token_encrypted
    ↓
decrypt(ciphertext) → plaintext used in-memory for Bearer header
    ↓
Never persisted in plaintext; only transmitted over HTTPS to Atlassian APIs
```

### 3.6 Session tokens

`jira_sessions.session_token` is generated with `crypto.randomBytes(32).toString("hex")` (cryptographically random) but stored in plaintext in Supabase. The session cookie is HTTP-only. This is a standard session-token pattern (random, unguessable, not a credential that can be reused against a third-party API).

---

## 4. Versioning Process (Escrow-Ready)

### 4.1 Current version

`package.json` → `"version": "0.1.0"` (pre-release, development phase).

### 4.2 Changelog

`CHANGELOG.md` in the repository root follows the [Keep a Changelog](https://keepachangelog.com) format. All notable changes are documented under an `[Unreleased]` section until the first formal release, at which point it will be promoted to a versioned entry (e.g., `[1.0.0] - YYYY-MM-DD`) and tagged in git.

### 4.3 Git tags

No git tags exist yet. Tags will be created alongside the first release to enable escrow-compatible snapshots.

### 4.4 Branching strategy

| Branch type     | Naming convention                | Examples                             |
| --------------- | -------------------------------- | ------------------------------------ |
| **Main**        | `main`                           | Production-ready code                |
| **Development** | `develop`                        | Integration branch (current default) |
| **Feature**     | `feature/<ticket>/<description>` | `feature/DEM-129/task-description`   |
| **Bug fix**     | `bug/<ticket>/<description>`     | `bug/DEM-144/refine-asyncstatecards` |
| **Hotfix**      | `hotfix/<description>`           | `hotfix/missing-import`              |
| **Refactor**    | `refactor/<description>`         | `refactor/consolidate-query-keys`    |

### 4.5 Commit discipline

- **Conventional Commits** enforced via Commitlint (`@commitlint/config-conventional`)
- **Husky** git hooks enforce lint and format checks pre-commit
- Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`
- Header max length: 100 characters

### 4.6 Escrow readiness

For escrow purposes, the repository contains:

- Complete source code (TypeScript/Next.js)
- `package.json` + `package-lock.json` with pinned dependency versions
- `.env.example` documenting all required configuration
- `supabase/schema.sql` for database setup
- `CHANGELOG.md` documenting all notable changes (Keep a Changelog format)
- Build instructions in `README.md` (`npm ci`, `npm run build`, `npm run start`)
- Automated test suite (unit, integration, E2E) reproducible via `npm test` and `npm run e2e`

**Recommendation:** When cutting the first release, promote the `[Unreleased]` changelog section to a versioned entry and create a corresponding git tag (e.g., `v1.0.0`).

---

## 5. Secrets Management in CI/CD and Hosting

### 5.1 CI/CD pipeline

**File:** `.github/workflows/testing-pipeline.yaml`

The pipeline runs on **pull requests only** and performs: lint → format check → unit tests → coverage → build → E2E tests.

**Secrets in CI:** The pipeline uses **zero repository secrets**. The only environment variables injected are non-sensitive:

```yaml
env:
  CI: true
  PLAYWRIGHT_BASE_URL: http://127.0.0.1:3000
```

No `${{ secrets.* }}` or `${{ vars.* }}` references exist in any workflow file. The CI pipeline is purely a quality gate — it does not deploy or access production APIs.

### 5.2 Hosting (inferred from codebase)

The application is designed for **Vercel** deployment (Next.js, `VERCEL_URL` / `VERCEL_PROJECT_PRODUCTION_URL` references, `.vercel` in `.gitignore`).

- **Production secrets** (`JIRA_CLIENT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, etc.) are configured as **Vercel Environment Variables** in the hosting dashboard — never committed to the repository.
- Vercel provides automatic `VERCEL_URL` and `VERCEL_PROJECT_PRODUCTION_URL` at runtime.
- The `NEXT_PUBLIC_*` variables are embedded at build time by Next.js; non-public variables remain server-side only.

### 5.3 Database (Supabase)

- Supabase project credentials (`URL`, `ANON_KEY`, `SERVICE_ROLE_KEY`) are provisioned through the Supabase dashboard.
- The `SUPABASE_SERVICE_ROLE_KEY` is used **only** in server-side code (`createSupabaseServerClient`) — never exposed to the browser.
- OAuth tokens stored in Supabase are **encrypted at the application layer** (AES-256-GCM) before insertion.

### 5.4 Secret isolation summary

| Secret                          | Stored in repo? | How provided              | Server-only? |
| ------------------------------- | --------------- | ------------------------- | ------------ |
| `JIRA_CLIENT_SECRET`            | No              | Vercel env / `.env.local` | Yes          |
| `JIRA_CLIENT_ID`                | No              | Vercel env / `.env.local` | Yes          |
| `SUPABASE_SERVICE_ROLE_KEY`     | No              | Vercel env / `.env.local` | Yes          |
| `OPENAI_API_KEY`                | No              | Vercel env / `.env.local` | Yes          |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No              | Vercel env / `.env.local` | No (public)  |
| `NEXT_PUBLIC_SUPABASE_URL`      | No              | Vercel env / `.env.local` | No (public)  |

---

## 6. Summary of Findings

| Checklist item                        | Status   | Evidence                                                                                                         |
| ------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------- |
| Env usage patterns documented         | **Pass** | All vars accessed via `process.env` with runtime guards; `.env.example` committed                                |
| No hard-coded secrets                 | **Pass** | Full regex scan across TS/JS source — zero matches for credential patterns                                       |
| Encryption helpers in use             | **Pass** | AES-256-GCM encrypt/decrypt in `src/utils/encryption.ts`; Jira tokens encrypted at rest                          |
| Token encrypt/decrypt flow documented | **Pass** | OAuth → encrypt → Supabase → decrypt → in-memory only                                                            |
| Versioning process                    | **Pass** | Conventional commits + branching convention + `CHANGELOG.md` in place; git tags to be created with first release |
| CI/CD secrets management              | **Pass** | CI uses no secrets; production secrets live in Vercel dashboard, never in repo                                   |
