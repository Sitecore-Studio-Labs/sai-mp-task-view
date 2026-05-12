# Monorepo Architecture

## Design goals

- **Multi-platform from day one.** Each new task management platform (Jira, Trello, Asana…) is a separate Next.js app under `apps/`. All apps share the same React components, hooks, contexts, and AI tooling from the `libs/` packages.
- **Zero library forks.** Platform-specific UI tweaks are applied via [component shadowing](component-shadowing.md) — no copy-paste, no forking.
- **Typed contracts.** `libs/task-core` defines the adapter interface. Every platform app must implement that interface. TypeScript enforces it at compile time.

---

## Three-layer architecture

```text
┌──────────────────────────────────────────────────────────┐
│  apps/jira         (Next.js — Jira Cloud integration)    │
│  apps/wrike        (Next.js — Wrike integration)         │
│  apps/…            (Next.js — future platforms)          │
│                                                          │
│  Each app:                                               │
│    • implements PlatformServiceAdapter                   │
│    • wires up platform-specific providers                │
│    • owns API routes, auth flow, token storage           │
│    • generated and maintained via the platform generator │
│    • optionally shadows any component from libs/ui       │
└────────────────────────┬─────────────────────────────────┘
                         │ imports
┌────────────────────────▼─────────────────────────────────┐
│  libs/ui                                                 │
│    • shadcn/ui primitives (Button, Input, Select, …)     │
│    • task management views (CreateTaskView, TaskDetails) │
│    • task form fields (Summary, Priority, IssueType, …)  │
│    • connection UI (ConnectionScreen, StatusBar, …)      │
│    • hooks for data fetching (usePlatformIssues, …)      │
│    • GenericTaskManagerProvider                          │
└────────────────────────┬─────────────────────────────────┘
                         │ imports
┌────────────────────────▼─────────────────────────────────┐
│  libs/task-core                                          │
│    • PlatformServiceAdapter (interface all apps implement)│
│    • PlatformCapabilities interface + context            │
│    • CreateTask / EditTask contexts                      │
│    • Zod schemas for task forms                          │
│    • Shared TypeScript types                             │
└──────────────────────────────────────────────────────────┘
```

`libs/shared`, `libs/ai`, `libs/auth`, and `libs/token-storage` are utility packages imported by any layer as needed. `libs/env` no longer exists — `validateEnv` was merged into `@mp/shared`.

---

## Library catalog

### `@mp/task-core`

The contract layer. Defines what every platform adapter must be able to do and what data shapes flow between layers.

Key exports:

- `PlatformServiceAdapter` — TypeScript interface that every platform adapter must implement; TypeScript enforces it at compile time
- `BasePlatformAdapter` — abstract base class (does not implement the interface) with a `static handleError(err: unknown): never` method that normalises Axios errors, re-throws `PlatformApiError`, and wraps plain `Error` into a 500 `PlatformApiError`
- `PlatformApiError` — base error class for all adapter failures; carries `statusCode`, optional `platformCode`, and optional `fieldErrors`; all platform-specific error classes (e.g. `JiraClientError`) extend this
- `PlatformCapabilitiesContext` / `usePlatformCapabilities` — feature flags consumed by UI components to show/hide fields per platform
- `CreateTaskContext` / `EditTaskContext` / `TaskManagerContext` — shared task form and list state
- `PlatformApiContext` — injects `apiPaths` and an HTTP client so `libs/ui` hooks can call the right endpoints without hardcoding URLs
- Zod schemas for form validation (`CreateTaskFormValues`, `EditTaskFormValues`)

### `@mp/ui`

The UI layer. All React components live here. Consumes only `@mp/task-core` and `@mp/shared` — never imports from any app.

Key exports:

