# task-e2e

Shared E2E contract and Playwright runner for platform task-manager apps. Path alias: `task-e2e`.

Platform E2E projects (`apps/<platform>-e2e/`) are scaffolded by `@mp/generators:platform-app` and implement this contract. See [E2E test generator architecture](../../docs/architecture/tests-generator.md) for the full workflow.

## Exports

| Export                                 | Purpose                                                                    |
| -------------------------------------- | -------------------------------------------------------------------------- |
| `TaskAppTestingSuite`                  | Interface every platform E2E suite must implement                          |
| `runTaskAppTestingSuite(suite, test?)` | Registers one Playwright test per suite method                             |
| `createPlatformE2eFixtures(config)`    | Fixtures: `platformConfig`, `connection`, `taskManagerPage`                |
| `PlatformConnectionHelpers`            | `mockConnectionStatus`, `setSessionCookie`, `setSessionCookieByBaseUrl`, … |
| Page object helpers                    | `gotoTaskManager`, `assertConnected`, `clickCreateTaskButton`, …           |
| `scenarioNotImplemented(name)`         | Throws until a generated scenario stub is implemented                      |

## Contract

Each suite method receives Playwright's `Page` and returns a `Promise`:

```typescript
import type { Page } from "@playwright/test";

export interface TaskAppTestingSuite {
  connectPlatform(ctx: PlatformE2eScenarioContext): Promise<void>;
  disconnectPlatform(ctx: PlatformE2eScenarioContext): Promise<void>;
  createTask(ctx: PlatformE2eScenarioContext): Promise<void>;
  deleteTask(ctx: PlatformE2eScenarioContext): Promise<void>;
  editTask(ctx: PlatformE2eScenarioContext): Promise<void>;
  listTasks(ctx: PlatformE2eScenarioContext): Promise<void>;
  viewTask(ctx: PlatformE2eScenarioContext): Promise<void>;
}
```

## Usage in a platform E2E app

**Fixtures** (generated `src/fixtures/index.ts`):

```typescript
import { createPlatformE2eFixtures } from "task-e2e";

import { jiraE2eConfig } from "../config";

export const { test, expect } = createPlatformE2eFixtures(jiraE2eConfig);
```

Fixtures are auth-free — no `storageState` or pre-connect. Scenarios call `helpers/platform-auth.ts` when they need OAuth.

**Entry file** (`src/jira-task-suite.e2e.ts`):

```typescript
import { runTaskAppTestingSuite } from "task-e2e";

import { test } from "./fixtures";
import { JiraTaskSuite } from "./suite/JiraTaskSuite";

runTaskAppTestingSuite(new JiraTaskSuite(), test);
```

**Scenario module** — `connectPlatform` is generated for OAuth platforms; other scenarios start as stubs:

```typescript
import type { Page } from "@playwright/test";
import { scenarioNotImplemented } from "task-e2e";

export async function createTask(_page: Page): Promise<void> {
  scenarioNotImplemented("createTask");
}
```

OAuth `connectPlatform` uses the generated `connection` fixture (`mockConnectionStatus`, `setSessionCookie`, `simulateOAuthConnected`, …).

## Building

```bash
npx nx run task-e2e:build
```

## Module boundaries

Tagged `scope:shared`, `type:e2e-kit`. E2E app projects (`type:e2e`) may import this library. Do not import app code from here — keep shared page helpers in this lib and platform-specific steps in each `apps/<platform>-e2e/src/scenarios/` file.
