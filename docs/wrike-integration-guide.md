# Wrike Platform Integration Guide

This guide walks you from zero to a working Wrike integration inside the monorepo.
It covers registering the OAuth app, generating the scaffold, writing the adapter,
setting up the database, and verifying the connection in the browser.

---

## How the system works (30-second orientation)

```text
capabilities/wrike.yaml          ← you write this (declares what Wrike supports)
        ↓  nx run-many -t generate
apps/wrike/                      ← scaffolded: Next.js app, API routes, capabilities provider
apps/wrike/src/lib/authStrategy.ts  ← generated: OAuth2 strategy wired to SupabaseTokenStore
apps/wrike/src/platforms/wrike/  ← you write: WrikeAdapter (HTTP calls)
apps/wrike/src/services/         ← you write: wrikeService.ts (orchestration)
```

The generator produces all the boilerplate. You supply the Wrike-specific HTTP logic.

---

## Step 1 — Register a Wrike OAuth application

1. Go to **[https://www.wrike.com/frontend/apps/index.html#/api](https://www.wrike.com/frontend/apps/index.html#/api)**
   (log in with your Wrike account first).
2. Click **Create new** under _OAuth 2.0 Apps_.
3. Fill in:

   | Field        | Value                                           |
   | ------------ | ----------------------------------------------- |
   | App name     | `MP Task View – Dev` (or any name)              |
   | Redirect URI | `http://localhost:3001/api/auth/wrike/callback` |

4. After saving you will see **Client ID** and **Client Secret** — keep these handy.
5. Under _Scopes_, enable: `Default`, `wsReadWrite`, `amReadOnlyWorkflow`, `amReadWriteWorkflow`.

> **Production**: add your production redirect URI (e.g. `https://app.example.com/api/auth/wrike/callback`) as an additional redirect URI. Wrike allows multiple.

---

## Step 2 — Create `capabilities/wrike.yaml`

Create this file at the workspace root:

```yaml
# capabilities/wrike.yaml
extends: base

platform:
  name: wrike
  displayName: Wrike
  connectionTitle: Connect to Wrike
  connectionDescription: >
    Link your Wrike account to manage tasks directly from the editor sidebar.

capabilities:
  hasIssueTypes: false # Wrike has no issue types — tasks are tasks
  hasPriorities: true # High / Normal / Low / Urgent
  hasAssignees: true
  hasDueDate: true
  hasParentIssue: true # Tasks can be nested under parent tasks
  hasAttachments: true
  hasComments: true
  hasSubtasks: true
  hasStatusTransitions: true # Wrike workflows define custom statuses
  hasAiWorkBreakdown: true
  richTextFormat: plain # Wrike API returns and accepts plain text
  hasSites: false # No Atlassian-style org picker; host URL comes in token response

auth:
  type: oauth2-refresh
  oauth2:
    authorizeUrl: https://login.wrike.com/oauth2/authorize/v4
    tokenUrl: https://login.wrike.com/oauth2/token
    scopes:
      - Default # Basic account + task read
      - wsReadWrite # Create/update tasks, folders, projects
      - amReadOnlyWorkflow # Read custom workflows and statuses
      - amReadWriteWorkflow # Update workflow statuses on tasks
    rotatingRefreshToken: true # Wrike invalidates the old refresh token on every refresh
```

> **Key Wrike OAuth facts:**
>
> - Access tokens expire after **1 hour**.
> - Each token refresh issues a **new refresh token** and invalidates the old one — hence `rotatingRefreshToken: true`.
> - The token response contains a `host` field (e.g. `https://app-us2.wrike.com`) that is your data-centre base URL for all subsequent API calls. You must store this alongside the tokens.

---

## Step 3 — Run the generator

```bash
# Dry-run first to preview what will be created
nx generate @mp/generators:platform-app wrike \
  --yamlFile=capabilities/wrike.yaml \
  --dry-run

# Create for real
nx generate @mp/generators:platform-app wrike \
  --yamlFile=capabilities/wrike.yaml
```

This produces:

```text
apps/wrike/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── api/
│   │       ├── auth/wrike/
│   │       │   ├── connect/route.ts        ← OAuth redirect (uses authStrategy)
│   │       │   ├── callback/route.ts       ← code→token exchange (you extend this)
│   │       │   ├── status/route.ts         ← uses authStrategy.status()
│   │       │   ├── disconnect/route.ts     ← uses authStrategy.revoke()
│   │       │   └── refresh/route.ts        ← uses authStrategy.getValidToken()
│   │       └── wrike/
│   │           ├── projects/route.ts
│   │           ├── select-project/route.ts
│   │           ├── issues/route.ts
│   │           ├── issues/[issueIdOrKey]/route.ts
│   │           ├── issues/[issueIdOrKey]/transitions/route.ts
│   │           ├── issue-types/route.ts  (skipped — hasIssueTypes: false)
│   │           ├── assignees/route.ts
│   │           ├── current-user/route.ts
│   │           ├── statuses/[projectKey]/route.ts
│   │           ├── comments/route.ts
│   │           ├── permissions/route.ts
│   │           ├── attachment/[attachmentId]/route.ts
│   │           └── ...ai routes
│   ├── lib/
│   │   ├── authStrategy.ts                 ← generated: OAuth2RefreshStrategy instance
│   │   └── config.ts                       ← you fill in env schema
│   └── providers/
│       └── WrikePlatformCapabilitiesProvider.tsx  ← generated from YAML
├── next.config.ts                          ← you add @mp/auth to transpilePackages
├── project.json
└── tsconfig.json
```

---

## Step 4 — Create the Supabase database tables

Run this migration in your Supabase project (SQL editor or a migration file):

```sql
-- wrike_connections: one row per connected user
CREATE TABLE wrike_connections (
  id              UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         TEXT    NOT NULL UNIQUE,
  wrike_site      TEXT    NOT NULL DEFAULT '', -- data-centre host, e.g. https://app-us2.wrike.com
  wrike_project   TEXT    NOT NULL DEFAULT '', -- selected folder/project ID
  access_token_encrypted  TEXT NOT NULL,
  refresh_token_encrypted TEXT,               -- NULL for platforms without refresh tokens
  expiry          TEXT,                       -- ISO timestamp, NULL for non-expiring tokens
  status          TEXT    NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'inactive')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- wrike_sessions: short-lived server-side cookie sessions
CREATE TABLE wrike_sessions (
  id              UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  session_token   TEXT    NOT NULL UNIQUE,
  wrike_account_id TEXT   NOT NULL,
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast session lookups
CREATE INDEX wrike_sessions_token_idx ON wrike_sessions (session_token);
-- Index for fast connection lookups
CREATE INDEX wrike_connections_user_id_idx ON wrike_connections (user_id, status);
```

Column names follow the `{platform}_{field}` convention the generator uses for `SupabaseTokenStoreConfig`.

---

## Step 5 — Configure environment variables

Add to `apps/wrike/.env.local`:

```env
# Supabase — copy from your project settings
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Wrike OAuth — from Step 1
WRIKE_CLIENT_ID=your-client-id
WRIKE_CLIENT_SECRET=your-client-secret
WRIKE_REDIRECT_URI=http://localhost:3001/api/auth/wrike/callback

# App
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

Update `apps/wrike/src/lib/config.ts` to validate these:

```typescript
import { validateEnv } from "@mp/env";
import { z } from "zod";

const serverEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  WRIKE_CLIENT_ID: z.string().min(1),
  WRIKE_CLIENT_SECRET: z.string().min(1),
  WRIKE_REDIRECT_URI: z.string().url(),

  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export const env = validateEnv(serverEnvSchema);
```

---

## Step 6 — `next.config.ts` (already generated, no action needed)

The generator emits `apps/wrike/next.config.ts` pre-configured with:

- `@mp/auth` in `transpilePackages`
- `UiShadowResolverPlugin` wired in for real-time component shadowing
- `resolve.unsafeCache = false` in dev so override changes are picked up without restarts

No manual edits required here.

---

## Step 7 — Extend the OAuth callback route

The generated `callback/route.ts` is a stub. Wrike's token response includes a `host` field (your data-centre URL) that you must capture and store as `platformSite`. Replace the stub:

```typescript
// apps/wrike/src/app/api/auth/wrike/callback/route.ts
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { SupabaseTokenStore } from "@mp/token-storage";
import { env } from "@/lib/config";
import { createSupabaseServerClient } from "@/lib/supabaseClient";
import { createWrikeSession, getWrikeUserProfile, setWrikeCookie } from "@/helpers/wrikeSession"; // you'll create these

const WRIKE_TOKEN_URL = "https://login.wrike.com/oauth2/token";

function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  // CSRF check
  const cookieState = request.cookies.get("oauth_state")?.value;
  if (!code || !state || !cookieState || !timingSafeCompare(state, cookieState)) {
    return NextResponse.json({ error: "Invalid OAuth state" }, { status: 400 });
  }

  // Exchange code for tokens
  const tokenResponse = await axios.post<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
    host: string; // ← Wrike-specific: data-centre base URL
  }>(
    WRIKE_TOKEN_URL,
    new URLSearchParams({
      client_id: env.WRIKE_CLIENT_ID,
      client_secret: env.WRIKE_CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: env.WRIKE_REDIRECT_URI,
    }).toString(),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
  );

  const { access_token, refresh_token, expires_in, host } = tokenResponse.data;
  const expiry = new Date(Date.now() + expires_in * 1000).toISOString();

  // Fetch the Wrike user profile to get a stable userId
  const profileRes = await axios.get<{
    data: Array<{ id: string; profiles: Array<{ email: string }> }>;
  }>(`${host}/api/v4/contacts?me=true`, { headers: { Authorization: `Bearer ${access_token}` } });
  const wrikeUser = profileRes.data.data[0];
  if (!wrikeUser) {
    return NextResponse.json({ error: "Could not fetch Wrike user" }, { status: 500 });
  }

  const userId = wrikeUser.id; // Wrike's stable account ID

  // Persist the connection — store `host` as platformSite
  const store = new SupabaseTokenStore(createSupabaseServerClient(), {
    connectionsTable: "wrike_connections",
    sessionsTable: "wrike_sessions",
    siteColumn: "wrike_site",
    projectColumn: "wrike_project",
    accountIdColumn: "wrike_account_id",
  });

  await store.saveConnection({
    userId,
    platformSite: host, // e.g. https://app-us2.wrike.com
    platformProject: "",
    token: {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiry,
      tokenType: "bearer",
    },
  });

  // Create a server session (cookie-based auth for subsequent API route calls)
  const sessionToken = crypto.randomBytes(32).toString("hex");
  const sessionExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await store.createSession(userId, sessionToken, sessionExpiry);

  const response = NextResponse.redirect(
    new URL("/", env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001"),
  );
  response.cookies.delete("oauth_state");
  response.cookies.set("wrike_session", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: sessionExpiry,
  });

  return response;
}
```

---

## Step 8 — Create the Wrike adapter

Create `apps/wrike/src/platforms/wrike/WrikeHttpAdapter.ts` (interface) and `WrikeAdapter.ts` (implementation):

```typescript
// apps/wrike/src/platforms/wrike/WrikeAdapter.ts
import axios, { type AxiosInstance } from "axios";
import type { PlatformToken } from "@mp/task-core";

