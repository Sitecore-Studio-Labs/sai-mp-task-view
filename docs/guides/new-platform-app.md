# Adding a New Platform App

This guide walks through adding a new platform integration (e.g. Trello, Asana, Wrike) from scratch using the NX workspace generator.

The generator reads a **capability YAML file** you write, scaffolds the entire Next.js app structure, generates conditional API route stubs based on what the platform supports, and registers the project with NX. After running it, your job is to implement the platform adapter and fill in the API routes.

---

## Prerequisites

- Node.js ≥ 20
- `npm install` already run at the workspace root
- An account / API credentials for the target platform

---

## Step 1 — Write the capability YAML

Create `capabilities/<platform>.yaml` at the workspace root. This file is the source of truth for what the platform supports. The generator reads it to decide which API routes to generate and how to configure the capabilities provider.

```yaml
# capabilities/trello.yaml

extends: base # inherits all capability defaults (false) from capabilities/base.yaml

platform:
  name: trello # used as slug in API routes and directories
  displayName: Trello # shown in UI
  connectionTitle: Connect to Trello # heading on the connection screen
  connectionDescription: >
    Link your Trello account to manage cards directly from the editor sidebar.

capabilities:
  hasIssueTypes: false # Trello doesn't have issue types
  hasPriorities: false # no built-in priority field
  hasAssignees: true
  hasDueDate: true
  hasParentIssue: false
  hasAttachments: true
  hasComments: true
  hasSubtasks: false
  hasStatusTransitions: true # moving cards between lists
  hasAiWorkBreakdown: false
  richTextFormat: plain # "adf" | "markdown" | "plain"
  hasSites: false # single-workspace, no multi-tenant site selection
  hasSetupWizard: true # user must pick a default board before tasks load

setup:
  scopeLevels:
    - id: board
      label: Board
      listSource: boards
      isTaskListScope: true
  taskListScopeLevelId: board
  externalResourceMappings: true # optional: map Sitecore websites → task-list scope for context

auth:
  type: oauth2-refresh # "oauth2-refresh" | "oauth2-static" | "oauth1" | "api-key"
  oauth2:
    authorizeUrl: https://trello.com/1/authorize
    tokenUrl: https://trello.com/1/OAuthGetAccessToken
    scopes: ["read", "write"]
    # Optional — set when the OAuth token response contains a `host` field that
    # identifies the data-centre the user's account lives on (e.g. Wrike).
    # Setting this generates src/lib/<platform>Host.ts (SSRF allowlist validator)
    # and src/lib/repair<Platform>PlatformSite.ts (backfill for legacy connections).
    hasDynamicHost: false
    # If hasDynamicHost is true, set these to auto-generate the post-auth profile fetch:
    postAuthProfileEndpoint: /api/v4/contacts?me=true # path appended to the dynamic host
    postAuthIdPath: data[0].id # JSONPath to extract the userId
    # POST endpoint to revoke the access token on disconnect (generates revoke call in disconnect route).
    revokeEndpoint: https://login.platform.com/oauth2/revoke
```

The `auth:` block drives the generated `src/lib/authStrategy.ts` — a single file that wires up token exchange, refresh, and revocation using `@mp/auth`. Route handlers import `authStrategy` directly and never deal with auth mechanics themselves.

> **Dynamic hosts** (`hasDynamicHost: true`): Some platforms (e.g. Wrike) route API calls to a per-account data centre and include the host URL in the OAuth token response. When this flag is set the generator produces `src/lib/<Platform>Host.ts` with an SSRF-safe host validator and `isPlaceholder*` helpers, plus `src/lib/repair<Platform>PlatformSite.ts` to backfill the host for connections created before the host was stored.

### Capability reference

