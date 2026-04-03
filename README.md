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

This repository uses **Snyk** (SCA + SAST) and **Gitleaks** (secrets) in GitHub Actions, plus optional **local** checks so developers catch issues before CI uses quota.

Official references:

- [Snyk GitHub Actions](https://docs.snyk.io/developer-tools/snyk-ci-cd-integrations/github-actions-for-snyk-setup-and-checking-for-vulnerabilities)
- [`snyk monitor`](https://docs.snyk.io/developer-tools/snyk-cli/commands/monitor)
- [Snyk in CI/CD](https://snyk.io/blog/building-a-secure-pipeline-with-github-actions/)

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

| Workflow                      | When it runs                                           | What it does                                                                                                      |
| ----------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `security-pr.yml`             | PRs touching manifests or sensitive Next.js surfaces   | `snyk test` + `snyk code test`, **fail on ≥ HIGH**                                                                |
| `security-release.yml`        | Published GitHub Release; optional `workflow_dispatch` | `snyk test --all-projects` + `snyk code test` (HIGH+); dispatch can run `snyk fix` before scans                   |
| `security-monitor.yml`        | Push to `main`                                         | `snyk monitor --all-projects` (continuous tracking; does not re-gate severity on main)                            |
| `security-scheduled.yml`      | Weekly (Sunday 00:00 UTC) + manual                     | `snyk test --all-projects`, `snyk code test` (HIGH+)                                                              |
| `security-secrets.yml`        | PRs and pushes to `main`                               | **Gitleaks** CLI full-history `detect` (no `GITLEAKS_LICENSE`; official Action v2 requires one for **org** repos) |
| `security-dependency-fix.yml` | Manual only                                            | `snyk fix` then opens a PR via `peter-evans/create-pull-request`                                                  |

**Path filters (PR):** Workflows target `package.json`, `package-lock.json`, `src/app/api/**`, `src/app/auth/**`, and Next middleware files — the App Router equivalent of `/api/**`, `/auth/**`, and `/middleware/**`. Adjust globs in `security-pr.yml` if you relocate routes.

**Performance:** PR workflow uses `paths` filters, `npm` cache via `actions/setup-node`, `concurrency` groups to cancel obsolete runs, and separates **monitor** (snapshot) from **test** (gate) so merges to `main` do not repeat full PR scans.

**Pinning actions:** For maximum supply-chain hygiene, replace floating Snyk action refs (`@master`) with a commit SHA from [snyk/actions](https://github.com/snyk/actions) after a deliberate upgrade.

### Estimated monthly Snyk CLI “test” usage (rough order of magnitude)

Assumptions: `main` sees ~20 merges/month, ~15 qualifying PRs/month (path-filtered), 1 weekly deep run (4×), 1 release/month, no manual fix spam.

| Trigger             | Approx. runs/month | Commands per run (Open Source + SAST)         |
| ------------------- | ------------------ | --------------------------------------------- |
| PR (path-filtered)  | ~15                | `test` + `code test` ≈ 30 command invocations |
| Push `main` monitor | ~20                | `monitor` only (not a failing gate)           |
| Weekly deep         | 4                  | `test` + `code test`                          |
| Release published   | 1–2                | `test --all-projects` + `code test`           |

Free-tier limits change over time; treat this as **planning guidance** — the design minimizes noise via **paths**, **monitor vs test split**, and **developer IDE/CLI** use. Tune schedules and triggers if you approach quota.

### Security coverage summary

- **SCA:** `snyk test` / `snyk monitor` (dependencies, license posture via Snyk UI).
- **SAST:** `snyk code test` on PR (targeted), release, and weekly schedules.
- **Secrets:** Gitleaks CLI on every PR and on `main` pushes (OSS binary in CI, not `gitleaks/gitleaks-action@v2`).
