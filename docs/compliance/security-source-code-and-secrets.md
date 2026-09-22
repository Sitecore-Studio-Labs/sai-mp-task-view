# Security Evidence: Source Code & Secrets

> **Project:** sai-mp-jira-task-view (Next.js / TypeScript)
> **Generated:** 2026-07-08
> **Scope:** Environment variable usage, absence of hard-coded secrets, encryption helpers, versioning process, CI/CD secrets management.

**Related compliance docs:** [API endpoint inventory](./api-endpoint-inventory.md) · [Security testing & vulnerability management](./security-testing-and-vulnerability-management.md)

---

## 1. Environment Variable Usage Patterns

### 1.1 Loading mechanism

The application relies on **Next.js built-in `.env` loading** (`.env`, `.env.local`, `.env.development`, etc.). There is no custom `dotenv.config()` call or third-party env loader in application code. Variables are accessed exclusively through `process.env`.

### 1.2 Env template (`.env.example`)

A committed `.env.example` in each app documents required variables with placeholder values (`apps/jira/.env.example`, `apps/wrike/.env.example`):

| Variable                              | Purpose                                                                            | Scope           |
| ------------------------------------- | ---------------------------------------------------------------------------------- | --------------- |
| `NEXT_PUBLIC_APP_URL`                 | Public app URL for iframe/embed flows                                              | Client + Server |
| `DATABASE_URL`                        | Azure PostgreSQL connection string                                                 | Server only     |
| `JIRA_CLIENT_ID`                      | Jira OAuth 2.0 client ID                                                           | Server only     |
| `JIRA_CLIENT_SECRET`                  | Jira OAuth 2.0 client secret                                                       | Server only     |
| `JIRA_REDIRECT_URI`                   | Jira OAuth callback URL                                                            | Server only     |
| `JIRA_WEBHOOK_SECRET`                 | Jira webhook HMAC secret (optional)                                                | Server only     |
| `WRIKE_CLIENT_ID`                     | Wrike OAuth 2.0 client ID                                                          | Server only     |
| `WRIKE_CLIENT_SECRET`                 | Wrike OAuth 2.0 client secret; also encryption key fallback for Wrike-only deploys | Server only     |
| `WRIKE_REDIRECT_URI`                  | Wrike OAuth callback URL                                                           | Server only     |
| `WRIKE_WEBHOOK_SECRET`                | Wrike webhook secret (optional)                                                    | Server only     |
| `AZURE_WEBPUBSUB_CONNECTION_STRING`   | Azure Web PubSub connection string for real-time push (optional)                   | Server only     |
| `NEXT_PUBLIC_APP_VERSION`             | Build/version label (optional)                                                     | Client          |
| `NEXT_PUBLIC_ENABLE_CONSOLE_LOGGING`  | Force console logging in production                                                | Client          |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID`       | Google Analytics 4 measurement ID                                                  | Client          |
| `OTEL_EXPORTER_OTLP_ENDPOINT`         | OTLP trace exporter endpoint                                                       | Server only     |
| `OTEL_EXPORTER_OTLP_HEADERS`          | OTLP exporter auth headers                                                         | Server only     |
| `LOG_LEVEL`                           | Pino log level                                                                     | Server only     |
| `NEXT_PUBLIC_ENABLE_AI_TASK_CREATION` | Feature flag for AI task breakdown                                                 | Client          |
| `OPENAI_API_KEY`                      | OpenAI API key (optional)                                                          | Server only     |

Additional runtime variables (`VERCEL_URL`, `VERCEL_PROJECT_PRODUCTION_URL`, `CI`, `PLAYWRIGHT_BASE_URL`) are platform-provided or CI-only and do not appear in `.env.example`.

### 1.3 Validation strategy

Each app validates its server environment at startup through a **Zod schema** in `apps/<app>/src/lib/config.ts`, evaluated by `validateEnv` from `@mp/shared`. Required variables (`DATABASE_URL`, OAuth client credentials, redirect URI) fail fast with a readable error; optional variables (`JIRA_WEBHOOK_SECRET` / `WRIKE_WEBHOOK_SECRET`, `AZURE_WEBPUBSUB_CONNECTION_STRING`, `OPENAI_API_KEY`) are declared `.optional()` so the app boots without them and degrades gracefully.

Remaining `process.env` accesses outside the schema are **guarded at runtime** with explicit null/empty checks and descriptive error messages:

- **Server errors (throw / 500):** Platform adapter constructors, `encryption.ts getEncryptionKey()`, OAuth callback/connect routes.
- **Server degradation (503 / no-op):** Negotiate routes return 503 and webhook handlers skip publishing when `AZURE_WEBPUBSUB_CONNECTION_STRING` is absent; the UI falls back to polling `/api/<platform>/sync-signal`.
- **Client warnings (graceful degradation):** AI feature flag defaults to `false`.

### 1.4 Files that access `process.env`

| File                                                       | Variables used                                                             |
| ---------------------------------------------------------- | -------------------------------------------------------------------------- |
| `libs/shared/src/lib/encryption.ts`                        | `ENCRYPTION_KEY`, `JIRA_CLIENT_SECRET`, `WRIKE_CLIENT_SECRET`              |
| `apps/jira/src/platforms/jira/JiraAdapter.ts`              | `JIRA_CLIENT_ID`, `JIRA_CLIENT_SECRET`                                     |
| `apps/jira/src/lib/config.ts`                              | Zod schema — all Jira app server vars (see §1.2)                           |
| `apps/wrike/src/lib/config.ts`                             | Zod schema — all Wrike app server vars (see §1.2)                          |
| `apps/wrike/src/lib/authStrategy.ts`                       | `WRIKE_CLIENT_ID`, `WRIKE_CLIENT_SECRET`, `WRIKE_REDIRECT_URI` (via `env`) |
| `apps/jira/src/app/api/jira/negotiate/route.ts`            | `AZURE_WEBPUBSUB_CONNECTION_STRING` (via `env`)                            |
| `apps/wrike/src/app/api/wrike/negotiate/route.ts`          | `AZURE_WEBPUBSUB_CONNECTION_STRING` (via `env`)                            |
| `apps/jira/src/app/api/webhooks/jira/route.ts`             | `JIRA_WEBHOOK_SECRET`, `AZURE_WEBPUBSUB_CONNECTION_STRING` (via `env`)     |
| `apps/wrike/src/app/api/webhooks/wrike/route.ts`           | `WRIKE_WEBHOOK_SECRET`, `AZURE_WEBPUBSUB_CONNECTION_STRING` (via `env`)    |
| `src/lib/ai-openai.ts`                                     | `OPENAI_API_KEY`                                                           |
| `src/app/api/auth/jira/connect/route.ts`                   | `JIRA_CLIENT_ID`, `JIRA_REDIRECT_URI`                                      |
| `src/app/api/auth/jira/callback/route.ts`                  | `JIRA_REDIRECT_URI`                                                        |
| `src/app/api/jira/webhooks/route.ts`                       | `NEXT_PUBLIC_APP_URL`, `VERCEL_URL`, `VERCEL_PROJECT_PRODUCTION_URL`       |
| `src/app/api/ai/parse-requirements/route.ts`               | `OPENAI_API_KEY`                                                           |
| `src/components/tasks/CreateTaskView.tsx`                  | `NEXT_PUBLIC_ENABLE_AI_TASK_CREATION`                                      |
| `src/hooks/useClientOriginUrl.ts`                          | `NEXT_PUBLIC_APP_URL`                                                      |
| `src/hooks/useOAuthPopupHandler.ts`                        | `NEXT_PUBLIC_APP_URL`                                                      |
| `src/providers/auth-providers/JiraAuthFailureProvider.tsx` | `NEXT_PUBLIC_APP_URL`                                                      |
| `apps/jira-e2e/playwright.config.ts`                       | `CI`, `PLAYWRIGHT_BASE_URL`                                                |

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

**File:** `libs/shared/src/lib/encryption.ts`

- **Algorithm:** AES-256-GCM (authenticated encryption)
- **Key derivation:** `SHA-256(ENCRYPTION_KEY ?? JIRA_CLIENT_SECRET ?? WRIKE_CLIENT_SECRET)` → 32-byte key
- **IV:** 12-byte random per encryption (`crypto.randomBytes(12)`)
- **Output format:** `base64(IV ‖ AuthTag ‖ Ciphertext)`
- **Library:** Node.js built-in `crypto` (no third-party dependencies)

Exports two functions: `encrypt(plainText: string): string` and `decrypt(cipherText: string): string`.

### 3.2 Where tokens are encrypted (write path)

| Step                   | File                                                                | Detail                                                                                      |
| ---------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| OAuth exchange + store | `libs/token-storage/src/PostgresTokenStore.ts` → `saveConnection()` | Calls `encrypt()` on access and refresh tokens for `jira_connections` / `wrike_connections` |
| Token refresh          | Platform `authStrategy.getValidToken()`                             | Re-saves rotated tokens via `saveConnection()`                                              |

### 3.3 Where tokens are decrypted (read path)

| Consumer             | File                                      | Detail                                                  |
| -------------------- | ----------------------------------------- | ------------------------------------------------------- |
| Connection retrieval | `PostgresTokenStore.getConnection()`      | Decrypts tokens; on failure marks connection `inactive` |
| Wrike API context    | `apps/wrike/src/services/wrikeService.ts` | Loads connection via token store before adapter calls   |

### 3.4 Database schema

**File:** `db/schema.sql`

```sql
-- jira_connections / wrike_connections store encrypted tokens
access_token_encrypted  TEXT NOT NULL,
refresh_token_encrypted TEXT  -- nullable for Wrike when no refresh token
```

### 3.5 End-to-end token lifecycle

```
Platform OAuth → plaintext token
    ↓
