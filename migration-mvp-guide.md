This is a **serious, well-thought-out architecture direction** — and yes, what you're aiming for is absolutely doable if executed cleanly. Let’s turn your vision into something Cursor can _actually execute step-by-step without confusion_.

Below is a **production-grade** `migration-mvp-guide.md` you can drop into your repo and tell Cursor:

> “Follow this file step by step. Execute each step sequentially.”

---

# 🚀 `migration-mvp-guide.md`

````md
# 🚀 TASK: Migrate Standalone Jira App → NX Monorepo + Multi-Platform Generator

---

# 🧠 PHASE 0 — CONTEXT UNDERSTANDING (MANDATORY)

## Step 0.1 — Analyze Existing Codebase

You MUST:

1. Scan the entire codebase
2. Identify:
   - Design patterns used (Strategy, Factory, Adapter, etc.)
   - Folder structure philosophy
   - API abstraction approach
   - UI reuse patterns
   - State management approach
   - Integration boundaries (Jira-specific vs generic)

3. Produce a report:

```md
## Codebase Analysis Report

### Patterns Identified

-

### Reusable Modules

-

### Jira-Specific Logic

-

### Generic Logic

-

### Risks During Migration

-
```
````

---

## Step 0.2 — Understand Extensibility Model

You MUST determine:

- How new platforms can be added WITHOUT modifying existing code
- Whether Open/Closed Principle is respected
- Where behavior injection happens

---

## Step 0.3 — Identify Extraction Candidates

Mark modules as:

- ✅ Reusable (move to NX libs)
- ⚠️ Needs refactor
- ❌ Jira-only (keep isolated)

---

# 🧠 PHASE 1 — NX FOUNDATION

## Step 1.1 — Learn NX Best Practices

Before doing anything:

- Study NX official docs
- Focus on:
  - Apps vs Libs separation
  - Dependency boundaries
  - Tag-based module constraints
  - Generators
  - Caching

👉 Key insight:

NX enforces **clear separation between apps and reusable libraries**, improving maintainability and scaling ([Module Federation](https://module-federation.io/practice/monorepos/nx-for-module-federation?utm_source=chatgpt.com))

---

## Step 1.2 — Initialize NX Workspace

```bash
npx create-nx-workspace@latest task-platform

```

Choose:

- Next.js
- Monorepo

---

## Step 1.3 — Setup Folder Structure

```bash
apps/
  jira-app/
  asana-app/ (future)
  wrike-app/ (future)

libs/
  ui/
  core/
  platform/
  providers/
  data-access/

```

---

## Step 1.4 — Setup NX Boundaries

Configure `eslint` rules:

- ui → cannot access data-access
- providers isolated per platform
- core shared everywhere

---

# 🧠 PHASE 2 — MIGRATE EXISTING JIRA APP

## Step 2.1 — Move App into NX

Move:

```
standalone-app → apps/jira-app

```

Fix:

- tsconfig paths
- env handling
- imports

---

## Step 2.2 — Extract Shared Code into LIBS

Move:

| Type           | Destination      |
| -------------- | ---------------- |
| UI Components  | libs/ui          |
| Hooks          | libs/core        |
| API Logic      | libs/data-access |
| Platform Logic | libs/providers   |

---

## Step 2.3 — Isolate Jira Provider

Create:

```
libs/providers/jira/

```

Move:

- Jira API calls
- Jira auth logic
- Jira transformations

---

## Step 2.4 — Introduce Provider Interface

Create:

```ts
interface TaskPlatformProvider {
  authenticate(): Promise<void>;
  getProjects(): Promise<Project[]>;
  getTasks(): Promise<Task[]>;
}
```

---

## Step 2.5 — Make Jira Implement Provider

```ts
class JiraProvider implements TaskPlatformProvider {}
```

---

# 🧠 PHASE 3 — PLATFORM-AGNOSTIC ARCHITECTURE

## Step 3.1 — Create Platform Registry

```ts
const PLATFORM_CONFIG = {
  jira: JiraProvider,
  asana: AsanaProvider,
  wrike: WrikeProvider,
};
```

---

## Step 3.2 — Dynamic Provider Injection

```ts
const provider = PLATFORM_CONFIG[env.PLATFORM];
```

---

## Step 3.3 — Remove Hardcoded Jira Logic

Replace:

❌ direct Jira usage  
✅ provider-based usage

---

# 🧠 PHASE 4 — CAPABILITY MATRIX

## Step 4.1 — Define Capability Model

```ts
type Capability = {
  supportsStatus: boolean;
  supportsAssignee: boolean;
  supportsComments: boolean;
};
```

---

## Step 4.2 — Add Per-Platform Capabilities

```ts
const CAPABILITIES = {
  jira: { supportsStatus: true },
  trello: { supportsStatus: false },
};
```

---

## Step 4.3 — UI Conditional Rendering

```ts
if (capabilities.supportsStatus) {
  renderStatus();
}
```

---

# 🧠 PHASE 5 — MULTI-APP STRATEGY

## Step 5.1 — Decide Architecture

Use:

- NX apps = separate marketplace apps
- shared libs = reusable logic

---

## Step 5.2 — Optional: Module Federation

NX supports:

- host + remotes architecture
- runtime loading of apps ([Nx](https://nx.dev/docs/technologies/module-federation/concepts/module-federation-and-nx?utm_source=chatgpt.com))

---

# 🧠 PHASE 6 — GENERATOR SYSTEM

## Step 6.1 — Create NX Generator

```bash
nx g @nx/plugin:plugin platform-generator

```

---

## Step 6.2 — Generator Responsibilities

- Create new app
- Inject provider
- Setup env
- Configure capabilities

---

## Step 6.3 — CLI Usage

```bash
nx g platform-app --name=asana

```

---

# 🧠 PHASE 7 — API DISCOVERY (CRITICAL)

## Step 7.1 — Analyze Platforms

You MUST research:

- Jira
- Asana
- Wrike
- Trello
- Monday
- ClickUp

---

## Step 7.2 — Extract:

For EACH platform:

- OAuth flow
- Task APIs
- Project APIs
- Metadata APIs

---

## Step 7.3 — Normalize APIs

Map to:

```ts
Task;
Project;
User;
Status;
```

---

# 🧠 PHASE 8 — ZERO-CODE PROVISIONING

## Step 8.1 — Environment Driven Apps

```env
PLATFORM=asana

```

---

## Step 8.2 — App Should Work WITHOUT Code Changes

Only:

- env config
- provider switch

---

# 🧠 PHASE 9 — SUPABASE INTEGRATION

## Step 9.1 — Add Shared Schema

Use:

- connections
- task_mappings
- metadata_cache

---

## Step 9.2 — Add Supabase Client

Shared in:

```
libs/data-access

```

---

## Step 9.3 — Add Metadata Caching Layer

Avoid API overuse

---

# 🧠 PHASE 10 — VALIDATION

## Step 10.1 — Verify

- Jira still works
- Can add new platform WITHOUT modifying code
- UI adapts dynamically
- Generator works

---

# 🚨 RULES

- ❌ DO NOT over-engineer
- ❌ DO NOT introduce unnecessary abstractions
- ❌ DO NOT break existing Jira app
- ✅ Prefer reuse
- ✅ Prefer composition
- ✅ Keep code simple

---

# 🏁 FINAL GOAL

You should end up with:

✔ NX monorepo  
✔ Multiple platform apps  
✔ Shared reusable libs  
✔ Generator-based provisioning  
✔ Capability-driven UI  
✔ Zero-code platform switching

```

---

# 💥 Why this works (important insight)

What you're building is essentially:

### 👉 **A metadata-driven, provider-based micro-frontend system**

And Nx is perfect for this because:

- It **enforces boundaries and modularity**
- It **supports generators natively**
- It can scale into **micro-frontends via module federation** :contentReference[oaicite:2]{index=2}

---

# ⚡ If you want next level

I can generate next:

- 🔥 Full **platform capability matrix (Jira vs Asana vs Trello etc.)**
- 🔥 Real **NX generator implementation (code)**
- 🔥 **Provider interface + base abstract class (production ready)**
- 🔥 Supabase **RLS + security policies**

Just tell me what you want next 👍
::contentReference[oaicite:3]{index=3}

```
