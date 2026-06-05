# task-e2e

Shared E2E contract and Playwright runner for platform task-manager apps. Path alias: `task-e2e`.

Platform E2E projects (`apps/<platform>-e2e/`) are scaffolded by `@mp/generators:platform-app` and implement this contract. See [E2E test generator architecture](../../docs/architecture/tests-generator.md) for the full workflow.

## Exports

| Export                          | Purpose                                               |
| ------------------------------- | ----------------------------------------------------- |
| `TaskAppTestingSuite`           | Interface every platform E2E suite must implement     |
| `runTaskAppTestingSuite(suite)` | Registers one Playwright test per suite method        |
| `scenarioNotImplemented(name)`  | Throws until a generated scenario stub is implemented |

## Contract

Each suite method receives Playwright's `Page` and returns a `Promise`:

```typescript
import type { Page } from "@playwright/test";

export interface TaskAppTestingSuite {
  connectPlatform(page: Page): Promise<void>;
  disconnectPlatform(page: Page): Promise<void>;
  createTask(page: Page): Promise<void>;
  deleteTask(page: Page): Promise<void>;
  editTask(page: Page): Promise<void>;
  listTasks(page: Page): Promise<void>;
  viewTask(page: Page): Promise<void>;
}
```

## Usage in a platform E2E app

**Entry file** (`src/jira-task-suite.e2e.ts`):

```typescript
import { runTaskAppTestingSuite } from "task-e2e";

import { JiraTaskSuite } from "./suite/JiraTaskSuite";

runTaskAppTestingSuite(new JiraTaskSuite());
```

**Suite class** — thin delegate to scenario modules:

```typescript
async connectPlatform(page: Page): Promise<void> {
  await runConnectPlatform(page);
}
```

**Scenario module** — stub until implemented:

```typescript
import type { Page } from "@playwright/test";
import { scenarioNotImplemented } from "task-e2e";

export async function connectPlatform(_page: Page): Promise<void> {
  scenarioNotImplemented("connectPlatform");
}
```

Replace `scenarioNotImplemented` with real `page` interactions. Drop the `_` prefix on `page` once you use it.

The runner passes `page` automatically:

```typescript
test(method, async ({ page }) => {
  await suite[method](page);
});
```

## Building

```bash
npx nx run task-e2e:build
```

## Module boundaries

Tagged `scope:shared`, `type:e2e-kit`. E2E app projects (`type:e2e`) may import this library. Do not import app code from here — keep shared page helpers in this lib and platform-specific steps in each `apps/<platform>-e2e/src/scenarios/` file.
