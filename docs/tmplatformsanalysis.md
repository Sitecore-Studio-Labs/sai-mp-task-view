# Task Management Platform Capability Analysis

> **Purpose:** Compare major task-management platforms against the capability model used in this monorepo (`capabilities/capability-flags.json`, `capabilities/base.yaml`, Jira reference app).  
> **Sources:** Official developer documentation (Atlassian, Wrike, Asana, Trello, monday.com) plus existing repo YAML files.  
> **Last updated:** 2026-05-19

---

## How to read this document

| Column / symbol | Meaning                                                                         |
| --------------- | ------------------------------------------------------------------------------- |
| **Our flag**    | Boolean or value in `PlatformCapabilities` or route-only YAML                   |
| ✅              | Fully supported by platform API                                                 |
| ⚠️              | Supported with constraints (custom model, extra scopes, or workaround required) |
| ❌              | Not supported or not applicable                                                 |
| **—**           | Not mapped to a current repo flag (candidate future capability)                 |

**Auth types defined in `capabilities/base.yaml`:** `oauth2-refresh` | `oauth2-static` | `oauth1` | `api-key`

---

## Capability matrix (current repo flags)

| Capability flag                   |                         Jira Cloud                          |                         Wrike                         |                                Asana                                |                         Trello                          |                         monday.com                          |
| --------------------------------- | :---------------------------------------------------------: | :---------------------------------------------------: | :-----------------------------------------------------------------: | :-----------------------------------------------------: | :---------------------------------------------------------: |
| **hasIssueTypes**                 | ✅ Epics, stories, bugs, sub-tasks, etc. per project schema |           ❌ No issue types — "tasks" only            | ⚠️ No native types; sections + custom field enums approximate types |                      ❌ Cards only                      |    ⚠️ Board item types are column-driven, not Jira-style    |
| **hasPriorities**                 |       ✅ Built-in priority field (Blocker → Trivial)        |            ✅ High / Normal / Low / Urgent            |  ✅ `priority` enum on task (None / Low / Medium / High / Urgent)   |   ❌ No native priority — use labels or custom fields   | ⚠️ Via a Status or Priority column (board-owner configured) |
| **hasAssignees**                  |                ✅ Single `assignee` on issue                |         ✅ Multiple `responsibleIds` per task         |                  ✅ Single `assignee` + followers                   | ⚠️ Multiple `idMembers` on card (no "primary assignee") |        ⚠️ People column — can hold multiple members         |
| **hasDueDate**                    |                     ✅ `duedate` field                      |                ✅ `dates.due` on task                 |              ✅ `due_on` (date) / `due_at` (datetime)               |                    ✅ `due` on card                     |                       ✅ Date column                        |
| **hasParentIssue**                |            ✅ Parent issue link + epic hierarchy            |                 ✅ Parent task/folder                 |              ✅ Parent task (tasks can be multi-homed)              |  ⚠️ No parent issue — hierarchy is Board → List → Card  |           ✅ Subitems are owned by a parent item            |
| **hasAttachments**                |                ✅ Issue attachments REST API                |          ✅ Attachments API (`/attachments`)          |                       ✅ Attachments on tasks                       |                 ✅ Card attachments API                 |                     ✅ Item file assets                     |
| **hasComments**                   |               ✅ Issue comments with ADF body               |          ✅ Comments on tasks (`/comments`)           |                ✅ Stories on tasks (type `comment`)                 |               ✅ Comment actions on cards               |             ✅ Updates on items (with replies)              |
| **hasSubtasks**                   |             ✅ Subtask issue type (parent link)             |            ✅ Sub-tasks / sub-folder tasks            |                   ✅ Subtasks (full task records)                   |     ⚠️ Checklists only — not separate cards/issues      |           ✅ Subitems (nested under parent item)            |
| **hasStatusTransitions**          |           ✅ Workflow transitions API per project           |     ✅ Custom workflow statuses (`customStatus`)      |       ⚠️ No transition API — `completed` flag + section move        |          ⚠️ List move = implicit status change          |       ✅ Status column values, board-owner configured       |
| **hasAiWorkBreakdown**            |                  — (internal app feature)                   |               — (internal app feature)                |                      — (internal app feature)                       |                — (internal app feature)                 |                  — (internal app feature)                   |
| **richTextFormat**                |            **`adf`** (Atlassian Document Format)            | **`plain`** (API returns HTML; pass `plainText=true`) |         **`plain`** (plain text; HTML in some notes fields)         |        **`plain`** (description is plain string)        |           **`plain`** (update body is plain text)           |
| **hasSites** _(route flag)_       |  ✅ Atlassian cloud sites — `cloudid` required per request  |  ❌ Host URL comes from OAuth token; no site picker   |                   ❌ Workspace embedded in token                    |            ❌ Single account / no org picker            |                ❌ Account embedded in token                 |
| **hasSetupWizard** _(route flag)_ |  ✅ Default project + optional website-to-project mappings  |        ⚠️ Folder/project selection recommended        |              ⚠️ Workspace + default project selection               |            ⚠️ Default board + list selection            |               ⚠️ Board + column-type mapping                |

