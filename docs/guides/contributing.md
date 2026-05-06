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

## Commit format

Commits are validated by Commitlint on every commit. Non-conforming commits
are rejected by the pre-commit hook.

```text
<type>(<optional scope>): <short description>

[optional body]

[optional footer — BREAKING CHANGE: ..., Closes #123]
```

### Types

| Type       | When to use                          |
| ---------- | ------------------------------------ |
| `feat`     | New capability visible to users      |
| `fix`      | Bug fix                              |
| `refactor` | Code change with no behaviour change |
| `perf`     | Performance improvement              |
| `test`     | Adding or fixing tests only          |
| `docs`     | Documentation only                   |
| `chore`    | Tooling, deps, config, CI            |
| `build`    | Changes to the build system          |
| `ci`       | Changes to CI workflows              |

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
They trigger a **major** version bump in the automated release.

---

## Rebase workflow (day-to-day)

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
Never `git merge develop` into a feature branch — merge commits break the linear history.

### Before opening a PR

```bash
git fetch origin
git rebase origin/develop        # ensure you're on top of latest develop
npx nx affected --target=lint --base=origin/develop
npx nx affected --target=test --base=origin/develop
```

### Merging the PR (feature → develop)

Use **"Rebase and merge"** on GitHub. This preserves each conventional commit
directly on `develop`, which `nx release` later reads to build the changelog.

### Cutting a release (develop → main)

Open a PR from `develop` → `main`. Once CI passes, merge it (rebase or regular
merge — a merge commit here is fine since it won't appear in the changelog).

The release workflow then fires automatically on the `main` push:

- bumps the version, generates the changelog, tags the commit, creates a GitHub Release
- fast-forwards `develop` to include the version-bump commit so the next release PR
  never conflicts on `CHANGELOG.md` or `package.json`

---

## GitHub repository settings (configure once, per repo)

These cannot be configured from code — a repo admin must set them once:

**Settings → Branches → Branch protection rule for `develop`:**

| Setting                                                                                    | Value                                                                  |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| Require a pull request before merging                                                      | ✓                                                                      |
| Require status checks to pass (select: `Lint, Unit & Integration Tests, Build, E2E Tests`) | ✓                                                                      |
| Require branches to be up to date before merging                                           | ✓                                                                      |
| Require linear history                                                                     | ✓ — enforces rebase-only, prevents merge commits from feature branches |
| Do not allow bypassing the above settings                                                  | ✓                                                                      |

**Settings → Branches → Branch protection rule for `main`:**

| Setting                                                                               | Value |
| ------------------------------------------------------------------------------------- | ----- |
| Require a pull request before merging                                                 | ✓     |
| Require status checks to pass (same check as develop)                                 | ✓     |
| Restrict who can push — allow only the release bot (`github-actions[bot]`) and admins | ✓     |
| Do not allow bypassing the above settings                                             | ✓     |

**Settings → General → Pull Requests:**

| Setting                            | Value       |
| ---------------------------------- | ----------- |
| Allow merge commits                | ✗ (uncheck) |
| Allow squash merging               | ✗ (uncheck) |
| Allow rebase merging               | ✓           |
| Automatically delete head branches | ✓           |

---

## Releases (fully automated)

Releases happen automatically on every push to `main` via the
`.github/workflows/release.yml` pipeline. You do not create releases manually.

### What happens on merge to `main`

1. The **Testing Pipeline** runs `nx affected` — only changed projects are
   linted, tested, and built.
2. On success, **Release** runs `nx release`:
   - Reads all commits since the last `v*` tag.
   - Determines the new version from commit types:
     - `fix` / `perf` → patch bump (1.0.0 → 1.0.1)
     - `feat` → minor bump (1.0.0 → 1.1.0)
     - `feat!` / `BREAKING CHANGE` → major bump (1.0.0 → 2.0.0)
   - Updates `package.json` version.
   - Generates / updates `CHANGELOG.md`.
   - Commits with `chore(release): publish vX.Y.Z [skip ci]`.
   - Creates a `vX.Y.Z` git tag.
   - Creates a GitHub Release with the changelog as release notes.

### Manual release (emergency only)

If you need to cut a release manually without a push to `main`:

```bash
# Preview — shows version bump and changelog without writing anything
npx nx release --dry-run

# Execute — bumps version, writes CHANGELOG, commits, tags, pushes, creates GitHub Release
npx nx release --skip-publish
```

Requires `GITHUB_TOKEN` to be set in your environment.

### What does `--skip-publish` mean?

The `--skip-publish` flag tells `nx release` not to run `npm publish`. The libs in
this monorepo are internal and are never published to the npm registry, so publishing
is always skipped.

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
| `supabase/migrations/`               | Schema changes are irreversible in production                             |
| `.github/`                           | Workflow changes can silently disable safety checks for the whole team    |

If you're a new owner being added, your GitHub username must be added to `.github/CODEOWNERS`.

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
```