- `shadcn/ui` primitives re-exported: `Button`, `Input`, `Select`, `Dialog`, `Popover`, `Command`, …
- Task management views: `CreateTaskView`, `EditTaskView`, `TaskDetails`, `WorkBreakdownEditForm`
- Task form fields: `TaskFormHeader`, `TaskFormSummaryField`, `TaskFormPriorityField`, `TaskFormIssueTypeField`, `TaskFormParentIssueField`, `TaskFormAssigneeField`, `TaskFormDueDateField`, `TaskFormDescriptionField`, `TaskFormAttachmentsField`
- Display elements: `StatusBadge`, `PriorityBadge`, `UserAvatar`, `CommentCard`, `AdfRenderer`
- Connection UI: `ConnectionScreen`, `ConnectionSite`, `ConnectionStatusBar`
- Data hooks: `usePlatformIssues`, `usePlatformProjects`, `usePlatformStatuses`, `usePlatformIssueTypes`, `usePlatformComments`, `usePlatformAssignees`, `usePlatformCurrentUser`
- `GenericTaskManagerProvider` — wraps all task manager state providers

Internal imports inside `libs/ui` use package-absolute paths (`@mp/ui/components/tasks/task-form/X`) rather than relative paths. This is intentional — it allows individual components to be [shadowed](component-shadowing.md) per app without having to shadow the entire parent.

To scaffold a shadow for a form-field component (pre-wired with all react-hook-form contracts and `// TODO` placeholders for the UI), use `create-shadow` from the workspace root:

```bash
npm run create-shadow -- <appName> components/tasks/task-form/<ComponentName>
```

See [component-shadowing.md](component-shadowing.md) for the full guide.

### `@mp/auth`

Platform-agnostic OAuth / API-key authentication library. Wraps token exchange, refresh, and revocation behind a single `createAuthStrategy(config)` factory. Supports `oauth2-refresh`, `oauth2-static`, `oauth1`, and `api-key` flows.

Each generated platform app receives an auto-generated `src/lib/authStrategy.ts` that calls `createAuthStrategy` with the parameters derived from the platform's capability YAML `auth:` block. Route handlers import `authStrategy` directly — they never know what auth type is in use.

### `@mp/token-storage`

Supabase-backed token store used by `@mp/auth`. Provides `SupabaseTokenStore` which reads and writes per-user, per-platform tokens to the `*_connections` and `*_sessions` tables. Tagged `type:util` so it can be imported by both `libs/auth` and directly by apps.

### `@mp/shared`

Pure utilities with no React dependency:

- `cn(...classes)` — Tailwind class merging (clsx + tailwind-merge)
- `createPlatformApiClient(baseURL)` — Axios instance factory with 401 refresh + auth-failure callback
- `PlatformToken` — base token shape (`accessToken`, `refreshToken?`, `expiry?`, `tokenType`) re-exported by `@mp/task-core`
- `encrypt(data)` / `decrypt(data)` — AES-256-GCM encryption for token storage
- `extractApiError(error)` — Normalises Axios/fetch errors into a plain message
- `validateEnv(schema)` — Validates `process.env` against a Zod schema at startup; throws with a readable error on missing/invalid vars

All files live under `libs/shared/src/lib/`. Previously `validateEnv` was a separate `libs/env` package — it was merged here to avoid a single-function library.

### `@mp/ai`

OpenAI-backed work-breakdown generator:

- `generateWorkBreakdownWithOpenAI(prompt)` — calls OpenAI with the system prompt
- `extractJsonFromResponse(text)` — parses the JSON block from the model response
- `normalizeWorkItems(raw)` — validates and reshapes the output
- Draft storage utilities: `setDraft`, `getDraft`, `updateNodeInDraft`, `deleteNodeInDraft`
- Zod schemas and TypeScript types for `WorkBreakdown` and `WorkItem`

---

## Package aliases (`@mp/*`)

All packages are registered in `tsconfig.base.json` under the `@mp` NX scope:

```jsonc
// tsconfig.base.json (workspace root)
{
  "compilerOptions": {
    "paths": {
      "@mp/adapter-test-kit": ["libs/adapter-test-kit/src/index.ts"],
      "@mp/ai": ["libs/ai/src/index.ts"],
      "@mp/auth": ["libs/auth/src/index.ts"],
      "@mp/shared": ["libs/shared/src/index.ts"],
      "@mp/task-core": ["libs/task-core/src/index.ts"],
      "@mp/token-storage": ["libs/token-storage/src/index.ts"],
      "@mp/ui": ["libs/ui/src/index.ts"],
    },
  },
}
```

Each app `tsconfig.json` extends this base. `apps/jira/tsconfig.json` overrides `@mp/ui/*` to enable component shadowing — see [component-shadowing.md](component-shadowing.md).

---

## NX workspace