encrypt(accessToken) + encrypt(refreshToken)
    ↓
Azure PostgreSQL jira_connections / wrike_connections (encrypted at rest in DB columns)
    ↓
SELECT access_token_encrypted
    ↓
decrypt(ciphertext) → plaintext used in-memory for Bearer header
    ↓
Never persisted in plaintext; only transmitted over HTTPS to platform APIs
```

### 3.6 Session tokens

`jira_sessions.session_token` and `wrike_sessions.session_token` are generated with `crypto.randomBytes(32).toString("hex")` (cryptographically random) but stored in plaintext in Azure PostgreSQL. Session cookies are HTTP-only (`jira_session_token` / `wrike_session`).

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
- `db/schema.sql` for database setup
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

- **Production secrets** (`JIRA_CLIENT_SECRET`, `DATABASE_URL`, `OPENAI_API_KEY`, etc.) are configured as **Vercel Environment Variables** in the hosting dashboard — never committed to the repository.
- Vercel provides automatic `VERCEL_URL` and `VERCEL_PROJECT_PRODUCTION_URL` at runtime.
- The `NEXT_PUBLIC_*` variables are embedded at build time by Next.js; non-public variables remain server-side only.

### 5.3 Database (Azure PostgreSQL)

- `DATABASE_URL` is provisioned through Azure Database for PostgreSQL and stored as a server-only environment variable.
- OAuth tokens stored in Azure PostgreSQL are **encrypted at the application layer** (AES-256-GCM) before insertion.

### 5.4 Real-time messaging (Azure Web PubSub)

- `AZURE_WEBPUBSUB_CONNECTION_STRING` contains the Web PubSub endpoint and access key, and is stored as a server-only environment variable. It is **optional** — when absent, both apps fall back to polling `/api/<platform>/sync-signal`.
- The connection string never reaches the browser. `/api/jira/negotiate` and `/api/wrike/negotiate` require a valid platform session and return only a **short-lived client access URL** minted server-side via `getClientAccessToken()`.
- Client tokens are scoped: the Jira token grants `webpubsub.joinLeaveGroup` (browser joins the group named after the active project key), the Wrike token grants `webpubsub.joinLeaveGroup.wrike_events` and is pre-joined to that single group.
- Published payloads contain only issue/task identifiers and event type — no OAuth tokens and no personal data.

### 5.5 Secret isolation summary

| Secret                              | Stored in repo? | How provided              | Server-only? |
| ----------------------------------- | --------------- | ------------------------- | ------------ |
| `JIRA_CLIENT_SECRET`                | No              | Vercel env / `.env.local` | Yes          |
| `WRIKE_CLIENT_SECRET`               | No              | Vercel env / `.env.local` | Yes          |
| `WRIKE_CLIENT_ID`                   | No              | Vercel env / `.env.local` | Yes          |
| `DATABASE_URL`                      | No              | Vercel env / `.env.local` | Yes          |
| `OPENAI_API_KEY`                    | No              | Vercel env / `.env.local` | Yes          |
| `AZURE_WEBPUBSUB_CONNECTION_STRING` | No              | Vercel env / `.env.local` | Yes          |

---

## 6. Summary of Findings

| Checklist item                        | Status   | Evidence                                                                                                         |
| ------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------- |
| Env usage patterns documented         | **Pass** | Per-app Zod schema in `src/lib/config.ts` plus runtime guards; `.env.example` committed                          |
| No hard-coded secrets                 | **Pass** | Full regex scan across TS/JS source — zero matches for credential patterns                                       |
| Encryption helpers in use             | **Pass** | AES-256-GCM encrypt/decrypt in `libs/shared/src/lib/encryption.ts`; platform tokens encrypted at rest            |
| Token encrypt/decrypt flow documented | **Pass** | OAuth → encrypt → Azure PostgreSQL → decrypt → in-memory only                                                    |
| Versioning process                    | **Pass** | Conventional commits + branching convention + `CHANGELOG.md` in place; git tags to be created with first release |
| CI/CD secrets management              | **Pass** | CI uses no secrets; production secrets live in Vercel dashboard, never in repo                                   |
