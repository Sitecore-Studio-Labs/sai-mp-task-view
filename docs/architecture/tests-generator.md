# E2E test generator architecture

Platform apps are scaffolded from capability YAML via `@mp/generators:platform-app`. When E2E testing is enabled, the same generator (or a dedicated `--e2e` mode) produces a **Playwright project** under `apps/<platform>-e2e/` that shares a common contract from `libs/task-e2e`.

This document describes how that system fits together and how to run it in two common workflows:

1. **Generate E2E alongside a new platform app** — enable `e2e` in YAML before the first `nx g` run.
2. **Add E2E to an existing platform app** — use `--e2e` so the main app (capabilities provider, routes) is left unchanged.

For the full platform-app guide, see [Adding a New Platform App](../guides/new-platform-app.md). For workspace layout, see [Monorepo Architecture](monorepo-overview.md).

---

## Design goals

- **One contract per platform.** Every app implements the same `TaskAppTestingSuite` interface (connect, disconnect, CRUD-style task flows).
- **Scenarios in separate files.** Each flow lives in `src/scenarios/` so teams implement and review tests incrementally.
- **No false greens.** Generated scenario stubs call `scenarioNotImplemented()` from `task-e2e` until real Playwright steps are added.
- **Decouple app sync from test scaffolding.** `--update` syncs the main app from YAML; `--e2e` only touches `apps/<name>-e2e/`.

---