`nx.json` at the workspace root registers the NX orchestrator with:

- **NPM scope:** `@mp`
- **Cached targets:** `build`, `lint`, `test`, `e2e`
- **Default base branch:** `main`

Run `npx nx graph` to visualise the dependency graph. NX ensures libs are always built before the apps that consume them.

---

## Next.js and `transpilePackages`

Next.js does not compile `node_modules` by default. Because `libs/` packages are local source (not published npm packages), they must be listed in `transpilePackages` so Next.js compiles them as part of the app bundle:

```ts
// apps/jira/next.config.ts
const nextConfig: NextConfig = {
  transpilePackages: ["@mp/ui", "@mp/task-core", "@mp/shared", "@mp/ai"],
};
```

Any new library added to `libs/` must also be added to this list in each consuming app.

---

## Adding a new library

1. Create `libs/<name>/src/index.ts` with your exports.
2. Add a `package.json` with `"name": "@mp/<name>"`.
3. Register the alias in `tsconfig.base.json`.
4. Add to `transpilePackages` in each app's `next.config.ts`.
5. Add an NX project config (`project.json`) so NX can lint and test it.

---

## Capability flags system

Capability flags let the shared UI layer show or hide fields and features based on what a specific platform supports — without any `if (platform === 'jira')` branching.

### Single source of truth: `capabilities/capability-flags.json`

```json
{
  "providerFlags": ["hasIssueTypes", "hasPriorities", "hasAssignees", ...],
  "routeFlags":    ["hasSites"]
}
```

- **`providerFlags`** — exposed in the `PlatformCapabilities` TypeScript interface and consumed by UI via `usePlatformCapabilities()`.
- **`routeFlags`** — affect route generation in the generator only; not visible to the UI layer.

### Per-platform YAML overrides

`capabilities/<platform>.yaml` sets each flag for that platform. It extends `capabilities/base.yaml` which defaults all flags to `false`:

```yaml
# capabilities/wrike.yaml
extends: base
platform:
  name: wrike
  displayName: Wrike
capabilities:
  hasComments: true
  hasAttachments: true
  hasStatusTransitions: true
```

The `PlatformCapabilitiesProvider` generated for each app reads directly from this YAML at generation time — the `CAPABILITIES` constant in the provider is the source of what the UI sees at runtime.

### Adding a new flag

```bash
node tools/add-capability.js hasDarkMode "Platform supports dark mode theming."
```

This single command updates all three places atomically:

1. Appends to `providerFlags` in `capability-flags.json`
2. Adds the `hasDarkMode: boolean` field to the `PlatformCapabilities` TypeScript interface
3. Adds `hasDarkMode: false` to `capabilities/base.yaml`

Then follow the printed instructions: gate the UI component, add a stub to the generator template, and opt in platforms by editing their YAML and running `sync-capabilities`.

---

## API Descriptor Layer

Each platform app can optionally declare a `capabilities/<platform>.api.yaml` that describes how the platform's raw API response fields map to the core types `PlatformTask`, `PlatformComment`, and `PlatformProject`. When this file is present the generator auto-runs the mapping generator during scaffold, and the app's service adapter imports ready-made normalizer functions instead of hand-writing them.

### `capabilities/<platform>.api.yaml` format

```yaml
# capabilities/jira.api.yaml
entities:
  tasks:
    list:
      response:
        fields:
          id: { from: id }
          key: { from: key }
          summary: { from: fields.summary }
          status: { from: fields.status }
          subtasks: { from: fields.subtasks, transform: "self-array" }
          comment: { from: fields.comment, transform: "comments-array-wrapper" }

  comments:
    list:
      response:
        fields:
          id: { from: id }
          author: { from: author }
          body: { from: body }
          created: { from: created }
```

Each entry under `fields` may include:

| Key         | Required | Description                                                                                           |
| ----------- | -------- | ----------------------------------------------------------------------------------------------------- |
| `from`      | yes      | Dot-path into the raw API object. Paths starting with `fields.` are placed inside a `fields:{}` block |
| `nullable`  | no       | When `true`, appends `?? undefined` to the mapping expression                                         |
| `transform` | no       | `"self-array"` (recursive normalizeTask for subtasks), `"comments-array-wrapper"` (nested list)       |

### Generated files