| Key                    | Type   | Effect when `true`                                                                                                                                                  |
| ---------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hasIssueTypes`        | bool   | Generates `GET /api/<platform>/issue-types`; shows issue type field in form                                                                                         |
| `hasPriorities`        | bool   | Generates `GET /api/<platform>/project-priorities`; shows priority field                                                                                            |
| `hasAssignees`         | bool   | Generates assignees + current-user routes; shows assignee field                                                                                                     |
| `hasDueDate`           | bool   | Shows due date field in form                                                                                                                                        |
| `hasParentIssue`       | bool   | Shows parent issue picker in form                                                                                                                                   |
| `hasAttachments`       | bool   | Generates `GET/DELETE /api/<platform>/attachment/[id]` and `POST …/issues/[id]/attachments`; create/edit providers use `usePlatformUploadAttachments` from `@mp/ui` |
| `hasComments`          | bool   | Generates `GET/POST /api/<platform>/comments`; shows comment section                                                                                                |
| `hasCommentReplies`    | bool   | Enables Reply UI and forwards `replyToCommentId` / author fields in `AddCommentPayload`                                                                             |
| `hasSubtasks`          | bool   | Enables subtask display in task details                                                                                                                             |
| `hasStatusTransitions` | bool   | Generates `GET/POST /api/<platform>/issues/[id]/transitions`; shows status picker                                                                                   |
| `hasAiWorkBreakdown`   | bool   | Generates AI parse-requirements + workbreakdown CRUD routes                                                                                                         |
| `dueDateDisplay`       | string | `"date"` or `"datetime"` — read-only due date formatting in task details (`PPP` / `PPP p`)                                                                          |
| `richTextFormat`       | string | `"adf"`, `"markdown"`, or `"plain"` — format used by the platform for descriptions                                                                                  |
| `hasSites`             | bool   | Generates sites + select-site routes; shows site picker on connect screen                                                                                           |
| `hasSetupWizard`       | bool   | Generates setup routes and API paths; requires a `setup:` block (see below)                                                                                         |

### Setup scope levels (`setup:` block)

When `hasSetupWizard: true`, add a `setup:` block declaring the platform hierarchy. The shared UI renders one dropdown per level via `PlatformSetupScopePicker`; the leaf level gates the task list.

```yaml
setup:
  scopeLevels:
    - id: site # stable key stored in scopeSelections JSON
      label: Site # dropdown label
      listSource: sites # BFF alias — see table below
    - id: project
      label: Project
      listSource: projects
      parentLevelId: site # defers loading until parent is selected
      isTaskListScope: true # marks the leaf level
  taskListScopeLevelId: project # must match a scopeLevels[].id
  externalResourceMappings: true # step 2: map external resources → scope (Jira only today)
```

| `listSource` | BFF route used by UI           | Typical platform      |
| ------------ | ------------------------------ | --------------------- |
| `sites`      | `GET /api/<platform>/sites`    | Jira Cloud instances  |
| `projects`   | `GET /api/<platform>/projects` | Jira projects         |
| `folders`    | `GET /api/<platform>/projects` | Wrike folders         |
| `boards`     | `GET /api/<platform>/projects` | Monday boards         |
| `workspaces` | `GET /api/<platform>/projects` | Asana workspaces (v2) |

`folders`, `boards`, and `workspaces` are **aliases** — they reuse the projects route because those entities are normalized as `PlatformProject` in the adapter. You do not need separate `/folders` or `/boards` API routes unless your adapter shape differs.

#### Reference configs (already in repo)

**Jira** — site → project, optional website mappings:

```yaml
# capabilities/jira.yaml
setup:
  scopeLevels:
    - id: site
      label: Site
      listSource: sites
    - id: project
      label: Project
      listSource: projects
      parentLevelId: site
      isTaskListScope: true
  taskListScopeLevelId: project
  externalResourceMappings: true
```

**Wrike** — single folder picker (no external-resource mapping step):

```yaml
# capabilities/wrike.yaml
setup:
  scopeLevels:
    - id: folder
      label: Folder
      listSource: folders
      isTaskListScope: true
  taskListScopeLevelId: folder
  externalResourceMappings: true # optional: map Sitecore websites → task-list scope for context
```

**Monday.com** — single board picker:

```yaml
# capabilities/monday.yaml
setup:
  scopeLevels:
    - id: board
      label: Board
      listSource: boards
      isTaskListScope: true
  taskListScopeLevelId: board
  externalResourceMappings: true # optional: map Sitecore websites → task-list scope for context
```

The generator reads `setup:` and emits `setupScope` on the platform capabilities provider. Shared constants also live in `@mp/task-core` as `JIRA_SETUP_SCOPE`, `WRIKE_SETUP_SCOPE`, and `MONDAY_SETUP_SCOPE`.

#### Persisting setup on the server

Setup records store generalized scope state in JSONB:

```json
{
  "scopeSelections": {
    "folder": { "id": "IEABC…", "key": "IEABC…", "name": "Marketing" }
  },
  "taskListScopeLevelId": "folder"
}
```

Jira dual-writes legacy columns (`jira_site_id`, `default_project_key`, …) during migration. New platforms should write `scope_selections` only.

Client upsert payload:

```typescript
import { buildUpsertPlatformSetupPayload } from "@mp/task-core";

await upsertSetup(buildUpsertPlatformSetupPayload(resolvedSelections, setupScope));
```

Use `getTaskListScopeKey(setup)` in the task manager to resolve which project/board/folder key loads issues.

### Auth types

| `auth.type`      | When to use                                                           |
| ---------------- | --------------------------------------------------------------------- |
| `oauth2-refresh` | OAuth 2.0 with expiring access tokens that need refresh (most common) |
| `oauth2-static`  | OAuth 2.0 where the access token doesn't expire                       |
| `oauth1`         | Legacy OAuth 1.0a (e.g. older APIs)                                   |
| `api-key`        | Simple API key stored per user (no OAuth flow)                        |

---

## Step 1b — (Optional) Write the API descriptor YAML

If you want the generator to produce ready-made normalizer functions (so you don't hand-write the raw→core type mappings), create a second YAML file at `capabilities/<platform>.api.yaml` **before** running the generator.

```yaml
# capabilities/trello.api.yaml