### Repo YAML alignment

| Platform   | YAML file                 | App scaffolded? | Notes                                         |
| ---------- | ------------------------- | :-------------: | --------------------------------------------- |
| Jira       | `capabilities/jira.yaml`  | ✅ `apps/jira`  | Full flags; reference implementation          |
| Wrike      | `capabilities/wrike.yaml` |     ⚠️ stub     | Generator scaffold expected; no adapter yet   |
| Asana      | —                         |       ❌        | YAML + app not created                        |
| Trello     | —                         |       ❌        | YAML + app not created                        |
| monday.com | —                         |       ❌        | YAML + app not created; GraphQL client needed |

---

## Authentication comparison

| Platform       | Repo `auth.type` | Official options                   | Key notes                                                                |
| -------------- | ---------------- | ---------------------------------- | ------------------------------------------------------------------------ |
| **Jira Cloud** | `oauth2-refresh` | OAuth 2.0 (3LO), Atlassian Connect | Granular scopes; rotating refresh token; requires `offline_access` scope |
| **Wrike**      | `oauth2-refresh` | OAuth 2.0 auth-code                | Comma-separated scopes; rotating refresh; host URL in token response     |
| **Asana**      | `oauth2-refresh` | OAuth 2.0, PAT                     | Long-lived refresh; PAT also usable for dev/CI                           |
| **Trello**     | `oauth1`         | OAuth 1.0a, API key + token        | Atlassian-owned; no OAuth 2.0 for REST API                               |
| **monday.com** | `oauth2-static`  | OAuth 2.0, API token               | Integration tokens are non-expiring; no refresh flow needed              |

---

## Additional platform capabilities (not yet in capability flags)

Features worth evaluating for future capability flags, generator route stubs, or UI gating.