export class WrikeAdapter {
  private readonly client: AxiosInstance;

  /**
   * @param host  Data-centre base URL from the token response, e.g. https://app-us2.wrike.com
   */
  constructor(private readonly host: string) {
    this.client = axios.create({ baseURL: `${host}/api/v4` });
  }

  private auth(token: PlatformToken) {
    return { headers: { Authorization: `Bearer ${token.accessToken}` } };
  }

  // ── Projects (Wrike "folders" with project=true) ───────────────────────────

  async getProjects(token: PlatformToken) {
    const res = await this.client.get("/folders?project=true", this.auth(token));
    return (res.data.data as Array<{ id: string; title: string }>).map((f) => ({
      id: f.id,
      key: f.id,
      name: f.title,
    }));
  }

  // ── Tasks ──────────────────────────────────────────────────────────────────

  async getTasks(token: PlatformToken, folderId: string) {
    // Avoid `fields=[...]` on this route: Wrike returns 400 for values like `status` / `priority`.
    const res = await this.client.get(`/folders/${folderId}/tasks`, this.auth(token));
    return res.data.data;
  }

  async createTask(
    token: PlatformToken,
    folderId: string,
    payload: {
      title: string;
      description?: string;
      status?: string;
      importance?: "High" | "Normal" | "Low";
      dates?: { due?: string; start?: string };
      responsibles?: string[];
      superTaskIds?: string[];
    },
  ) {
    const res = await this.client.post(`/folders/${folderId}/tasks`, payload, this.auth(token));
    return res.data.data[0];
  }