entities:
  tasks:
    list:
      response:
        fields:
          id: { from: id }
          key: { from: id } # Trello uses id as the task key
          name: { from: name }
          status: { from: fields.status, nullable: true }
          dueDate: { from: fields.due, nullable: true }

  comments:
    list:
      response:
        fields:
          id: { from: id }
          author: { from: memberCreator }
          body: { from: data.text }
          created: { from: date }

  projects:
    list:
      response:
        fields:
          id: { from: id }
          key: { from: id }
          name: { from: name }
```

Each field entry maps a field in the generated normalizer to a path in the raw API response.

**Field annotations:**

- **`from`** _(required)_ — Dot-path into the raw object (e.g. `dates.due`). Paths starting with `fields.` are nested inside a `fields: {}` block.
- **`nullable`** — When `true`, appends `?? undefined` to guard against absent fields.
- **`transform`** — `"self-array"` (recursive normalizeTask for subtasks), `"comments-array-wrapper"` (nested list), or a platform-specific string that emits a TODO stub.
- **`type`** — Explicit TypeScript type string for the generated interface (overrides name-based inference, e.g. `type: '"High" | "Normal" | "Low"'`).
- **`enumValues`** — List of allowed string values; generates a union type (e.g. `[High, Normal, Low]` → `"High" | "Normal" | "Low"`).

**Entity annotations:**

- **`requiresResolution`** — Array of `{ name, mapValueType, importedFrom }`. When present, the generated normalizer signature includes typed `Map<string, T>` parameters the adapter must inject. Use when raw fields are IDs that need lookup before normalization (see Wrike's `statusMap` and `contactMap` pattern).

When this file is present, the generator automatically runs `npx nx run <platform>:generate-mappings` as the final scaffold step, producing:

```text
apps/trello/src/platforms/trello/generated/
├── tasks.mapping.ts      — normalizeTask(raw): PlatformTask
├── comments.mapping.ts   — normalizeComment(raw): PlatformComment
├── projects.mapping.ts   — normalizeProject(raw): PlatformProject
└── index.ts
```

The service adapter template is also wired up to import and use these normalizers automatically. If you skip this step you will write the normalizer functions by hand in Step 4.

After editing `capabilities/<platform>.api.yaml` in the future, regenerate with:

```bash
npx nx run trello:generate-mappings

