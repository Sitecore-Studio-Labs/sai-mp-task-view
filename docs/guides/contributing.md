# Contributing Guide

## One-time local setup

### 1. Clone and install

```bash
git clone <repo-url>
cd sai-mp-jira-task-view
npm install
```

### 2. Opt into the recommended git config

The repo ships a `.gitconfig` file that configures rebase-on-pull, auto-stash,
and verbose commit messages. Apply it without touching your global git config:

```bash
git config include.path ../.gitconfig
```

Verify it took effect:

```bash
git config pull.rebase   # should print: true
git config merge.ff      # should print: only
```

---

## Branching strategy

This repo uses a **simplified GitFlow** model: all daily work targets `develop`;
`main` is only ever touched by a release.

```text
main       ←── develop (release PR)
               │
               ├── feat/jira-priority-filter
               ├── fix/token-refresh-race
               └── chore/nx-20-upgrade
```

| Branch               | Purpose                                                               |
| -------------------- | --------------------------------------------------------------------- |
| `main`               | Production-ready. Every commit is a released version tagged `vX.Y.Z`. |
| `develop`            | Integration branch. All feature/fix PRs target this branch.           |
| `feat/*`, `fix/*`, … | Short-lived work branches, always branched from `develop`.            |

| Rule                                       | Detail                                                                           |
| ------------------------------------------ | -------------------------------------------------------------------------------- |
| Never push directly to `main` or `develop` | Everything goes through a PR.                                                    |
| Branch from `develop`, not `main`          | `main` only reflects released state; branching from it skips unreleased changes. |
| Keep branches short-lived                  | Aim for < 2 days. Long branches → painful rebases.                               |
| One concern per branch                     | Mixed changes produce unclear changelogs and harder reviews.                     |

### Branch naming

```text
<type>/<short-description>

feat/wrike-adapter
fix/create-task-422
chore/update-nx-deps
refactor/platform-adapter-types
docs/shadowing-guide
```

---

## Commit format and PR title

Commits are validated by Commitlint on every commit. Non-conforming commits
are rejected by the pre-commit hook. With **squash & merge**, the PR title becomes the single commit on `develop`
that `nx release` reads for versioning and changelog generation. Individual
commit messages within a branch are still validated by Commitlint locally, but
the **PR title is the canonical input** — get that right and the release takes
care of itself.

```text
<type>(<optional scope>): <short description>

[optional body]

[optional footer — BREAKING CHANGE: ..., Closes #123]
```

### Types

| Type       | When to use                          | Changelog entry  |
| ---------- | ------------------------------------ | ---------------- |
| `feat`     | New capability visible to users      | Yes (minor bump) |
| `fix`      | Bug fix                              | Yes (patch bump) |
| `perf`     | Performance improvement              | Yes (patch bump) |
| `revert`   | Reverting a previous commit          | Yes (patch bump) |
| `refactor` | Code change with no behaviour change | No               |
| `style`    | Formatting, whitespace only          | No               |
| `test`     | Adding or fixing tests only          | No               |
| `docs`     | Documentation only                   | No               |
| `chore`    | Tooling, deps, config, CI            | No               |
| `build`    | Changes to the build system          | No               |
| `ci`       | Changes to CI workflows              | No               |

### Scopes (optional but recommended)

Use the affected package or area: `jira`, `ui`, `task-core`, `shared`, `ai`, `release`, `ci`.

### Examples

```text
feat(jira): add priority filter to task list

fix(ui): correct assignee avatar overflow on narrow panels

refactor(task-core): extract BasePlatformAdapter to separate file

feat!: rename PlatformCapabilities.richText to richTextFormat

BREAKING CHANGE: consumers of usePlatformCapabilities must update
the field reference from richText to richTextFormat.
```

Breaking changes use `!` after the type and a `BREAKING CHANGE:` footer.
They trigger a **major** version bump in the semi-automated release.

---

## Day-to-day workflow

### Starting new work

```bash
git checkout develop
git pull                         # rebases by default (from .gitconfig)
git checkout -b feat/my-feature
```

### Keeping your branch current

```bash
# While on your feature branch:
git fetch origin
git rebase origin/develop
```

If there are conflicts, resolve them file by file, then `git rebase --continue`.
Prefer `git rebase` over `git merge develop` to keep your branch history clean
and make the final squash commit easier to read.

### Before opening a PR

```bash
git fetch origin
git rebase origin/develop        # ensure you're on top of latest develop
npx nx affected --target=lint --base=origin/develop
npx nx affected --target=test --base=origin/develop
```