  async updateTask(token: PlatformToken, taskId: string, payload: Record<string, unknown>) {
    const res = await this.client.put(`/tasks/${taskId}`, payload, this.auth(token));
    return res.data.data[0];
  }

  // ── Workflows (statuses) ───────────────────────────────────────────────────

  async getWorkflows(token: PlatformToken) {
    const res = await this.client.get("/workflows", this.auth(token));
    return res.data.data as Array<{
      id: string;
      name: string;
      customStatuses: Array<{ id: string; name: string; color: string; type: string }>;
    }>;
  }

  // ── Users (assignees) ─────────────────────────────────────────────────────

  async getContacts(token: PlatformToken) {
    const res = await this.client.get("/contacts", this.auth(token));
    return (
      res.data.data as Array<{
        id: string;
        firstName: string;
        lastName: string;
        profiles: Array<{ email: string }>;
      }>
    ).map((u) => ({
      accountId: u.id,
      displayName: `${u.firstName} ${u.lastName}`.trim(),
      emailAddress: u.profiles[0]?.email ?? "",
      avatarUrls: {},
    }));
  }

  async getCurrentUser(token: PlatformToken) {
    const res = await this.client.get("/contacts?me=true", this.auth(token));
    const u = res.data.data[0] as {
      id: string;
      firstName: string;
      lastName: string;
      profiles: Array<{ email: string }>;
    };
    return {
      accountId: u.id,
      displayName: `${u.firstName} ${u.lastName}`.trim(),
      emailAddress: u.profiles[0]?.email ?? "",
    };
  }

