# Task Management Marketplace Extension (Jira Integration)

Task Management Marketplace Extension is a Next.js + TypeScript application built as a Sitecore AI Page Builder Context Panel extension. It enables users to connect to Jira Cloud, view and manage Jira tasks directly within the Marketplace app, and perform core task operations — all without leaving the Sitecore context.

This project is designed with scalability in mind, using modern patterns including:

- Adapter pattern for platform extensibility
- Axios with interceptors to handle automatic OAuth token refresh
- TanStack Query (React Query) for data fetching and caching
- Supabase for persistent storage of Jira connection metadata
- Next.js API routes for secure server-side integrations

## Tech stack

- **Next.js** (App Router), **TypeScript**
- **TanStack Query** for data fetching
- **Axios** with interceptors for auth and token refresh
- **Supabase** for storing encrypted Jira tokens (optional)

## Project setup

**Node.js:** GitHub Actions use **`actions/checkout@v6`**, **`actions/setup-node@v6`**, and **Node.js 24** for installs/builds (official actions target Node 24; see [Actions runner updates](https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/)). For local development, **20 LTS or 24+** is fine (see `engines` in `package.json`). Use **24** locally if you want parity with CI (`nvm install 24`, `fnm use 24`, etc.).

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env.local` and set:

| Variable                        | Description                                                        |
| ------------------------------- | ------------------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL                                               |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key                                                  |
| `SUPABASE_SERVICE_ROLE_KEY`     | Supabase service role key (server only)                            |
| `JIRA_CLIENT_ID`                | Atlassian OAuth app client ID                                      |
| `JIRA_CLIENT_SECRET`            | Atlassian OAuth app client secret                                  |
| `JIRA_REDIRECT_URI`             | Callback URL (e.g. `http://localhost:3000/api/auth/jira/callback`) |
| `NEXT_PUBLIC_APP_URL`           | App URL when embedded (e.g. `http://localhost:3000`)               |