# CI guard — exits 1 if generated files have drifted from the YAML:
npx nx run trello:validate-mappings
```

---

## Step 2 — Run the generator

```bash
npx nx g @mp/generators:platform-app --name=trello --yamlFile=capabilities/trello.yaml
```

Or run it interactively (omit the flags and NX will prompt you):

```bash
npx nx g @mp/generators:platform-app
```

The generator will:

1. Parse your YAML
2. Write all scaffold files into `apps/trello/`
3. Generate conditional API route stubs
4. Register `trello` as an NX project
5. On first-time generation (default), create an initial git commit: `chore: scaffold <platform> app`

Use `--initialCommit=false` to skip the commit, or `--dryRun` to preview changes without writing files.

---

## Post-scaffold checklist

The generator produces a **compilable skeleton**, not a working integration. After `nx g @mp/generators:platform-app`, work through this list before expecting tasks, filters, or attachments to function end-to-end.

### Commit order

1. **Shared libraries first** — If you added or changed `@mp/ui` or `@mp/task-core` hooks (e.g. `usePlatformUploadAttachments`), merge those **before** or **in the same PR** as the first platform scaffold. Generated create/edit providers import from `@mp/ui`; another clone that only has `apps/<platform>/` will not build without the matching lib exports.
2. **Initial scaffold commit** — By default the generator commits only:
   - `apps/<platform>/`
   - `eslint.config.mjs`, `tsconfig.base.json`
   - `libs/task-core/src/constants/systems.ts` and `platformSetupScopes.ts` (when present)
   - `supabase/migrations/` and `supabase/schema.sql`

   It does **not** commit `libs/ui` changes. Keep framework and app commits separate when possible.

3. **Implementation commits** — Platform-specific adapter, enrichment, filters, and route handler bodies belong in follow-up commits on the same branch.

### What the generator provides vs what you implement

| Provided by generator                                      | You implement manually                                                                 |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Route stubs (`withAdapter`, TODO bodies)                   | HTTP adapter methods (`*Adapter.ts`)                                                   |
| `*ServiceAdapter.ts` bridge (basic or TODO stubs)          | Full `getTasks` / `getTask` when API YAML uses enrichment transforms                   |
| Create/edit providers wired to `@mp/ui` hooks              | `*TaskFilters.ts` or equivalent (query-param + client-side filter mapping)             |
| `POST …/issues/[id]/attachments` when `hasAttachments`     | `addAttachment` in adapter (merge auth headers with `form.getHeaders()` for multipart) |
| `capabilities/<platform>.api.yaml` → `generated/` mappings | `*Enrichment.ts`, `*Payloads.ts` when statuses/users need ID resolution                |
| Contract test stub                                         | Mock adapter + passing contract suite                                                  |

### Enrichment platforms (`*.api.yaml` with ID-resolution transforms)

When field mappings reference related entities (workflows, contacts, custom statuses), the generator sets `hasEnrichmentTransforms` and emits **TODO stubs** for `getTasks`, `getTask`, and `buildEnrichmentContext` in `*ServiceAdapter.ts`. The app compiles but returns empty tasks until you:

1. Implement `buildEnrichmentContext` (load lookup maps).
2. Wire `getTasks` / `getTask` to call the HTTP adapter, enrich, then normalize.
3. Add any platform-specific helpers (e.g. workflow/space resolution, logical-folder handling).

See `apps/wrike` for a reference: `wrikeEnrichment.ts`, `wrikePayloads.ts`, `wrikeTaskFilters.ts`.

### Attachments (`hasAttachments: true`)

- **UI** — Shared `TaskDetails` and create/edit providers in `@mp/ui` handle upload and preview; no per-app React duplication needed.
- **BFF** — Generator creates download (`attachment/[id]`) and upload (`issues/[id]/attachments`) routes.
- **Adapter** — Implement `addAttachment`, `getAttachmentContent`, and `deleteAttachment` on the HTTP adapter. For multipart uploads, never let `form.getHeaders()` replace the `Authorization` header; merge both.

### Re-scaffolding an existing app

`writeRouteStub` skips files that already exist. If an app was scaffolded before a generator fix (e.g. upload route), run with `--update` to add **new** stubs only, or add missing routes by hand. Use `--force` only when you intend to overwrite manual edits.

### Verify before merging

```bash
npx nx run <platform>:typecheck
npx nx run <platform>:test
npx nx run <platform>:audit-capabilities
npx nx run <platform>:validate-mappings    # when *.api.yaml exists
npx nx run <platform>:validate-http-adapter
```

---

## Step 3 — Review what was generated

```text
apps/trello/
├── .env.example                                # all required env vars with placeholder values — cp to .env.local
├── next.config.ts                              # transpilePackages, UiShadowResolverPlugin
├── tsconfig.json                               # extends tsconfig.base.json + path aliases
├── vercel.json                                 # Vercel build command + output directory
├── src/
│   ├── app/
│   │   ├── globals.css                         # Tailwind v4 config: @theme, :root, .dark tokens
│   │   ├── layout.tsx                          # root layout with <Providers>
│   │   ├── page.tsx                            # placeholder home
│   │   ├── Providers.tsx                       # QueryClient + platform providers
│   │   ├── task-manager-extension/
│   │   │   └── page.tsx                        # iframe entry point
│   │   └── api/
│   │       ├── auth/trello/
│   │       │   ├── connect/route.ts            # redirect to OAuth
│   │       │   ├── callback/route.ts           # exchange code for tokens  [hasOAuth]
│   │       │   ├── refresh/route.ts            # refresh access token       [hasOAuth]
│   │       │   ├── status/route.ts             # check connection status
│   │       │   └── disconnect/route.ts         # revoke + clear tokens
│   │       └── trello/
│   │           ├── projects/route.ts           # list boards/projects (uses withAdapterOrEmpty)
│   │           ├── select-project/route.ts     # persist selected project
│   │           ├── issues/route.ts             # list + create cards/issues
│   │           ├── issues/[issueIdOrKey]/
│   │           │   ├── route.ts                # get + update + delete
│   │           │   └── transitions/route.ts    # status transitions [hasStatusTransitions]
│   │           ├── statuses/[projectKey]/route.ts
│   │           ├── assignees/route.ts          # [hasAssignees]
│   │           ├── current-user/route.ts       # [hasAssignees]
│   │           ├── comments/route.ts           # [hasComments]
│   │           ├── attachment/[id]/route.ts    # GET/DELETE [hasAttachments]
│   │           ├── issues/[issueIdOrKey]/attachments/route.ts  # POST upload [hasAttachments]
│   │           └── permissions/route.ts
│   ├── components/
│   │   ├── connections/
│   │   │   ├── ConnectTrelloButton.tsx         # connect CTA
│   │   │   └── ConnectionScreen.tsx            # wraps lib ConnectionScreen
│   │   ├── task-manager/
│   │   │   └── TaskManagerLayout.tsx           # wraps lib TaskManagerLayout
│   │   └── tasks/
│   │       └── task-form/
│   │           └── TaskFormHeader.tsx          # shadow: back button with platform name
│   ├── exceptions/
│   │   └── trelloErrors.ts                     # TrelloAuthError class
│   ├── helpers/
│   │   ├── cookies.ts                          # session cookie name + clear helper
│   │   └── trelloUserId.ts                     # session → userId resolver [hasOAuth: TODO stub otherwise]
│   ├── lib/
│   │   ├── apiPaths.ts                         # TRELLO_API_PATHS constant
│   │   ├── authStrategy.ts                     # OAuth/API-key strategy — fully generated, no TODOs
│   │   ├── axiosClient.ts                      # Axios instance + interceptors
│   │   ├── platformRoute.ts                    # withAdapter() + withAdapterOrEmpty() helpers
│   │   ├── storeConfig.ts                      # TRELLO_STORE_CONFIG (Supabase table/column names)
│   │   ├── trelloHost.ts                       # SSRF-safe host validator  [hasDynamicHost only]
│   │   └── repairTrelloPlatformSite.ts         # backfill host for legacy connections  [hasDynamicHost only]
│   ├── platforms/
│   │   ├── trello/
│   │   │   ├── TrelloAdapter.ts                # raw HTTP adapter — owns all API calls (see Step 4)
│   │   │   ├── TrelloHttpAdapter.ts            # interface contract — declares every public method
│   │   │   └── generated/                      # auto-generated from capabilities/trello.api.yaml
│   │   │       ├── tasks.mapping.ts
│   │   │       ├── comments.mapping.ts
│   │   │       └── index.ts
│   │   └── TrelloServiceAdapter.ts             # PlatformServiceAdapter bridge (see Step 4)
│   ├── services/
│   │   ├── trelloService.ts                    # getTrelloApiContext() — fully generated, no TODOs
│   │   └── trelloSetupService.ts               # setup CRUD (DB layer) — generated  [hasSetupWizard only]
│   ├── types/
│   │   └── trello.ts                           # raw Trello API shapes — generated from api.yaml
│   └── providers/
│       ├── TrelloPlatformApiProvider.tsx       # injects apiPaths + axiosClient
│       ├── TrelloPlatformCapabilitiesProvider.tsx  # capability flags from YAML
│       ├── auth-providers/
│       │   └── TrelloAuthFailureProvider.tsx   # [hasOAuth]
│       └── task-manager/
│           └── TaskManagerProvider.tsx         # create/edit task state
```

Route stubs have `// TODO:` comments where implementation is needed. Capability-gated methods on `TrelloServiceAdapter` that are `false` in the YAML have no `// TODO:` — their empty return is the final correct implementation. The scaffold compiles cleanly out of the box.