### Merging the PR (feature → develop)

Use **"Squash and merge"** on GitHub. GitHub creates one commit on `develop`
whose subject line is the PR title. This is the commit `nx release` reads when
generating the changelog and determining the version bump — so the PR title
must follow conventional commit format (enforced automatically by the
`pr-title.yml` CI check).

### Cutting a release (develop → main)

Open a PR from `develop` → `main`. Title it anything descriptive (e.g.
`release v1.2.0`) — this PR is exempt from the PR title lint check. Once CI
passes, merge it using **"Rebase and merge"** so each develop commit (one per
squashed feature PR) lands on `main` individually.

The release is **semi-automated** — see [Release Guidelines](release-guidelines.md) for the full process. In brief:

1. **Phase 1 (automatic):** on merge to `main`, `release-draft.yml` bumps the version, generates the changelog, and pushes a `release/vX.Y.Z` draft branch — no tag or GitHub Release yet.
2. **Phase 2 (manual):** the release owner reviews and optionally edits the draft, then triggers `release-publish.yml` to tag, publish, sync `develop`, and clean up the branch.

---

## GitHub repository settings (configure once, per repo)

These cannot be configured from code — a repo admin must set them once:

**Settings → Branches → Branch protection rule for `develop`:**

| Setting                                                                                                            | Value                                    |
| ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| Require a pull request before merging                                                                              | ✓                                        |
| Require status checks to pass — add: `Lint, Test, Build (nx affected)`, `Validate PR title (conventional commits)` | ✓ — see see [CI E2E](#ci-e2e-playwright) |
| Require branches to be up to date before merging                                                                   | ✓                                        |
| Do not allow bypassing the above settings                                                                          | ✓                                        |

**Settings → Branches → Branch protection rule for `main`:**

| Setting                                                                               | Value |
| ------------------------------------------------------------------------------------- | ----- |
| Require a pull request before merging                                                 | ✓     |
| Require status checks to pass (same checks as develop)                                | ✓     |
| Restrict who can push — allow only the release bot (`github-actions[bot]`) and admins | ✓     |
| Do not allow bypassing the above settings                                             | ✓     |

**Settings → General → Pull Requests:**

| Setting                            | Value                                                                                |
| ---------------------------------- | ------------------------------------------------------------------------------------ |
| Allow merge commits                | ✗ (uncheck)                                                                          |
| Allow squash merging               | ✓ — used for feature → develop                                                       |
| Allow rebase merging               | ✓ — used for develop → main release PRs                                              |
| Default merge strategy             | Set to **Squash and merge** so developers don't have to remember to choose correctly |
| Automatically delete head branches | ✓                                                                                    |

---

## CI E2E (Playwright)

> **Status:** Playwright E2E runs in GitHub Actions via the **`E2E (nx affected)`** job in `.github/workflows/testing-pipeline.yaml`. Test sources live under `apps/jira-e2e/`; the Nx `e2e` target is on the **`jira`** project (`nx run jira:e2e`) and points at `apps/jira-e2e/playwright.config.ts`. CI runs E2E when `jira` is affected (including changes under `apps/jira-e2e/` via `implicitDependencies`).

### How CI E2E works

- Uses the official `mcr.microsoft.com/playwright:v1.60.0-jammy` container image so browsers and system dependencies are pre-installed (avoids a cold `playwright install --with-deps`, which can take 15–20+ minutes on GitHub-hosted runners).
- Builds affected apps, then runs `nx affected --target=e2e` for projects with an `e2e` target (for Jira, that is always the `jira` project, not `jira-e2e`).
- The `jira` project lists `jira-e2e` in `implicitDependencies` so edits to E2E scenarios still trigger `jira:e2e` in affected runs.
- The job is skipped when no affected project has an `e2e` target.

### Run E2E locally

```bash
npm run build
npm run e2e
# or: npx nx run jira:e2e
```

### Branch protection

Add **`E2E (nx affected)`** as a required status check on `develop` / `main` alongside lint, test, and build.

---

## Releases (semi-automated)

Releases use a two-phase semi-automated process. For the full reference see
**[Release Guidelines](release-guidelines.md)**.

### Summary

1. **Phase 1 — automatic** (triggered by merge to `main`): `release-draft.yml`
   determines the next version from conventional commit types, bumps
   `package.json`, generates `CHANGELOG.md`, and pushes a `release/vX.Y.Z` draft
   branch. No tag or GitHub Release is created yet.

2. **Phase 2 — manual** (triggered by the release owner): after reviewing and
   optionally editing the draft branch on GitHub, go to
   **Actions → Release — Publish → Run workflow**, enter the version, and click
   **Run workflow**. This tags the commit, creates the GitHub Release, syncs
   `develop`, and deletes the draft branch.

---

## Code ownership

`.github/CODEOWNERS` auto-assigns required reviewers when a PR touches high-impact paths. **GitHub will block the merge button** until all listed owners approve — this is not optional.

Paths that require review before merging:

| Path                                 | Why it's protected                                                        |
| ------------------------------------ | ------------------------------------------------------------------------- |
| `libs/ui/`                           | Shared components — a regression affects every platform simultaneously    |
| `libs/task-core/src/types/`          | Interface changes require every adapter to update                         |
| `libs/auth/`, `libs/token-storage/`  | Shared auth infrastructure — bugs break every OAuth flow                  |
| `capabilities/capability-flags.json` | Flag changes affect all apps, the TypeScript interface, and the generator |
| `tools/generators/`                  | Template changes affect every platform scaffolded going forward           |
| `db/`                                | Schema changes are irreversible in production                             |
| `.github/`                           | Workflow changes can silently disable safety checks for the whole team    |

If you're a new owner being added, your GitHub username must be added to `.github/CODEOWNERS`.

---

## Error handling conventions

All adapter errors must be surfaced as `PlatformApiError` instances so the shared route helpers can translate them to the correct HTTP status code.

### Error hierarchy

```text
Error
└── PlatformApiError          (@mp/task-core)  — base for all adapter failures
    └── JiraClientError       (apps/jira)      — Jira-specific subclass
```

`PlatformApiError` carries `statusCode`, optional `platformCode` (the raw platform error code string), and optional `fieldErrors` (a record of field-level validation errors).

### Rules

1. **Use `BasePlatformAdapter.handleError` in raw adapter catch blocks.** It re-throws `PlatformApiError` as-is, wraps Axios errors (preserving the HTTP status), and wraps plain `Error` into a 500 `PlatformApiError`. Never swallow errors silently.

2. **Parse platform-specific error envelopes in `src/lib/extractPlatformError.ts`.** Each platform has its own error response shape. Write a `throwPlatformApiError(responseData, statusCode)` helper that parses the platform's error envelope and throws the correct `PlatformApiError` subclass.

3. **Do not add new `instanceof JiraClientError` checks in shared code.** The shared route helper `platformRoute.ts` checks for `PlatformApiError` — any subclass is caught automatically.

4. **Do not import `JiraClientError` (or any platform subclass) from `libs/`.** Platform-specific error types live in `apps/<platform>/` and must not leak into shared libraries.

### Example pattern

```ts
// In JiraAdapter.ts — raw HTTP layer
catch (err) {
  BasePlatformAdapter.handleError(err); // re-throws as PlatformApiError
}

// In extractPlatformError.ts — parse Jira's error envelope
export function throwJiraApiError(data: unknown, status: number): never {
  const { message, fieldErrors } = extractJiraError(data);
  throw new JiraClientError(message, status, undefined, fieldErrors);
}
```

See [error-handling.md](error-handling.md) for the full reference.

---

## NX cheat sheet

```bash
# Run a target on all projects
npx nx run-many --target=build

# Run a target only on projects changed since main
npx nx affected --target=test --base=origin/main

# Visualise the project dependency graph
npx nx graph

# Show what is affected by the current branch
npx nx affected:graph --base=origin/main

# Generate a new platform app from a capability YAML
npx nx g @mp/generators:platform-app --name=trello --yamlFile=capabilities/trello.yaml

# Add a new capability flag across all the right places
node tools/add-capability.js hasWorklog "Platform supports time-tracking on tasks."

# Per-platform health checks
npx nx run jira:audit-capabilities
npx nx run jira:check-sync
npx nx run jira:sync-capabilities      # after editing capabilities/jira.yaml
npx nx run jira:check-template-drift   # see what drifted from generator templates
npx nx run jira:generate-mappings      # regenerate normalizers from capabilities/jira.api.yaml
npx nx run jira:validate-mappings      # CI guard — exits 1 if generated files drifted
npx nx run jira:validate-http-adapter  # CI guard — exits 1 if adapter interface is incomplete
npx nx run jira:audit-shadows          # list all libs/ui components currently shadowed

# Scaffold a shadow component (preserves react-hook-form wiring, adds TODO placeholders)
npm run create-shadow -- jira components/tasks/task-form/TaskFormAssigneeField
```