  // ── Comments ───────────────────────────────────────────────────────────────

  async getComments(token: PlatformToken, taskId: string) {
    const res = await this.client.get(`/tasks/${taskId}/comments`, this.auth(token));
    return res.data.data;
  }

  async createComment(token: PlatformToken, taskId: string, text: string) {
    const res = await this.client.post(
      `/tasks/${taskId}/comments`,
      { text, plainText: true },
      this.auth(token),
    );
    return res.data.data[0];
  }

  // ── Refresh (used by jiraService-style manual refresh if needed) ───────────

  async refreshToken(token: PlatformToken): Promise<PlatformToken> {
    if (!token.refreshToken) throw new Error("refreshToken: no refresh token available.");
    const res = await axios.post<{
      access_token: string;
      refresh_token: string;
      expires_in: number;
      host: string;
    }>(
      "https://login.wrike.com/oauth2/token",
      new URLSearchParams({
        client_id: process.env.WRIKE_CLIENT_ID!,
        client_secret: process.env.WRIKE_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
      }).toString(),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
    );
    return {
      accessToken: res.data.access_token,
      refreshToken: res.data.refresh_token,
      expiry: new Date(Date.now() + res.data.expires_in * 1000).toISOString(),
      tokenType: "bearer",
    };
  }
}
```

---

## Step 9 — Create the Wrike service

Create `apps/wrike/src/services/wrikeService.ts` to orchestrate adapter calls the same way `jiraService.ts` does for Jira:

```typescript
// apps/wrike/src/services/wrikeService.ts
import { SupabaseTokenStore } from "@mp/token-storage";
import { authStrategy } from "@/lib/authStrategy";
import { createSupabaseServerClient } from "@/lib/supabaseClient";
import { WrikeAdapter } from "@/platforms/wrike/WrikeAdapter";

