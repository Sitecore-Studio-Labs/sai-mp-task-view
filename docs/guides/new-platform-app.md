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

auth:
  type: oauth2-refresh # "oauth2-refresh" | "oauth2-static" | "oauth1" | "api-key"
  oauth2:
    authorizeUrl: https://trello.com/1/authorize
    tokenUrl: https://trello.com/1/OAuthGetAccessToken
    scopes: ["read", "write"]
```

The `auth:` block drives the generated `src/lib/authStrategy.ts` — a single file that wires up token exchange, refresh, and revocation using `@mp/auth`. Route handlers import `authStrategy` directly and never deal with auth mechanics themselves.

### Capability reference

| Key                    | Type   | Effect when `true`                                                                |
| ---------------------- | ------ | --------------------------------------------------------------------------------- |
| `hasIssueTypes`        | bool   | Generates `GET /api/<platform>/issue-types`; shows issue type field in form       |
| `hasPriorities`        | bool   | Generates `GET /api/<platform>/project-priorities`; shows priority field          |
| `hasAssignees`         | bool   | Generates assignees + current-user routes; shows assignee field                   |
| `hasDueDate`           | bool   | Shows due date field in form                                                      |
| `hasParentIssue`       | bool   | Shows parent issue picker in form                                                 |
| `hasAttachments`       | bool   | Generates `GET/DELETE /api/<platform>/attachment/[id]`; shows attachment field    |
| `hasComments`          | bool   | Generates `GET/POST /api/<platform>/comments`; shows comment section              |
| `hasSubtasks`          | bool   | Enables subtask display in task details                                           |
| `hasStatusTransitions` | bool   | Generates `GET/POST /api/<platform>/issues/[id]/transitions`; shows status picker |
| `hasAiWorkBreakdown`   | bool   | Generates AI parse-requirements + workbreakdown CRUD routes                       |
| `richTextFormat`       | string | `"adf"` (Atlassian), `"markdown"`, or `"plain"` — controls description renderer   |
| `hasSites`             | bool   | Generates sites + select-site routes; shows site picker on connect screen         |

### Auth types

| `auth.type`      | When to use                                                           |
| ---------------- | --------------------------------------------------------------------- |
| `oauth2-refresh` | OAuth 2.0 with expiring access tokens that need refresh (most common) |
| `oauth2-static`  | OAuth 2.0 where the access token doesn't expire                       |
| `oauth1`         | Legacy OAuth 1.0a (e.g. older APIs)                                   |
| `api-key`        | Simple API key stored per user (no OAuth flow)                        |

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

---

## Step 3 — Review what was generated

```text
apps/trello/
├── next.config.mjs                             # transpilePackages, image domains
├── tsconfig.json                               # extends tsconfig.base.json + path aliases
├── src/
│   ├── app/
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
│   │           ├── projects/route.ts           # list boards/projects
│   │           ├── select-project/route.ts     # persist selected project
│   │           ├── issues/route.ts             # list + create cards/issues
│   │           ├── issues/[issueIdOrKey]/
│   │           │   ├── route.ts                # get + update + delete
│   │           │   └── transitions/route.ts    # status transitions [hasStatusTransitions]
│   │           ├── statuses/[projectKey]/route.ts
│   │           ├── assignees/route.ts          # [hasAssignees]
│   │           ├── current-user/route.ts       # [hasAssignees]
│   │           ├── comments/route.ts           # [hasComments]
│   │           ├── attachment/[id]/route.ts    # [hasAttachments]
│   │           └── permissions/route.ts
│   ├── components/
│   │   ├── connections/
│   │   │   ├── ConnectTrelloButton.tsx         # connect CTA
│   │   │   └── ConnectionScreen.tsx            # wraps lib ConnectionScreen
│   │   └── task-manager/
│   │       └── TaskManagerLayout.tsx           # wraps lib TaskManagerLayout
│   ├── lib/
│   │   ├── apiPaths.ts                         # TRELLO_API_PATHS constant
│   │   ├── axiosClient.ts                      # Axios instance + interceptors
│   │   └── platformRoute.ts                    # withAdapter() helper
│   ├── platforms/
│   │   └── TrelloServiceAdapter.ts             # ← implement this (see Step 4)
│   └── providers/
│       ├── TrelloPlatformApiProvider.tsx       # injects apiPaths + axiosClient
│       ├── TrelloPlatformCapabilitiesProvider.tsx  # capability flags from YAML
│       ├── auth-providers/
│       │   └── TrelloAuthFailureProvider.tsx   # [hasOAuth]
│       └── task-manager/
│           └── TaskManagerProvider.tsx         # create/edit task state
```

All route stubs have `// TODO:` comments marking what needs to be implemented. The scaffold compiles cleanly out of the box; you build on top of it.