## High-level architecture

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  capabilities/<platform>.yaml                                           │
│    platform: { name, displayName, ... }                                 │
│    capabilities: { hasComments, ... }                                   │
│    e2e: { enabled: true }          ← gates E2E scaffolding              │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ read by
┌───────────────────────────────▼─────────────────────────────────────────┐
│  @mp/generators:platform-app  (tools/generators/...)                    │
│    files/       → apps/<platform>/          (main Next.js app)          │
│    files-e2e/   → apps/<platform>-e2e/      (Playwright project)        │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ imports
┌───────────────────────────────▼─────────────────────────────────────────┐
│  libs/task-e2e                                                          │
│    TaskAppTestingSuite      — method contract                           │
│    runTaskAppTestingSuite   — registers Playwright tests per method     │
│    scenarioNotImplemented   — throws until a scenario is implemented    │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ drives
┌───────────────────────────────▼─────────────────────────────────────────┐
│  apps/<platform>-e2e/                                                   │
│    playwright.config.ts     — webServer → nx run <platform>:serve       │
│    src/<platform>-task-suite.e2e.ts  — entry (runTaskAppTestingSuite)   │
│    src/suite/<Platform>TaskSuite.ts  — implements TaskAppTestingSuite   │
│    src/scenarios/*.ts       — one module per scenario                   │
└─────────────────────────────────────────────────────────────────────────┘
```

**Runtime flow when tests run:**

```text
nx run jira-e2e:e2e
  → Playwright loads src/jira-task-suite.e2e.ts
    → runTaskAppTestingSuite(new JiraTaskSuite())
      → for each method: test("connectPlatform", async ({ page }) => await suite.connectPlatform(page))
        → JiraTaskSuite.connectPlatform(page)
          → scenarios/connect-platform.ts(page)
```

---

## Capability YAML: `e2e` block

E2E metadata lives **outside** the `capabilities` block (same level as `platform` and `auth`).

`capabilities/base.yaml` defaults E2E off:

```yaml
e2e:
  enabled: false
```

Per-platform YAML can override (or inherit via `extends: base`):

```yaml
# capabilities/jira.yaml
e2e:
  enabled: true
```

| Field         | Type      | Effect                                                                                                                                            |
| ------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `e2e.enabled` | `boolean` | When `true`, the generator may scaffold `apps/<name>-e2e/`. Required for `--e2e`. Also included on **first-time** app generation (no extra flag). |

The generator validates `e2e` as an object and `e2e.enabled` as a boolean. It does **not** add E2E flags to `PlatformCapabilities` or the UI — `e2e` is generator/CI metadata only.

---

## `libs/task-e2e`

Shared E2E contract and helpers. Path alias: `task-e2e` (see root `tsconfig.base.json`).

| Export                          | Purpose                                                                                                                               |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `TaskAppTestingSuite`           | Interface — each method is `(page: Page) => Promise<void>` for connect, disconnect, and CRUD-style task flows.                        |
| `runTaskAppTestingSuite(suite)` | At load time, registers one Playwright `test()` per interface method; passes Playwright's `page` fixture and awaits the suite method. |
| `scenarioNotImplemented(name)`  | Throws `E2E scenario not implemented: <name>` — used in generated stubs.                                                              |

Generated scenario files import from `task-e2e`:

```typescript
import type { Page } from "@playwright/test";
import { scenarioNotImplemented } from "task-e2e";

export async function viewTask(_page: Page): Promise<void> {
  scenarioNotImplemented("viewTask");
}
```

The generated suite class delegates with `await`:

```typescript
async viewTask(page: Page): Promise<void> {
  await runViewTask(page);
}
```

When implementing a flow, replace the `scenarioNotImplemented` call with real Playwright steps using `page` (e.g. `page.goto`, `page.getByTestId`).

**Contrast with `adapter-test-kit`:** `runAdapterContractSuite` exercises `PlatformServiceAdapter` in **Vitest** with mocks. `task-e2e` exercises the **full app in a browser** via Playwright. Both use a suite pattern; they target different layers.

### Module boundaries (Nx tags)

| Project               | Tags                           | May import                  |
| --------------------- | ------------------------------ | --------------------------- |
| `libs/task-e2e`       | `scope:shared`, `type:e2e-kit` | `type:util` libs only       |
| `apps/<platform>-e2e` | `scope:<platform>`, `type:e2e` | `type:e2e-kit`, `type:util` |

Configured in `eslint.config.mjs` via `@nx/enforce-module-boundaries` `depConstraints`. Do not use `eslint-disable` for `task-e2e` imports in generated E2E files.

---

## Generator: templates and flags

**Implementation:** `tools/generators/src/generators/platform-app/`

| Path           | Role                                                                  |
| -------------- | --------------------------------------------------------------------- |
| `generator.ts` | Orchestration, YAML merge, `--e2e` early exit, `scaffoldE2eProject()` |
| `files-e2e/`   | E2E templates (`__tmpl__` suffix, Nx `generateFiles`)                 |
| `schema.json`  | CLI options including `e2e`                                           |

### Generator flags (E2E-relevant)

| Flag              | Main app                    | E2E project                                                |
| ----------------- | --------------------------- | ---------------------------------------------------------- |
| _(none, new app)_ | Full scaffold               | Created if `e2e.enabled: true`                             |
| `--update`        | Provider sync + route stubs | Created/updated if `e2e.enabled: true`                     |
| `--e2e`           | **Not modified**            | Scaffold only; requires existing app + `e2e.enabled: true` |
| `--force`         | Overwrites app templates    | Overwrites existing E2E scaffold                           |
| `--dryRun`        | Preview all changes         | With `--e2e`, previews only `apps/<name>-e2e/`             |

**Mutually exclusive:** `--e2e` and `--update` cannot be used together.

**Existing app without flags:** The generator errors and lists `--update`, `--e2e`, `--force`, `--dry-run`.

---

## Generated E2E testing project layout

For platform `jira` with `e2e.enabled: true`:

```text
apps/jira-e2e/
├── project.json              # Nx project "jira-e2e", target e2e → Playwright
├── playwright.config.ts      # testDir: ./src, webServer: nx run jira:serve
├── tsconfig.json
└── src/
    ├── jira-task-suite.e2e.ts       # runTaskAppTestingSuite(new JiraTaskSuite())
    ├── suite/
    │   └── JiraTaskSuite.ts          # TaskAppTestingSuite → scenario modules
    └── scenarios/
        ├── connect-platform.ts
        ├── disconnect-platform.ts
        ├── create-task.ts
        ├── delete-task.ts
        ├── edit-task.ts
        ├── list-tasks.ts
        └── view-task.ts
```

Naming rules:

- Nx project: `<platform>-e2e` (e.g. `jira-e2e`)
- Suite class: `<PascalPlatform>TaskSuite` (e.g. `JiraTaskSuite`)
- Entry file: `<platform>-task-suite.e2e.ts`

The E2E project has `implicitDependencies: ["jira"]` so Nx understands the relationship to the main app.

---

## Scenario 1: E2E when generating a new platform app

Use this when the platform app does **not** exist yet and you want the app and E2E project in one pass.

### 1. Enable E2E in capability YAML

```yaml
# capabilities/trello.yaml
extends: base

platform:
  name: trello
  displayName: Trello
  # ...

capabilities:
  # ...

e2e:
  enabled: true

auth:
  # ...
```

### 2. Run the generator (first time)

```bash
npx nx g @mp/generators:platform-app trello --yamlFile=capabilities/trello.yaml
```

This creates:

- `apps/trello/` — full Next.js scaffold
- `apps/trello-e2e/` — Playwright project (because `e2e.enabled: true`)

### 3. Preview first (optional)

```bash
npx nx g @mp/generators:platform-app trello \
  --yamlFile=capabilities/trello.yaml \
  --dryRun
```

Dry-run output includes both `apps/trello/` and `apps/trello-e2e/` when E2E is enabled.

### 4. Run E2E

```bash
npx nx run trello-e2e:e2e
```

Until scenarios are implemented, expect **7 failing tests** (one per `scenarioNotImplemented`).

---

## Scenario 2: Add E2E to an existing platform app

Use this for apps like **Jira** that were created before E2E scaffolding, or when you want tests **without** regenerating `*PlatformCapabilitiesProvider.tsx` or API route stubs.

### 1. Enable E2E in YAML

```yaml
# capabilities/jira.yaml
e2e:
  enabled: true
```

### 2. Scaffold E2E only

```bash
npx nx g @mp/generators:platform-app jira \
  --yamlFile=capabilities/jira.yaml \
  --e2e
```

**What `--e2e` does:**

- Creates or updates `apps/jira-e2e/`
- Registers Nx project `jira-e2e`
- Updates root `eslint.config.mjs` for the new app path

**What `--e2e` does not do:**

- Does not change `apps/jira/src/providers/JiraPlatformCapabilitiesProvider.tsx`
- Does not add or change API route stubs under `apps/jira/src/app/api/`

### 3. Preview (recommended)

```bash
npx nx g @mp/generators:platform-app jira \
  --yamlFile=capabilities/jira.yaml \
  --e2e \
  --dryRun
```

Confirm the diff lists only `apps/jira-e2e/**` and eslint — not the main app provider.

### 4. If E2E was partially scaffolded before

If `apps/jira-e2e/` exists but is incomplete (e.g. empty folder), or you need to reset templates:

```bash
npx nx g @mp/generators:platform-app jira \
  --yamlFile=capabilities/jira.yaml \
  --e2e \
  --force
```

The generator treats a project as “already scaffolded” when `playwright.config.ts` exists; `--force` overwrites.

### 5. Run E2E

```bash
npx nx run jira-e2e:e2e
```

Playwright UI mode:

```bash
npx nx run jira-e2e:e2e -- --ui
```

---

## Syncing the main app vs adding tests

| Goal                                          | Command                                                                                    |
| --------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Sync capabilities provider + routes from YAML | `npx nx g @mp/generators:platform-app <name> --yamlFile capabilities/<name>.yaml --update` |
| Add or refresh E2E only                       | `npx nx g @mp/generators:platform-app <name> --yamlFile capabilities/<name>.yaml --e2e`    |
| Both                                          | Run **two commands** (do not combine `--update` and `--e2e`)                               |

The app’s `sync-capabilities` Nx target runs `--update` only — it will not scaffold E2E unless `e2e.enabled: true` is set and you use a full generate path that includes step 5b (not `--e2e`-only).

---

## Implementing scenarios

1. Pick a scenario file under `apps/<platform>-e2e/src/scenarios/`.
2. Replace `scenarioNotImplemented("methodName")` with Playwright interactions.
3. Re-run `nx run <platform>-e2e:e2e` until that test passes.

The suite class (`JiraTaskSuite`) should stay thin — delegate to scenario modules so each file owns one user journey.

Example progression for `connect-platform.ts`:

```typescript
import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export async function connectPlatform(page: Page): Promise<void> {
  await page.goto("/task-manager-extension");
  await expect(page.getByTestId("connect-to-jira")).toBeVisible();
  await page.getByTestId("connect-jira-account").click();
  // Complete OAuth (popup or storageState), then assert connected state:
  await expect(page.getByTestId("connection-status-bar")).toBeVisible();
}
```

Prefer shared page helpers in `libs/task-e2e` for flows used across platforms; keep platform-specific OAuth and setup steps in each app's scenario files.

---

## Running tests locally

| Task                   | Command                                 |
| ---------------------- | --------------------------------------- |
| Run E2E (headless)     | `npx nx run <platform>-e2e:e2e`         |
| Run with Playwright UI | `npx nx run <platform>-e2e:e2e -- --ui` |
| Lint E2E project       | `npx nx run <platform>-e2e:lint`        |

**Web server:** `playwright.config.ts` starts the platform app via `npx nx run <platform>:serve` unless `PLAYWRIGHT_BASE_URL` points at an already-running instance (`reuseExistingServer` locally).

**Environment:** Ensure the platform app’s `.env` / secrets are configured for connect flows before implementing OAuth scenarios.

---

## CI

`.github/workflows/testing-pipeline.yaml` runs affected E2E targets:

```bash
npx nx affected --target=e2e --parallel=1
```

New platforms need `e2e.enabled: true`, a generated `apps/<platform>-e2e` project, and implemented scenarios (or CI will fail on `scenarioNotImplemented`).

---

## Decision guide

```text
New platform app?
  └─ Yes → Set e2e.enabled: true in YAML → nx g platform-app (no --e2e needed)
  └─ No  → App already exists
            └─ Only want tests, keep app files untouched?
                  └─ Yes → nx g platform-app --e2e
            └─ Want YAML → provider/routes sync?
                  └─ Yes → nx g platform-app --update
            └─ Want both? → Run --e2e and --update as separate commands
```

---

## Related files

| Location                                                    | Description                                           |
| ----------------------------------------------------------- | ----------------------------------------------------- |
| `libs/task-e2e/`                                            | Contract, Playwright runner, `scenarioNotImplemented` |
| `tools/generators/src/generators/platform-app/files-e2e/`   | E2E templates                                         |
| `tools/generators/src/generators/platform-app/generator.ts` | `scaffoldE2eProject`, `--e2e` branch                  |
| `capabilities/base.yaml`                                    | Default `e2e.enabled: false`                          |
| `tools/generators/.../fixtures/demo-e2e-scaffold.yaml`      | Fixture YAML for dry-run / generator checks           |

---

## See also

- [Adding a New Platform App](../guides/new-platform-app.md) — capability YAML, auth, adapter work
- [Monorepo Architecture](monorepo-overview.md) — apps vs libs, NX targets
- `libs/adapter-test-kit` — unit-level adapter contract tests (Vitest, not Playwright)