const WRIKE_STORE_CONFIG = {
  connectionsTable: "wrike_connections",
  sessionsTable: "wrike_sessions",
  siteColumn: "wrike_site",
  projectColumn: "wrike_project",
  accountIdColumn: "wrike_account_id",
} as const;

async function createWrikeAdapterForUser(userId: string) {
  // getValidToken handles refresh automatically (rotatingRefreshToken: true)
  const accessToken = await authStrategy.getValidToken(userId);

  // We need the stored host URL too — fetch the connection record
  const store = new SupabaseTokenStore(createSupabaseServerClient(), WRIKE_STORE_CONFIG);
  const connection = await store.getConnection(userId);
  if (!connection) throw new Error("No active Wrike connection found for user.");

  const adapter = new WrikeAdapter(connection.platformSite);
  return { adapter, accessToken, connection };
}

export async function getWrikeProjectsForUser(userId: string) {
  const { adapter, connection } = await createWrikeAdapterForUser(userId);
  return adapter.getProjects({
    accessToken: await authStrategy.getValidToken(userId),
    tokenType: "bearer",
  });
}

// Add more service functions following the same pattern...
```

---

## Step 10 — Wire up the generated API routes

The generator creates stub routes that call `authStrategy.*`. For data routes (projects, tasks, etc.) you need to fill in each stub. Example for `projects/route.ts`:

```typescript
// apps/wrike/src/app/api/wrike/projects/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getWrikeUserIdFromSession } from "@/helpers/wrikeUserId";
import { getWrikeProjectsForUser } from "@/services/wrikeService";

export async function GET(request: NextRequest) {
  const userId = await getWrikeUserIdFromSession(request);
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const projects = await getWrikeProjectsForUser(userId);
  return NextResponse.json(projects);
}
```

Create `apps/wrike/src/helpers/wrikeUserId.ts` to decode the session cookie (same pattern as `apps/jira/src/helpers/jiraUserId.ts`):

```typescript
// apps/wrike/src/helpers/wrikeUserId.ts
import { NextRequest } from "next/server";
import { SupabaseTokenStore } from "@mp/token-storage";
import { createSupabaseServerClient } from "@/lib/supabaseClient";

const store = new SupabaseTokenStore(createSupabaseServerClient(), {
  connectionsTable: "wrike_connections",
  sessionsTable: "wrike_sessions",
  siteColumn: "wrike_site",
  projectColumn: "wrike_project",
  accountIdColumn: "wrike_account_id",
});

export async function getWrikeUserIdFromSession(request: NextRequest): Promise<string | null> {
  const sessionToken = request.cookies.get("wrike_session")?.value;
  if (!sessionToken) return null;
  const session = await store.lookupSession(sessionToken);
  return session?.accountId ?? null;
}
```

---

## Step 11 — Start the dev server and verify

Add the Wrike app to `nx.json` implicit dependencies if needed, then:

```bash
# Start only the Wrike app on port 3001
nx serve wrike