| Feature                       |                     Jira                      |                       Wrike                        |                         Asana                          |                Trello                |                    monday.com                     |
| ----------------------------- | :-------------------------------------------: | :------------------------------------------------: | :----------------------------------------------------: | :----------------------------------: | :-----------------------------------------------: |
| **Webhooks / real-time sync** |   ✅ Dynamic webhook registration via REST    |                ✅ REST webhook API                 |                ✅ HMAC-signed webhooks                 |         ✅ Webhook callbacks         |              ✅ Board-level webhooks              |
| **Custom fields**             |           ✅ Custom field REST API            |    ✅ Custom fields (including formula fields)     | ✅ Extensive custom fields at project/workspace level  | ⚠️ Custom Fields (requires Power-Up) | ✅ Column types (status, dropdown, number, date…) |
| **Labels / tags**             |              ✅ Labels on issues              |                  ✅ Tags on tasks                  |                    ✅ Tags on tasks                    |          ✅ Labels on cards          |            ⚠️ Tags / labels via column            |
| **Watchers / followers**      |                ✅ Watchers API                |     ⚠️ Followers via follow/unfollow endpoints     |                 ✅ Followers on tasks                  |     ✅ Card subscribe / members      |              ⚠️ Subscribers on items              |
| **Time tracking / worklogs**  |              ✅ Worklog REST API              |             ✅ Timelogs (`/timelogs`)              |  ⚠️ No native worklog (third-party integrations only)  |           ❌ Not available           |     ⚠️ Time tracking column (product feature)     |
| **Multi-assignee**            | ⚠️ Single primary; multiple via custom fields |            ✅ Multiple `responsibleIds`            |           ⚠️ Single assignee + collaborators           |       ✅ Multiple `idMembers`        |            ✅ People column (multiple)            |
| **Checklists**                |         ⚠️ Via checklist custom field         |                  ❌ Use sub-tasks                  |                    ❌ Use sub-tasks                    |    ✅ Native checklists on cards     |           ⚠️ Checklist column (product)           |
| **Rich text (HTML)**          |                  ❌ ADF only                  | ✅ HTML descriptions (strip with `plainText=true`) |              ⚠️ HTML in some note fields               |            ❌ Plain text             |             ❌ Plain text in updates              |
| **Markdown**                  |            ⚠️ Partial (legacy API)            |                         ❌                         |                           ❌                           |                  ❌                  |                        ❌                         |
| **API style**                 |                    REST v3                    |                      REST v4                       |                        REST v1                         |                 REST                 |                 **GraphQL only**                  |
| **Hierarchy model**           |         Project → Issue (→ Sub-task)          |         Space → Folder → Task (→ Sub-task)         | Workspace → Team → Project → Section → Task → Sub-task |         Board → List → Card          |          Board → Group → Item → Sub-item          |
| **Personal access token**     |            ⚠️ Deprecated / limited            |                         ❌                         |                         ✅ PAT                         |               ✅ Token               |                   ✅ API token                    |
| **Rate limits**               |           Documented (per-endpoint)           |                   ✅ Documented                    |              ✅ Documented (1500 req/min)              |     ✅ Documented (300 req/10 s)     |       ✅ Complexity-point budgets (GraphQL)       |
| **Batch / bulk operations**   |         ⚠️ Bulk edit (some endpoints)         |                 ⚠️ Async batch API                 |            ⚠️ Batch API (parallel requests)            |    ⚠️ Batch via multiple requests    |        ✅ GraphQL multi-mutation batching         |
| **Permissions API**           |         ✅ `my-permissions` endpoint          |               ✅ Account permissions               |              ✅ Team/project permissions               |        ⚠️ Board member roles         |               ✅ Board permissions                |
| **Search / query language**   |         ✅ JQL (full query language)          |            ✅ Search tasks with filters            |          ✅ `GET /tasks` with `search` param           |        ❌ No search endpoint         |     ✅ `items_page` query with columns filter     |
| **Agile / sprints**           |  ✅ Jira Software boards, sprints, backlogs   |                         ❌                         |                           ❌                           |    ⚠️ Lists as sprint simulation     |     ⚠️ Sprint-style solutions via dashboards      |
| **Component versioning**      |          ✅ Fix versions, components          |                         ❌                         |                           ❌                           |                  ❌                  |                        ❌                         |
| **Task dependencies**         |    ✅ Issue links (blocks / is-blocked-by)    |             ✅ Predecessor / successor             |             ✅ Dependencies and dependents             |                  ❌                  |               ✅ Dependency column                |
| **External ID mapping**       |           ⚠️ App-property per issue           |                 ⚠️ Custom metadata                 |                  ⚠️ External ID field                  |       ⚠️ Custom field / plugin       |                ⚠️ External column                 |

---

## Suggested future capability flags