---

## Step 4 — Implement the adapter layer

The generated platform code follows a **three-layer pattern**. Work through the layers in order:

### Layer 1 — Define your types (`src/types/trello.ts`)

This file is generated with documented stubs for every type the adapter needs: `TrelloProject`, `TrelloTask`, `TrelloComment`, `TrelloUser`, `TrelloTaskFilters`, `TrelloCreateTaskPayload`, `TrelloUpdateTaskPayload`, plus a section for platform-specific extras.

Fill in each interface with the real field names from the Trello API docs. These are **raw API shapes** — never `@mp/task-core` types. The mapping to core types happens in Layer 3.

See `apps/jira/src/types/jira.ts` for a fully implemented example.

### Layer 2 — HTTP adapter (`src/platforms/trello/TrelloAdapter.ts`)

This class owns all API communication for the platform. It:

- Creates an Axios instance pointed at `baseUrl + TRELLO_API_PATH`
- Adds auth headers via a private `auth(token)` method
- Has one method per API endpoint, returning types from `src/types/trello.ts`

Every method has a `// TODO:` — replace the stub URL and return cast with a real call once you know the endpoint shape. The generated API path constant is:

```ts
const TRELLO_API_PATH = "/api/v1"; // TODO: update to the correct version path
```

Do **not** import `@mp/task-core` types here. All return types must be from `src/types/trello.ts`.

### Layer 3 — Service adapter (`src/platforms/TrelloServiceAdapter.ts`)

This class implements `PlatformServiceAdapter` from `@mp/task-core` — the interface the UI depends on. It bridges Layer 2 to the core types:

```ts
async getTasks(projectKey: string): Promise<PlatformTasksPageResponse> {
  const { adapter, token } = await getTrelloApiContext(this.userId);
  const raw = await adapter.getTasks(token, projectKey);      // TrelloTask[]
  return { issues: raw.map(mapTrelloTaskToPlatform), isLast: true };
}
```