# Or start everything
nx run-many -t serve
```

**Verification checklist:**

1. Open `http://localhost:3001`.
2. The UI should show the "Connect to Wrike" button (from `WrikePlatformCapabilitiesProvider`).
3. Click connect → you should be redirected to `https://login.wrike.com/oauth2/authorize/v4?...` with your `client_id` in the URL.
4. Authorize the app → you should be redirected back to `/api/auth/wrike/callback?code=...`.
5. The callback should exchange the code, store tokens, create a session, and redirect to `/`.
6. Calling `GET /api/auth/wrike/status` should return `{ connected: true }`.
7. Calling `GET /api/wrike/projects` should return your Wrike projects.

---

## Wrike API quick reference

| Resource           | Endpoint                                 | Notes                                                    |
| ------------------ | ---------------------------------------- | -------------------------------------------------------- |
| Current user       | `GET /api/v4/contacts?me=true`           | Returns array; use `[0]`                                 |
| All contacts       | `GET /api/v4/contacts`                   | Usable as assignee list                                  |
| Projects (folders) | `GET /api/v4/folders?project=true`       | `project=true` filters to projects only                  |
| Tasks in project   | `GET /api/v4/folders/{folderId}/tasks`   | Add `fields=[...]` for extra data                        |
| Single task        | `GET /api/v4/tasks/{taskId}`             |                                                          |
| Create task        | `POST /api/v4/folders/{folderId}/tasks`  | Body: `{title, status, importance, dates, responsibles}` |
| Update task        | `PUT /api/v4/tasks/{taskId}`             | Same fields as create                                    |
| Delete task        | `DELETE /api/v4/tasks/{taskId}`          |                                                          |
| Workflows/statuses | `GET /api/v4/workflows`                  | Returns account-wide workflows with `customStatuses`     |
| Comments on task   | `GET /api/v4/tasks/{taskId}/comments`    |                                                          |
| Create comment     | `POST /api/v4/tasks/{taskId}/comments`   | Body: `{text, plainText: true}`                          |
| Attachments        | `GET /api/v4/tasks/{taskId}/attachments` |                                                          |

**Priority mapping:**

| Wrike value | Display |
| ----------- | ------- |
| `High`      | High    |
| `Normal`    | Normal  |
| `Low`       | Low     |
| `Urgent`    | Urgent  |

**Status types in workflows:**

| `type` value | Meaning            |
| ------------ | ------------------ |
| `Active`     | In-progress status |
| `Completed`  | Done               |
| `Deferred`   | On hold            |
| `Cancelled`  | Cancelled          |

---

## Common issues

**"Invalid OAuth state" on callback**
The `oauth_state` cookie requires `sameSite: "none"; secure: true` when the app runs inside an iframe. For standalone browser use, `sameSite: "lax"` is sufficient. Check cookie settings in `connect/route.ts`.

**`host` field missing from token response**
This happens only when the app's OAuth scopes are misconfigured or you're using an older Wrike OAuth endpoint. Ensure you're hitting `https://login.wrike.com/oauth2/authorize/v4` (v4, not v3).

**Token refresh returns 400**
Wrike refresh tokens rotate — the old token is invalidated on use. If a refresh token is replayed (e.g. due to a crash mid-refresh), Wrike will reject it. The `OAuth2RefreshStrategy` handles this correctly as long as `rotatingRefreshToken: true` is set.

**Tasks not appearing**
Wrike's task endpoint returns tasks across all projects by default. Always filter by `folderId` (`GET /api/v4/folders/{folderId}/tasks`) rather than the account-level `GET /api/v4/tasks` to scope results to the selected project.

**Wrike API base URL is wrong**
The `host` in the token response is account-specific (e.g. `https://app-us2.wrike.com` for US data centre, `https://app-eu.wrike.com` for EU). Never hardcode `https://www.wrike.com` as the base URL — always read it from the stored `platformSite`.