Running `npx nx run <platform>:generate-mappings` (or passing `--validate` for CI) reads the YAML and writes:

```text
apps/<platform>/src/platforms/<platform>/generated/
├── tasks.mapping.ts      — normalizeTask(raw: PlatformRawTask): PlatformTask
├── comments.mapping.ts   — normalizeComment(raw: PlatformRawComment): PlatformComment
├── projects.mapping.ts   — normalizeProject(raw: PlatformRawProject): PlatformProject
└── index.ts              — re-exports all normalizers
```

The files are stamped `// @generated — do not edit` and imported by the platform's service adapter. Run `generate-mappings` after editing the YAML; run `validate-mappings` in CI to detect drift.

### Error handling (`PlatformApiError`)

All adapter errors must be surfaced as `PlatformApiError` instances so the shared route helpers (`platformRoute.ts`) can translate them to the correct HTTP status code. The standard pattern for a new platform:

1. Create a platform-specific subclass (e.g. `JiraClientError extends PlatformApiError`).
2. In the raw HTTP adapter, call `BasePlatformAdapter.handleError(err)` in catch blocks — it re-throws `PlatformApiError` as-is and wraps everything else.
3. Add a `throwPlatformApiError(responseData, statusCode)` helper in `src/lib/extractPlatformError.ts` to parse the platform's error envelope and throw a correctly typed `PlatformApiError`.

See [error-handling.md](../guides/error-handling.md) for the full pattern.

---

## Module boundary rules

NX enforces import direction via `@nx/enforce-module-boundaries` in `eslint.config.mjs`. Each project is tagged and the rules constrain what each tag can import:

| Tag            | Can import from             | Examples                            |
| -------------- | --------------------------- | ----------------------------------- |
| `type:util`    | `type:util`                 | `libs/shared`, `libs/token-storage` |
| `type:feature` | `type:util`                 | `libs/auth`                         |
| `type:ui`      | `type:util`, `type:feature` | `libs/ui`, `libs/task-core`         |
| `type:app`     | anything                    | `apps/jira`, `apps/wrike`           |

The rule prevents circular dependencies and ensures shared infrastructure (utils) never accidentally imports from higher layers. ESLint will fail the build if a boundary is violated.

---

## Per-platform tooling

Every platform app generated by the generator comes with these NX targets:

| Target                 | What it does                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------- |
| `audit-capabilities`   | 4 health checks: route stubs, provider sync, open TODOs, adapter template sync              |
| `check-sync`           | Checks if the capabilities provider matches `capabilities/<platform>.yaml`                  |
| `sync-capabilities`    | Regenerates the capabilities provider from the YAML (safe, idempotent)                      |
| `check-template-drift` | Shows a diff of what the current generator templates would change in the app                |
| `audit-shadows`        | Reports which `libs/ui` components the app is currently shadowing                           |
| `generate-mappings`    | Generates `src/platforms/<name>/generated/` normalizers from `capabilities/<name>.api.yaml` |
| `validate-mappings`    | Same as `generate-mappings` but exits 1 if generated files differ from disk (CI-safe)       |

```bash
# Check if the wrike app is healthy
npx nx run wrike:audit-capabilities

# Re-sync after editing wrike.yaml
npx nx run wrike:sync-capabilities

# See what drifted from the generator since initial scaffold
npx nx run wrike:check-template-drift
```

---

## Code ownership (CODEOWNERS)

`.github/CODEOWNERS` enforces required reviewers on pull requests that touch high-impact paths. GitHub blocks the merge button until all listed owners approve.

Protected paths and why:

| Path                                 | Reason                                                                        |
| ------------------------------------ | ----------------------------------------------------------------------------- |
| `libs/ui/`                           | Shared components — a visual regression affects every platform simultaneously |
| `libs/task-core/src/types/`          | Interface changes require every adapter to update                             |
| `libs/auth/`, `libs/token-storage/`  | Shared auth infrastructure                                                    |
| `capabilities/capability-flags.json` | Flag additions/removals affect all apps and the generator                     |
| `tools/generators/`                  | Generator changes affect every new platform scaffolded going forward          |
| `supabase/migrations/`               | Database schema changes are irreversible in production                        |
| `.github/`                           | Workflow changes can silently disable safety checks                           |