Methods for capabilities set to `false` in your YAML are already correct as generated — they return an empty value with no `// TODO:`. Only implement the methods that have `// TODO:` comments.

### Comment replies (`hasCommentReplies`)

When `hasCommentReplies: true` in your capability YAML:

1. **UI** — `libs/ui` shows the Reply menu and sends `AddCommentPayload` with optional `replyToCommentId`, `replyToAuthorId`, and `replyToAuthorDisplayName`. No app changes needed.
2. **Route** — the generated `comments/route.ts` passes the full `AddCommentPayload` to `adapter.createComment()`.
3. **Service adapter** — map reply fields to your platform API in `createComment()` (see generated TODO stubs). Reference: `apps/jira` uses `parentId` + ADF `@mention`; mention-only platforms can prefix `@DisplayName` in plain text.
4. **API descriptor** — in `capabilities/<platform>.api.yaml`, map `parentCommentId` on read and reply fields on create. See `capabilities/jira.api.yaml` and `capabilities/monday.api.yaml`.
5. **Contract tests** — use `FIXTURE_ADD_COMMENT_REPLY_PAYLOAD` from `@mp/adapter-test-kit` when wiring mocks.

Set `hasCommentReplies: false` (the base default) for platforms with flat comments only (e.g. Trello).

### Setup wizard checklist (`hasSetupWizard`)

When `hasSetupWizard: true`:

1. **YAML** — add the `setup:` block (see [Setup scope levels](#setup-scope-levels-setup-block) above).
2. **Capabilities provider** — generator emits `setupScope` from YAML; verify with `npx nx run <platform>:check-sync`.
3. **Projects route** — implement `GET /api/<platform>/projects` returning `PlatformProject[]`. For Wrike this lists folders; for Monday, boards. Both use `id` as `key` when the platform has no separate key field.
4. **Setup routes** — implement `POST /api/setup` accepting `UpsertPlatformSetupPayload` with `scopeSelections` + `taskListScopeLevelId`. Persist to `scope_selections` JSONB on your setup table.
5. **Adapter** — scope task queries to the selected folder/board/project key from setup (`getTaskListScopeKey`).
6. **Settings panel** — generated `<Platform>SettingsPanel` uses `PlatformSetupScopePicker`; wire `upsertUserSetup` to read/write `scope_selections`.

Skip mapping routes/tables when `externalResourceMappings: false`. Wrike and Monday use mappings with a single task-list scope (folder/board) and no tenant site picker.

### Service layer (`src/services/`)

**`trelloService.ts`** — fully generated, no TODOs. Exports a single function:

```ts
getTrelloApiContext(userId: string): Promise<{ adapter: TrelloAdapter; token: PlatformToken }>
```

Every `TrelloServiceAdapter` method calls this to get a ready-to-use adapter + valid token. You do not need to edit this file unless you add API routes that bypass `TrelloServiceAdapter` (e.g. a webhook handler).

**`trelloSetupService.ts`** — generated when `hasSetupWizard: true`. Contains the full Supabase database layer for user setup: `getUserSetup`, `upsertUserSetup`, `completeUserSetup`, `getUserSetupMappings`, `upsertUserSetupMappings`, `hasUserConnection`, and `getUserConnection`. The implementation is derived from the `setup:` block in your YAML. You only need to fill in any platform-specific validation (e.g. an SSRF host check in `getUserConnection` when `hasDynamicHost: true`).

> **Do not add platform-specific React hooks.** Use the generic hooks from `@mp/ui` (`usePlatformAssignees`, `usePlatformCurrentUser`, `usePlatformConnectionStatus`) — they work for any platform via the `PlatformApiProvider` context that the scaffold already sets up.

---

## Step 5 — Implement auth routes

The generated auth routes under `src/app/api/auth/trello/` are stubs. Fill them in:

### `connect/route.ts`

Redirect the user to the platform's OAuth authorization URL (or accept an API key, depending on the platform).

### `callback/route.ts` _(hasOAuth)_

Exchange the `code` query parameter for access + refresh tokens. Store them via `SupabaseTokenStore` and set the session cookie. Redirect back to the app.

### `refresh/route.ts` _(hasOAuth)_

Use the stored refresh token to obtain a new access token. Return `{ accessToken, refreshToken, expiry, tokenType }`.

### `status/route.ts`

Check whether the current user has an active connection. Return `{ connected: boolean }`.

### `disconnect/route.ts`

Revoke the platform token and clear stored credentials.

The `axiosClient.ts` generated by the scaffold includes request interceptors that call `/api/auth/<platform>/refresh` automatically on 401 responses — wire up the `refresh/route.ts` implementation and the refresh loop works with no additional effort.

### `src/helpers/trelloUserId.ts`

For **OAuth platforms** (`hasOAuth: true`) this file is fully generated — it reads the session cookie and resolves the userId via `SupabaseTokenStore.lookupSession`. No changes needed.

For **non-OAuth platforms** (`hasOAuth: false`, e.g. API key) a `// TODO:` stub is generated instead. Implement `getTrelloUserIdFromSession` to return the userId (the key used to look up the user's stored credentials in Supabase) or `null` if the request is unauthenticated. Common patterns: decode a JWT from an Authorization header, look up an API key owner, or read from a Supabase auth session.

---

## Step 6 — Environment variables

The generator creates a `.env.example` in `apps/trello/` listing every variable the app needs, with placeholder values. Copy it to `.env.local` and fill in your real credentials:

```bash
cp apps/trello/.env.example apps/trello/.env.local
```

The generated `src/lib/config.ts` validates `process.env` against a Zod schema at startup using `validateEnv` from `@mp/shared` — it will throw a readable error on boot if any required variable is missing.

```bash
# OAuth
TRELLO_CLIENT_ID=
TRELLO_CLIENT_SECRET=
TRELLO_REDIRECT_URI=http://localhost:3000/api/auth/trello/callback

# Storage (Supabase or equivalent)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Step 7 — Run and verify

Add a serve script for the new app if it's not already in the root `package.json`, or target it directly with NX:

```bash
npx nx run trello:serve
# equivalent:
npx nx serve trello
```

The generated `serve` target runs `next dev --webpack` from `apps/trello/` so **component shadowing** uses the webpack resolver plugin (see [component-shadowing.md](../architecture/component-shadowing.md) — especially the “Nx commands and which dev bundler you get” section). Avoid starting the app with plain `npx next dev` from the app folder unless you pass `--webpack` (or you understand Turbopack-only behaviour).

Open `http://localhost:3000/task-manager-extension` — you should see the connection screen with the title and description from your YAML.

Walk through the connection flow, then verify that:

- The connection status endpoint returns `{ connected: true }` after auth
- The project list loads
- Issues load for a selected project
- Creating a task round-trips correctly

---

## Step 8 — Use the platform tooling

Every generated app has these NX targets to help you keep the app healthy as the codebase evolves:

```bash
# Full health check — routes, provider sync, open TODOs, adapter template sync
npx nx run trello:audit-capabilities

# Check if the capabilities provider matches capabilities/trello.yaml
npx nx run trello:check-sync

# Regenerate the capabilities provider after editing trello.yaml
npx nx run trello:sync-capabilities

# Preview what the generator templates would change vs what's on disk
npx nx run trello:check-template-drift

# Regenerate entity normalizers from capabilities/trello.api.yaml
npx nx run trello:generate-mappings

# CI guard — exits 1 if generated normalizer files drifted from the YAML
npx nx run trello:validate-mappings

# CI guard — exits 1 if any public async method in TrelloAdapter is missing
# from TrelloHttpAdapter (interface completeness check)
npx nx run trello:validate-http-adapter
```

Run `audit-capabilities` after the initial scaffold to confirm everything is wired up correctly, and again after making structural changes. Add `validate-mappings` and `validate-http-adapter` to your CI pipeline to catch drift early.

---

## Step 9 — Deploy to Vercel

The generator creates a `vercel.json` in `apps/trello/` that configures the build command and output directory for Vercel.

### One-time project setup in the Vercel dashboard

Each platform app needs its own Vercel project. When creating (or configuring) the project:

1. **Root Directory** — set to `apps/trello`
   This tells Vercel to run the build from inside the app directory. The `cd ../..` in the build command then walks back up to the monorepo root where NX lives.

2. **Framework Preset** — Vercel auto-detects Next.js; leave as-is.

3. **Build Command / Output Directory / Install Command** — leave all as "Override" (blank). The `vercel.json` inside `apps/trello/` supplies these automatically once Root Directory is set.

> **Why Root Directory matters:** `next build` runs with cwd `apps/trello/` and writes `.next/` there. Vercel looks for `.next/routes-manifest.json` relative to the Root Directory — so setting Root Directory to `apps/trello` makes Vercel and `next build` agree on the same location.

### Environment variables on Vercel

Add the same variables from your `.env.local` in the Vercel project's **Settings → Environment Variables** panel. At minimum:

```bash
TRELLO_CLIENT_ID
TRELLO_CLIENT_SECRET
TRELLO_REDIRECT_URI          # e.g. https://trello.yourapp.com/api/auth/trello/callback
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL          # your production domain
```

### Deploying multiple apps from the same repo

Create a separate Vercel project per app (e.g. one for Jira, one for Wrike, one for Trello). Each project points to its own Root Directory. Vercel reads the `vercel.json` from that subdirectory, so every project gets its own correct build command automatically.

---

## Adding a new capability flag

If the platform supports a feature that doesn't have a flag yet (e.g. `hasWorklog`):

```bash
node tools/add-capability.js hasWorklog "Platform supports time-tracking on tasks."
```

This updates `capability-flags.json`, the `PlatformCapabilities` TypeScript interface, and `capabilities/base.yaml` atomically. Then follow the printed instructions to gate the UI, add a generator stub, and opt platforms in via their YAML.

---

## Customising UI for the new app

Any component from `libs/ui` can be overridden per-app without touching the library. See [component-shadowing.md](../architecture/component-shadowing.md) for details.

The scaffold includes a ready-to-customise `TaskFormHeader` shadow at `apps/trello/src/components/tasks/task-form/TaskFormHeader.tsx`. It already renders "Back to Trello" in the create/edit form header — edit that file to change the branding however you like.

For **form-field components** (assignee picker, priority selector, issue-type dropdown, etc.) use `create-shadow` to generate a boilerplate shadow that keeps all react-hook-form wiring intact:

```bash
npm run create-shadow -- trello components/tasks/task-form/TaskFormAssigneeField
```

The script writes `apps/trello/src/components/tasks/task-form/TaskFormAssigneeField.tsx` with the correct imports, a contract comment listing every `Controller` and `field.onChange` call that must be preserved, and `// TODO` placeholders where the UI goes. See [component-shadowing.md](../architecture/component-shadowing.md#the-fast-path--create-shadow-recommended-for-form-field-components) for a full walkthrough.

For **display components** (headers, badges, layout wrappers) without form wiring, place the file at `apps/trello/src/` at the same sub-path as in `libs/ui/src/` and restart the dev server.

---

## Contract testing

Every new `PlatformServiceAdapter` must pass the full adapter contract suite before merging.
The suite lives in `libs/adapter-test-kit` and verifies all 23 methods of `PlatformServiceAdapter`
return correctly-shaped `@mp/task-core` types.

### How to write the contract test

The generator scaffolds a contract test stub at
`apps/<platform>/src/platforms/__tests__/<Platform>ServiceAdapter.contract.spec.ts`
automatically. Open the generated file and replace every `STUB_*` key with the real
function name exported by `@/services/<platform>Service`, updating each
`mockResolvedValue` to return the raw platform API shape your normalizers expect.

If you are adding a contract test manually, create the file following this pattern:

```ts
import { runAdapterContractSuite } from "@mp/adapter-test-kit";
import { vi } from "vitest";

import { TrelloServiceAdapter } from "../TrelloServiceAdapter";

// vi.mock is hoisted. Define all mock data inside vi.hoisted() to avoid
// "Cannot access before initialization" errors.
const mocks = vi.hoisted(() => ({
  getTrelloProjectsForUser: vi
    .fn()
    .mockResolvedValue([{ id: "board-1", key: "BOARD-1", name: "My Board" }]),
  // ... mock all functions imported from @/services/trelloService
}));

vi.mock("@/services/trelloService", () => mocks);

runAdapterContractSuite(() => new TrelloServiceAdapter("test-user-id"));
```

See `apps/jira/src/platforms/__tests__/JiraServiceAdapter.contract.spec.ts` for a complete
reference implementation.

### Route / auth unit tests

The generator also scaffolds route-level Vitest specs under
`apps/<platform>/src/test/__tests__/<platform>/` (Jira layout):

| Spec                                             | Covers                                                    |
| ------------------------------------------------ | --------------------------------------------------------- |
| `<platform>-issues-get.spec.ts`                  | `GET /api/<platform>/issues`                              |
| `<platform>-issues-post.spec.ts`                 | `POST /api/<platform>/issues`                             |
| `<platform>-projects.spec.ts`                    | `GET /api/<platform>/projects` (`emptyOnNoAuth`)          |
| `auth-<platform>-status.spec.ts`                 | `GET /api/auth/<platform>/status`                         |
| `auth-<platform>-refresh.spec.ts`                | `POST /api/auth/<platform>/refresh` (oauth2-refresh only) |
| `auth-negative.spec.ts`                          | disconnect + comments/transitions auth rejection          |
| `helpers/get<Platform>UserIdFromSession.spec.ts` | session cookie → account id                               |

These are written on first scaffold and on `--update` when missing (idempotent).
Assertions match generated `withAdapter` / auth route behavior — not Jira-only quirks.

Run them with:

```bash
npx nx run <platform>:test
```

### Requirements

- The contract test must pass (`npx vitest run apps/<platform>/src/platforms/__tests__/`) **before** opening a PR.
- Mock every function imported from `@/services/<platform>Service` — do not let tests hit real Supabase or platform APIs.
- Verify the test count: `runAdapterContractSuite` runs 33 assertions; if the count is lower, a method is missing from the adapter.
