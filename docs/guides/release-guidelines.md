# Release Guidelines

This document describes how releases are created, versioned, and published in
this repository.

---

## Branch Strategy

```
feature/your-feature  →(squash & merge)→  develop  →(rebase & merge)→  main
```

| Merge             | Strategy       | Why                                                                                                     |
| ----------------- | -------------- | ------------------------------------------------------------------------------------------------------- |
| Feature → develop | Squash & merge | One clean commit per PR on develop                                                                      |
| Develop → main    | Rebase & merge | Each develop commit (= one PR) lands on main individually, giving nx release one changelog entry per PR |

---

## PR Title Format

PR titles **must** follow the [Conventional Commits](https://www.conventionalcommits.org/) specification. This is enforced automatically by the `pr-title.yml` workflow on all PRs targeting branches other than `main`.

### Format

```
<type>: <short description starting with lowercase, no trailing period>
<type>(<scope>): <description>   ← scope is optional
<type>!: <description>           ← ! indicates a breaking change (major bump)
```

### Allowed types

| Type       | Use for                               | Version bump |
| ---------- | ------------------------------------- | ------------ |
| `feat`     | New user-facing feature               | Minor        |
| `fix`      | Bug fix                               | Patch        |
| `perf`     | Performance improvement               | Patch        |
| `refactor` | Code restructure, no behaviour change | None         |
| `docs`     | Documentation only                    | None         |
| `test`     | Adding or fixing tests                | None         |
| `ci`       | CI/CD workflow changes                | None         |
| `build`    | Build system changes                  | None         |
| `chore`    | Maintenance, dependency updates       | None         |
| `revert`   | Reverting a previous commit           | Patch        |

### Examples

```
feat: add Jira webhook sync
fix(wrike): handle missing task assignee
feat!: rename top-level API field
chore: update dependencies
ci: add PR title lint workflow
```

### What happens if the title is wrong

The `pr-title.yml` check will fail with a red status on the PR explaining the
problem. Fix the title and the check reruns automatically. Without a valid
title, auto-versioning will not produce a changelog entry for that PR.

---

## Develop → Main Release PRs

PRs that promote `develop` to `main` are exempt from the PR title lint check
(the workflow skips PRs targeting `main`). These PRs can be titled freely, for
example:

```
release v1.2.0
chore: release to main
```

The individual changelog entries come from the commits already on `develop`,
not from this PR title.

---

## Release Process

Releases are semi-automated. Phase 1 runs automatically; Phase 2 is triggered
manually by the release owner after reviewing the changelog draft.

### Phase 1 — Automatic (triggered by merge to main)

When the develop → main PR is merged, the `release-draft.yml` workflow runs
automatically:

1. Determines the next version from conventional commit types on `main` since
   the last tag (`feat` → minor bump, `fix` → patch bump, `feat!` → major bump)
2. Writes the new version to `package.json`
3. Prepends the new changelog section to `CHANGELOG.md`
4. Saves the new section to `.release-notes.md` for use as the GitHub Release body
5. Pushes all three files to a `release/vX.Y.Z` branch — **no tag, no GitHub Release yet**
6. Prints the branch diff URL in the job log

### Phase 2 — Manual (triggered by the release owner)

After Phase 1 completes:

1. **Review** — open the `release/vX.Y.Z` branch on GitHub and read `CHANGELOG.md`
2. **Edit if needed** — edit `CHANGELOG.md` directly on GitHub, commit to the branch. Your edits will be included in the final GitHub Release body
3. **Publish** — go to **Actions → Release — Publish → Run workflow**
4. Enter the version number shown in the Phase 1 job log (e.g. `1.1.1`)
5. Click **Run workflow**

The publish workflow will:

- Fast-forward `main` to the draft branch (including any edits)
- Create the git tag `vX.Y.Z`
- Create the GitHub Release using the (possibly edited) `.release-notes.md`
- Sync the release commit back to `develop` via fast-forward merge
- Delete the `release/vX.Y.Z` draft branch

### Triggering publish — step by step

```
GitHub → your repo
  └─ Actions (top nav)
       └─ Release — Publish  (left sidebar, under "All workflows")
            └─ Run workflow  (button, top right of the runs list)
                 ├─ Branch: main
                 ├─ Version: 1.1.1   ← type the version here
                 └─ Run workflow     ← click to publish
```

---

## Versioning Rules

Versioning follows [Semantic Versioning](https://semver.org/) and is determined
automatically by the commit types since the last tag:

| Commits since last tag                                  | Bump              |
| ------------------------------------------------------- | ----------------- |
| At least one `feat!` or `BREAKING CHANGE` in body       | **Major** (X.0.0) |
| At least one `feat` (no breaking)                       | **Minor** (X.Y.0) |
| Only `fix`, `perf`, `revert`                            | **Patch** (X.Y.Z) |
| Only `chore`, `docs`, `ci`, `refactor`, `test`, `build` | **No release**    |

If there are no releasable commits since the last tag, `nx release` will not
bump the version and the draft workflow will skip cleanly.

---

## CHANGELOG.md

`CHANGELOG.md` at the repo root is auto-generated by `nx release`. Do not edit
it directly on `main` or `develop`. The correct place to make editorial changes
is on the `release/vX.Y.Z` draft branch during Phase 2 review.

---

## Workflow Files

| File                                    | Trigger                      | Purpose                                          |
| --------------------------------------- | ---------------------------- | ------------------------------------------------ |
| `.github/workflows/pr-title.yml`        | Every PR (except → main)     | Validates PR title format                        |
| `.github/workflows/release-draft.yml`   | Push to main                 | Generates changelog draft, pushes release branch |
| `.github/workflows/release-publish.yml` | Manual (`workflow_dispatch`) | Tags, creates GitHub Release, syncs develop      |