---

## Step 4 — Implement the adapter

Open `apps/trello/src/platforms/TrelloServiceAdapter.ts`. The generator scaffolds a class that implements `PlatformServiceAdapter` from `@mp/task-core` with stub method bodies that throw `"not implemented"` errors.

Implement each method by calling the Trello API through the platform's HTTP client. The required method signatures come from `BasePlatformAdapter` — TypeScript will error on any missing or mismatched implementation.

Key methods to implement:

```ts
// Required by all platforms
getProjects(): Promise<ProjectOption[]>
getTasks(projectKey: string, cursor?: string): Promise<PaginatedTasks>
getTask(issueIdOrKey: string): Promise<TaskDetail>
createTask(payload: CreateTaskPayload): Promise<{ key: string }>
updateTask(issueIdOrKey: string, payload: UpdateTaskPayload): Promise<void>
deleteTask(issueIdOrKey: string): Promise<void>
getProjectStatuses(projectKey: string): Promise<StatusOption[]>
getPermission(permission: string, context: PermissionContext): Promise<boolean>

// Conditional — only if capability is true
getIssueTypes(projectId: string): Promise<IssueTypeOption[]>    // hasIssueTypes
getPriorities(): Promise<PriorityOption[]>                       // hasPriorities
getAssignees(opts): Promise<AssigneeOption[]>                    // hasAssignees
getCurrentUser(): Promise<CurrentUser>                           // hasAssignees
getComments(issueIdOrKey: string): Promise<Comment[]>            // hasComments
createComment(payload: AddCommentPayload): Promise<void>         // hasComments
getTransitions(issueIdOrKey: string): Promise<Transition[]>      // hasStatusTransitions
changeStatus(issueIdOrKey: string, transitionId: string)         // hasStatusTransitions
getAttachmentContent(attachmentId: string): Promise<AttachmentContent> // hasAttachments
deleteAttachment(attachmentId: string): Promise<void>            // hasAttachments
```

Use the Jira adapter (`apps/jira/src/platforms/`) as a reference implementation.

---

## Step 5 — Implement auth routes

The generated auth routes under `src/app/api/auth/trello/` are stubs. Fill them in:

### `connect/route.ts`

Redirect the user to the platform's OAuth authorization URL (or accept an API key, depending on the platform).

### `callback/route.ts` _(hasOAuth)_

Exchange the `code` query parameter for access + refresh tokens. Store them securely (Supabase `jira_connections` table or equivalent). Redirect back to the app.

### `refresh/route.ts` _(hasOAuth)_

Use the stored refresh token to obtain a new access token. Return `{ accessToken, refreshToken, expiry, tokenType }`.

### `status/route.ts`

Check whether the current user has an active connection. Return `{ connected: boolean }`.

### `disconnect/route.ts`

Revoke the platform token and clear stored credentials.

The `axiosClient.ts` generated by the scaffold includes request interceptors that call `/api/auth/<platform>/refresh` automatically on 401 responses — wire up the `refresh/route.ts` implementation and the refresh loop works with no additional effort.

---

## Step 6 — Environment variables

Add a `.env.local` in `apps/trello/` with whatever credentials your platform needs:

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
```

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
```

Run `audit-capabilities` after the initial scaffold to confirm everything is wired up correctly, and again after making structural changes.

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

The most common thing to customise is `TaskFormHeader` (back button + title) and `ConnectionScreen`. Place your override at `apps/trello/src/` at the same sub-path as in `libs/ui/src/` and restart the dev server.
