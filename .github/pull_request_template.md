# Pull Request

## Summary

<!-- One or two sentences. What does this PR do and why? -->

## Type of change

- [ ] `feat` — new feature
- [ ] `fix` — bug fix
- [ ] `refactor` — code restructuring, no behaviour change
- [ ] `chore` — tooling, deps, config
- [ ] `docs` — documentation only
- [ ] `test` — tests only
- [ ] `perf` — performance improvement
- [ ] Breaking change (add `!` after the type, e.g. `feat!:`)

## Checklist

- [ ] **PR title and all commits** follow [Conventional Commits](https://www.conventionalcommits.org/) format — `<type>: <description>` (the title becomes the commit message on `develop` via squash & merge and feeds `nx release`)
- [ ] Branch is up to date with latest `develop`
- [ ] Affected tests pass locally (`npx nx affected --target=test`)
- [ ] New behaviour is covered by tests
- [ ] No new ESLint errors (`npx nx affected --target=lint`)
- [ ] UI changes tested in the browser

## Screenshots / recordings

<!-- For UI changes, attach a screenshot or screen recording. Delete if not applicable. -->