| Proposed flag             | Rationale                                                                | Impacts                                                        |
| ------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------- |
| `hasWebhooks`             | Jira already implements real-time sync; all 5 platforms support webhooks | Generator route stub; `syncSignal` route; real-time UI updates |
| `hasCustomFields`         | Asana/monday/Wrike need mapping layer in create/edit forms               | Form fields, normalizer, adapter method                        |
| `hasLabels`               | Common filter dimension across all platforms                             | Filter UI, adapter method                                      |
| `hasWorklogs`             | Jira-specific today; Wrike also supports                                 | Time-tracking UI, adapter method                               |
| `hasMultiAssignee`        | Trello/monday/Wrike differ from Jira's single assignee model             | Assignee picker UI                                             |
| `hasChecklists`           | Trello native checklists don't map to `hasSubtasks`                      | Dedicated checklist UI vs. subtask list                        |
| `hasTaskDependencies`     | Asana, Wrike, monday.com all support dependencies                        | Dependency graph / blocker UI                                  |
| `apiStyle`                | `"rest"` \| `"graphql"` — monday.com is GraphQL-only                     | Generator must emit a different HTTP client setup              |
| `supportsRotatingRefresh` | Already in auth YAML; could surface to runtime token-store logic         | TokenStore upsert strategy                                     |

---

## Per-platform notes

### Jira Cloud (reference implementation)

- **API:** REST v3 — issues, transitions, comments (ADF), attachments, priorities, issue types, permissions, webhooks.
- **Multi-tenant:** `cloudId` is required on every API call. Site selection (`hasSites: true`) via `/accessible-resources`.
- **Rich text:** Atlassian Document Format (ADF) — `richTextFormat: adf`. Use `@razroo/html-to-adf` (already in deps) for conversions.
- **OAuth scopes:** `read:jira-user`, `read:jira-work`, `write:jira-work`, `manage:jira-webhook`, `offline_access`.
- **Rotating refresh token:** Every refresh call issues a new refresh token; old one immediately invalidated.
- **Repo:** `apps/jira`, `capabilities/jira.yaml`.

### Wrike

- **API:** REST v4. Tasks are the universal work unit — no issue types.
- **Status model:** Custom workflows drive status via `customStatus` field (maps to `hasStatusTransitions`).
- **Rich text:** API returns HTML descriptions; pass `plainText=true` to get stripped text — `richTextFormat: plain`.
- **Multi-assign:** `responsibleIds[]` supports multiple assignees.
- **No site picker:** Host URL (`wrike.com` or EU host) comes from OAuth token response — `hasSites: false`.
- **Custom fields:** Powerful — formula, dropdown, currency, duration. Needs mapping layer in forms.
- **Repo:** `capabilities/wrike.yaml` (full flags defined); `apps/wrike` scaffold expected via generator.

### Asana

- **Hierarchy:** Workspace → Team → Project → Section → Task → Sub-task.
- **Sub-tasks:** Full task records; tasks can be "multi-homed" across multiple projects.
- **Priority:** `priority` enum field (None / Low / Medium / High / Urgent) — `hasPriorities: true`.
- **Status:** No Jira-style transitions — `completed` flag + section move; `hasStatusTransitions` would gate a "move to section" UI.
- **Custom fields:** Project- and workspace-scoped; needed for create/edit forms.
- **Auth:** OAuth 2.0 with PAT alternative. Long-lived refresh tokens.
- **Webhooks:** HMAC-SHA256 signed — need signature verification in the route.
- **Suggested YAML:**

  ```yaml
  hasIssueTypes: false
  hasPriorities: true
  hasAssignees: true
  hasDueDate: true
  hasParentIssue: true
  hasAttachments: true
  hasComments: true
  hasSubtasks: true
  hasStatusTransitions: true # section-move model
  richTextFormat: plain
  hasSites: false
  hasSetupWizard: true
  auth: { type: oauth2-refresh }
  ```

### Trello

