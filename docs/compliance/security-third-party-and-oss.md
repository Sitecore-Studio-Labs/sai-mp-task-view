# Security Evidence: Third Party and OSS

> **Project:** sai-mp-jira-task-view (Next.js / TypeScript)
> **Generated:** 2026-04-06
> **Scope:** Declared dependencies, SBOM generation, license compliance, SCA process, CI enforcement, and audit artifacts.

---

## 1. Declared Dependencies

### 1.1 Dependency manifest

**File:** `package.json` — declares **64 production** and **25 dev** dependencies with semver ranges.

**File:** `package-lock.json` — lockfileVersion 3, pins exact resolved versions for all transitive dependencies. npm reports **1,226 total packages** (426 prod, 729 dev, 101 optional).

Both files are committed to the repository. `npm ci` is used in CI (`.github/workflows/testing-pipeline.yaml`) to ensure reproducible, lockfile-exact installs.

### 1.2 Production dependencies (top-level)

| Category               | Packages                                                                                                                                                                                                                                                                    |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Framework**          | `next@^16.2.2`, `react@19.2.3`, `react-dom@19.2.3`                                                                                                                                                                                                                          |
| **UI / Design system** | 24 × `@radix-ui/*`, `radix-ui`, `lucide-react`, `tailwind-merge`, `tailwindcss-animate`, `class-variance-authority`, `clsx`, `cmdk`, `sonner`, `embla-carousel-react`, `input-otp`, `react-resizable-panels`, `react-day-picker`, `react-select`, `recharts`, `next-themes` |
| **Rich-text editor**   | `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-color`, `@tiptap/extension-placeholder`, `@tiptap/extension-text-style`                                                                                                                                          |
| **Drag-and-drop**      | `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`                                                                                                                                                                                                                  |
| **Forms & validation** | `react-hook-form`, `@hookform/resolvers`, `zod`                                                                                                                                                                                                                             |
| **Data fetching**      | `@tanstack/react-query`, `@tanstack/react-table`, `axios`                                                                                                                                                                                                                   |
| **Backend / infra**    | `@supabase/supabase-js`, `openai`, `form-data`, `@razroo/html-to-adf`                                                                                                                                                                                                       |
| **Platform SDK**       | `@sitecore-marketplace-sdk/client`, `@sitecore-marketplace-sdk/xmc`                                                                                                                                                                                                         |
| **Icons**              | `@mdi/js`                                                                                                                                                                                                                                                                   |

### 1.3 Dev dependencies

| Category                       | Packages                                                                                                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linting & formatting**       | `eslint`, `eslint-config-next`, `eslint-config-prettier`, `eslint-plugin-import`, `eslint-plugin-simple-import-sort`, `prettier`, `prettier-plugin-tailwindcss`     |
| **Commit discipline**          | `@commitlint/cli`, `@commitlint/config-conventional`, `husky`, `lint-staged`                                                                                        |
| **Unit / integration testing** | `vitest`, `@vitest/coverage-v8`, `@vitejs/plugin-react`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`, `supertest` |
| **E2E testing**                | `@playwright/test`                                                                                                                                                  |
| **Build tooling**              | `typescript`, `tailwindcss`, `@tailwindcss/postcss`, `tw-animate-css`, `shadcn`                                                                                     |

### 1.4 Vulnerability status (`npm audit`)

**Last scan:** 2026-04-06 — **0 vulnerabilities** (0 critical, 0 high, 0 moderate, 0 low).

Previously identified and resolved:

| Severity     | Package                         | Advisory                                                                                                      | Remediation                  |
| ------------ | ------------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| **High**     | `lodash@<=4.17.23` (transitive) | Code Injection via `_.template` ([GHSA-r5fr-rjxr-66jc](https://github.com/advisories/GHSA-r5fr-rjxr-66jc))    | Resolved via lockfile update |
| **Moderate** | `next@16.1.6` (direct)          | HTTP request smuggling in rewrites ([GHSA-ggv3-7p47-pfv8](https://github.com/advisories/GHSA-ggv3-7p47-pfv8)) | Upgraded to `next@^16.2.2`   |

---

## 2. SBOM Generation

### 2.1 Tooling

SBOM generation uses **CycloneDX** for npm, producing a CycloneDX JSON SBOM (`sbom.cdx.json`).

**npm script:**

```bash
npm run sbom   # → npx @cyclonedx/cyclonedx-npm --output-file sbom.cdx.json
```

### 2.2 CI integration

The CI pipeline (`.github/workflows/testing-pipeline.yaml`) generates an SBOM on every pull request and archives it as a GitHub Actions artifact with 90-day retention:

```yaml
- name: Generate SBOM
  run: npx @cyclonedx/cyclonedx-npm --output-file sbom.cdx.json

- name: Upload SBOM artifact
  uses: actions/upload-artifact@v4
  with:
    name: sbom
    path: sbom.cdx.json
    retention-days: 90
