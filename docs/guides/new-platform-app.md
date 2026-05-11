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
│   │           ├── attachment/[id]/route.ts    # [hasAttachments]
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
│   │   ├── axiosClient.ts                      # Axios instance + interceptors
│   │   └── platformRoute.ts                    # withAdapter() + withAdapterOrEmpty() helpers
│   ├── platforms/
│   │   ├── trello/
│   │   │   └── TrelloAdapter.ts                # raw HTTP adapter — owns all API calls (see Step 4)
│   │   └── TrelloServiceAdapter.ts             # PlatformServiceAdapter bridge (see Step 4)
│   ├── services/
│   │   └── trelloService.ts                    # getTrelloApiContext() — fully generated, no TODOs
│   ├── types/
│   │   └── trello.ts                           # raw Trello API shapes (see Step 4)
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

### Service layer (`src/services/trelloService.ts`)

This file is **fully generated with no TODOs**. It exports a single function:

```ts
getTrelloApiContext(userId: string): Promise<{ adapter: TrelloAdapter; token: PlatformToken }>
```

Every `TrelloServiceAdapter` method calls this to get a ready-to-use adapter + valid token. You do not need to edit this file unless you add API routes that bypass `TrelloServiceAdapter` (e.g. a webhook handler).

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
```

Run `audit-capabilities` after the initial scaffold to confirm everything is wired up correctly, and again after making structural changes.

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

For any other component, place your override at `apps/trello/src/` at the same sub-path as in `libs/ui/src/` and restart the dev server. The shadow only activates when `libs/ui` internally imports the component via a `@mp/ui/components/...` subpath (which all task-form fields and the main task views do).