- **Model:** Board → List → Card. Checklists live on cards but are **not** sub-tasks (separate issue records).
- **Auth:** OAuth 1.0a (Atlassian-managed) — maps to `auth.type: oauth1`. No OAuth 2.0 for REST.
- **No priorities or issue types** natively. Labels can approximate both.
- **Status = list position:** Moving a card between lists is the only "status transition" — `hasStatusTransitions: true` with list-move implementation.
- **Due dates, attachments, comments, members** fully supported on cards.
- **Rate limits:** 300 requests per 10 seconds, 100 requests per 10 seconds per token.
- **Suggested YAML:**

  ```yaml
  hasIssueTypes: false
  hasPriorities: false
  hasAssignees: true # multiple members
  hasDueDate: true
  hasParentIssue: false
  hasAttachments: true
  hasComments: true
  hasSubtasks: false # checklists ≠ sub-tasks; future hasChecklists flag
  hasStatusTransitions: true # list-move model
  richTextFormat: plain
  hasSites: false
  hasSetupWizard: true # default board + list selection
  auth: { type: oauth1 }
  ```

### monday.com

- **API:** GraphQL v2 only — **no REST equivalent.** Generator must emit a GraphQL client setup instead of axios REST calls.
- **Items & subitems** map to tasks/sub-tasks. **Updates** (with replies) map to comments. **Columns** are typed — status column, people column, date column, file column, etc.
- **Priorities/status** are column-defined per board — not global enums.
- **Auth:** OAuth 2.0 with typically non-expiring integration tokens — `oauth2-static`.
- **Attachments:** Item file assets via dedicated mutation.
- **Webhooks:** Board-level; no workspace-wide subscription.
- **Rate limits:** Complexity-point budget per minute (varies by plan).
- **Suggested YAML:**

  ```yaml
  hasIssueTypes: false
  hasPriorities: true # via Status / Priority column
  hasAssignees: true # People column (multiple)
  hasDueDate: true # Date column
  hasParentIssue: true # subitems
  hasAttachments: true
  hasComments: true # updates
  hasSubtasks: true # subitems
  hasStatusTransitions: true # status column values
  richTextFormat: plain
  hasSites: false
  hasSetupWizard: true # board + column-type mapping
  auth: { type: oauth2-static }
  # Future: apiStyle: graphql
  ```

---

## Mapping to `PlatformCapabilities` interface

TypeScript contract defined in `libs/task-core/src/types/platform-capabilities.ts`:

- All `has*` booleans in `capability-flags.json` **providerFlags** are properties on the interface.
- `hasSites` and `hasSetupWizard` are **routeFlags** only — they affect route generation and are NOT exposed on `PlatformCapabilities` at runtime.
- `richTextFormat` is on the interface and in YAML but **not** in `capability-flags.json`; managed via drift checks and generator templates.
- `hasAiWorkBreakdown` is a platform flag but is also an internal app feature toggle — it gates AI routes in the Next.js app.

---

## References

| Platform               | Documentation URL                                                                             |
| ---------------------- | --------------------------------------------------------------------------------------------- |
| Jira Cloud REST API v3 | [Jira REST v3](https://developer.atlassian.com/cloud/jira/platform/rest/v3/)                  |
| Jira Cloud OAuth 2.0   | [Jira OAuth 2.0 (3LO)](https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/) |
| Wrike API v4           | [Wrike API Overview](https://developers.wrike.com/docs/overview)                              |
| Asana REST API         | [Asana API Reference](https://developers.asana.com/reference/rest-api-reference)              |
| Trello REST API        | [Trello REST](https://developer.atlassian.com/cloud/trello/rest/)                             |
| monday.com GraphQL API | [monday.com API Basics](https://developer.monday.com/api-reference/docs/basics)               |

---

## Related repo files

- [`capabilities/capability-flags.json`](../capabilities/capability-flags.json) — single source of truth for flag names
- [`capabilities/base.yaml`](../capabilities/base.yaml) — default values + auth type docs
- [`capabilities/jira.yaml`](../capabilities/jira.yaml) — Jira platform definition
- [`capabilities/wrike.yaml`](../capabilities/wrike.yaml) — Wrike platform definition
- [`docs/architecture/monorepo-overview.md`](architecture/monorepo-overview.md)
- [`docs/guides/new-platform-app.md`](guides/new-platform-app.md)