```

### 2.3 Inputs

- `package.json` — declared dependency ranges
- `package-lock.json` (lockfileVersion 3) — exact resolved versions and integrity hashes for all packages
- Both files are version-controlled and used via `npm ci` for deterministic installs

---

## 3. License Compliance

### 3.1 Project license

No `LICENSE` file in the repository root. `package.json` has `"private": true` — the project is not intended for public distribution.

### 3.2 Allowed-license policy

An allowed-license list is enforced via the `license:check` npm script and as a CI gate:

```bash
npm run license:check
# → npx license-checker --onlyAllow 'MIT;Apache-2.0;BSD-2-Clause;BSD-3-Clause;ISC;0BSD;CC0-1.0;CC-BY-3.0;CC-BY-4.0;Unlicense;Python-2.0;BlueOak-1.0.0' --excludePrivatePackages
```

Any dependency using a license outside this list will fail the CI build.

### 3.3 Third-party license metadata

`package-lock.json` contains the `"license"` field for each resolved package (standard npm registry metadata).

---

## 4. SCA / Dependency Scanning Process

### 4.1 CI pipeline enforcement

**File:** `.github/workflows/testing-pipeline.yaml`

The pipeline runs on every pull request and includes the following security gates (in order):

1. `npm ci` — deterministic install from lockfile
2. **`npm audit --audit-level=high`** — fails the build if any high or critical vulnerability is present
3. **License check** — fails the build if any dependency uses a non-approved license
4. **SBOM generation** — produces and archives a CycloneDX SBOM

### 4.2 Automated dependency updates

**File:** `.github/dependabot.yml`

Dependabot is configured for:

- **npm ecosystem** — weekly schedule (Monday), up to 10 open PRs, with grouping for related packages (Radix UI, Tiptap, testing libraries, lint/format tools)
- **GitHub Actions** — weekly schedule (Monday) to keep CI actions up to date

PRs are auto-labeled `dependencies` (and `ci` for Actions updates) and use conventional commit prefixes (`chore(deps)`, `ci(deps)`).

### 4.3 Audit artifacts

- **SBOM:** CycloneDX JSON archived as a GitHub Actions artifact per PR (90-day retention)
- **npm audit:** Output captured in CI logs for every PR
- **License check:** Output captured in CI logs for every PR

### 4.4 Vulnerability SLA process

| Severity     | Response SLA | Action                                                                                 |
| ------------ | ------------ | -------------------------------------------------------------------------------------- |
| **Critical** | 24 hours     | Immediate patching; hotfix branch if needed                                            |
| **High**     | 7 days       | Patch or mitigate in next sprint; override transitive deps if upstream fix unavailable |
| **Moderate** | 30 days      | Schedule for next planned release cycle                                                |
| **Low**      | 90 days      | Address during routine dependency updates                                              |

- CI enforces a **hard gate** at `high` severity — PRs with unresolved high/critical vulnerabilities cannot merge
- Dependabot PRs provide automated upgrade paths; the team reviews and merges within the SLA window
- Transitive dependency vulnerabilities with no upstream fix are mitigated via npm `overrides` until the parent package updates

---

## 5. Remediation Log

| #   | Gap (original)                                   | Remediation                                                                  | Status   |
| --- | ------------------------------------------------ | ---------------------------------------------------------------------------- | -------- |
| 1   | No `npm audit` in CI                             | Added `npm audit --audit-level=high` step to testing pipeline                | **Done** |
| 2   | No automated dependency updates                  | Added `.github/dependabot.yml` (npm weekly + GitHub Actions weekly)          | **Done** |
| 3   | `lodash` high vulnerability                      | Resolved via lockfile update                                                 | **Done** |
| 4   | `next@16.1.6` moderate vulnerability             | Upgraded to `next@^16.2.2`                                                   | **Done** |
| 5   | No SBOM generation                               | Added CycloneDX npm script + CI step with artifact upload (90-day retention) | **Done** |
| 6   | No license audit tooling                         | Added `license:check` script with allowed-license policy; enforced in CI     | **Done** |
| 7   | No vulnerability SLA                             | Documented SLA per severity level (section 4.4)                              | **Done** |
| 8   | `supertest`, `@vitejs/plugin-react` in prod deps | Moved to `devDependencies`                                                   | **Done** |

---

## 6. Summary of Findings

| Checklist item                                 | Status   | Evidence                                                                                                     |
| ---------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------ |
| Declared dependencies in package.json/lockfile | **Pass** | 64 prod + 25 dev deps declared; lockfile (v3) pins 1,226 packages with integrity hashes; `npm ci` used in CI |
| SBOM generation inputs                         | **Pass** | CycloneDX SBOM generated per PR; archived as CI artifact (90-day retention)                                  |
| License exclusions documented                  | **Pass** | Allowed-license policy enforced via `license:check` script and CI gate                                       |
| Recurring SCA/SBOM process per release         | **Pass** | `npm audit`, license check, and SBOM generation run on every PR                                              |
| CI enforcement (rules)                         | **Pass** | `npm audit --audit-level=high` and license check are hard gates; SBOM archived                               |
| Audit artifacts (scan reports)                 | **Pass** | SBOM artifact + audit/license logs captured per PR                                                           |
| Dependency vulnerability SLA process           | **Pass** | Documented SLAs by severity; CI hard gate at high; Dependabot for automated updates                          |