Create a Jira OAuth 2.0 (3LO) app in the [Atlassian Developer Console](https://developer.atlassian.com/console/myapps/) and add the same callback URL under Authorization.

### 3. Supabase database

In the [Supabase Dashboard](https://supabase.com/dashboard) → **SQL Editor**, run the contents of `supabase/schema.sql` to create the `jira_connections` and `sync_logs` tables.

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The Jira extension UI is at [http://localhost:3000/task-manager-extension](http://localhost:3000/task-manager-extension).

## Scripts

- `npm run dev` – start development server
- `npm run build` – build for production
- `npm run start` – start production server
- `npm run lint` – run ESLint

## Commits

This project uses [Husky](https://typicode.github.io/husky/) and [Commitlint](https://commitlint.js.org/) to enforce [Conventional Commits](https://www.conventionalcommits.org/):

- **Pre-commit:** runs `lint-staged` (ESLint on staged `.js`, `.jsx`, `.ts`, `.tsx` files).
- **Commit-msg:** validates the commit message format.

Example: `feat: add Jira connect button`, `fix: resolve callback redirect`, `chore: update deps`.

## DevSecOps and security scanning

GitHub Actions run the **Testing Pipeline** (dependency audit, license allow-list, CycloneDX SBOM artifact, lint, tests, build, E2E) on every PR; **Gitleaks** on every PR and on pushes to `main` (git history scan); plus **Snyk** for Open Source (SCA) and **Snyk Code** (SAST) on path-filtered PRs, **`snyk monitor`** on `main`, and an optional **`snyk fix`** PR workflow. Optional **local** Snyk (pre-commit script, CLI) reduces CI quota use.

Official references:

- [Snyk GitHub Actions](https://docs.snyk.io/developer-tools/snyk-ci-cd-integrations/github-actions-for-snyk-setup-and-checking-for-vulnerabilities)
- [`snyk monitor`](https://docs.snyk.io/developer-tools/snyk-cli/commands/monitor)
- [Snyk in CI/CD](https://snyk.io/blog/building-a-secure-pipeline-with-github-actions/)
- [Gitleaks](https://github.com/gitleaks/gitleaks) — [install](https://github.com/gitleaks/gitleaks#installing) / [releases](https://github.com/gitleaks/gitleaks/releases); local check: `gitleaks detect --source . --redact` (same idea as `security-secrets.yml`)

### GitHub secret: `SNYK_TOKEN`

1. Create or log in to a [Snyk](https://snyk.io/) account (free tier is enough for this layout).
2. In Snyk: **Account settings** → **Auth token** → copy the token.
3. In GitHub: repository **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.
4. Name: `SNYK_TOKEN`, value: paste token, save.

**Fork PR caveat:** GitHub does not pass repository secrets to workflows from forked pull requests. The PR Snyk workflow skips those runs so jobs do not fail on a missing token; use same-repo branches for automated Snyk gates, or rely on maintainers’ local scans.

### Snyk in VS Code (developer, no CI minutes)

1. Install the [Snyk Security extension](https://marketplace.visualstudio.com/items?itemName=snyk-security.snyk-vulnerability-scanner) in VS Code.
2. Sign in with Snyk when prompted (links the IDE to your org and applies your policies).
3. Use the Snyk panel for inline issues, **Open Source** (dependencies) and **Code** (SAST) where enabled for your plan.

This shifts findings **left** and reduces how often you need remote `snyk test` / `snyk code test` in CI.

### Snyk CLI locally

Install the CLI from [Install the Snyk CLI](https://docs.snyk.io/snyk-cli/install-the-snyk-cli), then authenticate once:

```bash
snyk auth
# or export SNYK_TOKEN=... in your shell for non-interactive environments
```

Typical commands for this Next.js app (repository root):

```bash
npm ci
snyk test --severity-threshold=high
snyk code test --severity-threshold=high
```

Optional remediation (review diffs before commit):

```bash
snyk fix
```

### Optional pre-commit Snyk hook

If `package.json` or `package-lock.json` is staged, `.husky/pre-commit` runs `scripts/snyk-precommit.sh`, which executes `snyk test --severity-threshold=high` **only when** the `snyk` CLI is installed **and** `snyk auth` / `SNYK_TOKEN` is configured. Otherwise it prints a skip message and continues.

- Skip for one commit: `SKIP_SNYK_PRECOMMIT=1 git commit ...`

### CI/CD workflows (`.github/workflows`)

| Workflow                      | When it runs                                                                                                   | What it does                                                                                                                                                                         |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `testing-pipeline.yaml`       | Every PR (opened / synchronize / reopened)                                                                     | `npm run audit`, license allow-list, CycloneDX SBOM upload, lint, format, unit tests + coverage, build, Playwright E2E                                                               |
| `security-pr.yml`             | PRs touching manifests or sensitive Next.js surfaces                                                           | `snyk test` + `snyk code test`, **fail on ≥ HIGH** (`SNYK_TOKEN`; skips fork PRs)                                                                                                    |
| `security-monitor.yml`        | Push to `main`                                                                                                 | `snyk monitor --all-projects` (continuous tracking; does not re-gate severity on `main`)                                                                                             |
| `security-dependency-fix.yml` | Manual [`workflow_dispatch`](https://docs.github.com/actions/using-workflows/manually-running-a-workflow) only | `snyk fix` (continue-on-error) then opens a PR only if the manifest/lockfile changed                                                                                                 |
| `security-secrets.yml`        | Every PR; push to `main`                                                                                       | [Gitleaks](https://github.com/gitleaks/gitleaks) `detect` on full history (official release binary; no `GITLEAKS_LICENSE` needed vs `gitleaks/gitleaks-action@v2` on some org plans) |

**Path filters (Snyk PR workflow):** `package.json`, `package-lock.json`, `src/app/api/**`, `src/app/auth/**`, and Next middleware files — the App Router equivalent of `/api/**`, `/auth/**`, and `/middleware/**`. Adjust globs in `security-pr.yml` if you relocate routes.

**Performance:** Snyk PR workflow uses `paths` filters, `npm` cache via `actions/setup-node`, `concurrency` groups to cancel obsolete runs, and separates **monitor** (snapshot on `main`) from **test** (gate on qualifying PRs) so merges to `main` do not repeat full Snyk scans.

**Pinning actions:** For maximum supply-chain hygiene, replace floating Snyk action refs (`@master`) with a commit SHA from [snyk/actions](https://github.com/snyk/actions) after a deliberate upgrade.

### Estimated monthly Snyk CLI usage (rough order of magnitude)

Assumptions: `main` sees ~20 merges/month, ~15 qualifying PRs/month (path-filtered Snyk workflow), no heavy manual `workflow_dispatch` on dependency-fix, no extra scheduled/release workflows in this repo.

| Trigger             | Approx. runs/month | Commands per run                               |
| ------------------- | ------------------ | ---------------------------------------------- |
| PR (path-filtered)  | ~15                | `snyk test` + `snyk code test` (HIGH+)         |
| Push `main` monitor | ~20                | `snyk monitor` only (not a failing gate)       |
| Manual fix workflow | occasional         | `snyk fix` (then PR if lockfile/manifest diff) |

Free-tier limits change over time; treat this as **planning guidance** — the design minimizes noise via **paths**, **monitor vs test split**, and **developer IDE/CLI** use. Add separate scheduled or release workflows if your org needs deeper cadence beyond path-filtered PRs.

### Security coverage summary

- **SCA (CI):** `npm run audit` + allow-listed licenses + SBOM on every PR (`testing-pipeline.yaml`); **Snyk Open Source** `snyk test` (HIGH+) on path-filtered PRs; **`snyk monitor`** on `main`; optional **`snyk fix`** PR workflow.
- **SAST (CI):** `snyk code test` (HIGH+) on the same path-filtered PRs as Snyk Open Source (`security-pr.yml`).
- **Secrets in history:** [Gitleaks](https://github.com/gitleaks/gitleaks) in CI (`security-secrets.yml`) on PRs and `main` pushes. GitHub [secret scanning](https://docs.github.com/code-security/secret-scanning/about-secret-scanning) applies when enabled for the org/repo.
