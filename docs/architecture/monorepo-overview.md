# Monorepo Architecture

## Design goals

- **Multi-platform from day one.** Each new task management platform (Jira, Trello, Asana…) is a separate Next.js app under `apps/`. All apps share the same React components, hooks, contexts, and AI tooling from the `libs/` packages.
- **Zero library forks.** Platform-specific UI tweaks are applied via [component shadowing](component-shadowing.md) — no copy-paste, no forking.
- **Typed contracts.** `libs/task-core` defines the adapter interface. Every platform app must implement that interface. TypeScript enforces it at compile time.

---

## Three-layer architecture

```
┌──────────────────────────────────────────────────────────┐
│  apps/jira         (Next.js — Jira Cloud integration)    │
│  apps/trello       (Next.js — future)                    │
│  apps/…                                                  │
│                                                          │
│  Each app:                                               │
│    • implements BasePlatformAdapter                      │
│    • wires up platform-specific providers                │
│    • owns API routes, auth flow, token storage           │
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
│    • BasePlatformAdapter (abstract base class)           │
│    • PlatformCapabilities interface + context            │
│    • CreateTask / EditTask contexts                      │
│    • Zod schemas for task forms                          │
│    • Shared TypeScript types                             │
└──────────────────────────────────────────────────────────┘
```

`libs/shared` and `libs/ai` are utility packages imported by any layer as needed.

---

## Library catalog

### `@mp/task-core`

The contract layer. Defines what every platform adapter must be able to do and what data shapes flow between layers.

Key exports:

- `BasePlatformAdapter` — abstract base class; platform apps extend this and implement all methods
- `PlatformCapabilitiesContext` / `usePlatformCapabilities` — feature flags (does this platform have priorities? assignees? OAuth?)
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

### `@mp/shared`

Pure utilities with no React dependency:

- `cn(...classes)` — Tailwind class merging (clsx + tailwind-merge)
- `createPlatformApiClient(baseURL)` — Axios instance factory
- `encrypt(data)` / `decrypt(data)` — AES encryption for token storage
- `extractApiError(error)` — Normalises Axios/fetch errors into a plain message

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
      "@mp/task-core": ["libs/task-core/src/index.ts"],
      "@mp/task-core/*": ["libs/task-core/src/*"],
      "@mp/ui": ["libs/ui/src/index.ts"],
      "@mp/ui/*": ["libs/ui/src/*"],
      "@mp/shared": ["libs/shared/src/index.ts"],
      "@mp/shared/*": ["libs/shared/src/*"],
      "@mp/ai": ["libs/ai/src/index.ts"],
      "@mp/ai/*": ["libs/ai/src/*"],
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
