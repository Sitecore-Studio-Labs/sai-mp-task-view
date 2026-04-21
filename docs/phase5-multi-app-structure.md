# 🚀 PHASE 5 STARTER PACK (NX MULTI-APP STRUCTURE)

### 📄 Markdown file: `phase5-multi-app-structure.md`

This is your **Cursor-executable blueprint**

---

# 📘 phase5-multi-app-structure.md

````md
# 🚀 PHASE 5 — MULTI-APP STRATEGY (NX MONOREPO SPLIT)

---

# 🧠 GOAL

Transform the current single Jira-based NX app into a **multi-application platform system** where:

- Each task platform becomes its own NX app
- Shared logic stays in libs
- Capability system remains shared
- Providers are reused via extension layer

---

# 🏗️ CURRENT STATE (INPUT CONTEXT)

We already have:

✔ jira-app (fully migrated)
✔ capability system (Phase 4 complete)
✔ runtime UI engine (Phase 4.3 complete)
✔ JiraExtensionProvider (stable)
✔ shared libs structure exists

---

# 🚀 PHASE 5.1 — NX APP SPLIT STRATEGY

## Step 1 — Define target applications

You MUST ensure the following app structure:

apps/
jira-app ✔ (existing)
asana-app ❗ (new)
trello-app ❗ (future-ready stub)
wrike-app ❗ (future-ready stub)

---

## Step 2 — Create new NX apps (minimal scaffolding only)

Generate apps using NX:

- asana-app
- trello-app (empty shell)
- wrike-app (empty shell)

RULES:

- DO NOT copy Jira logic into new apps
- DO NOT duplicate providers
- DO NOT duplicate capability engine

Each app must ONLY contain:

- App shell
- Platform config injection point

---

## Step 3 — Extract shared platform runtime

Ensure these remain shared:

libs/
capabilities/ ✔
providers/ ✔
platform/ ✔
ui/ ✔
core/ ✔

---

# 🧱 PHASE 5.1.1 — PLATFORM CONFIG MODEL

Create per-app config:

apps/asana-app/src/config/platform.config.ts
apps/trello-app/src/config/platform.config.ts

Example:

```ts
export const PLATFORM_CONFIG = {
  platform: "asana",
  capabilities: "auto",
};
```
````

---

# 🔌 PHASE 5.2 — OPTIONAL MODULE FEDERATION PREP

DO NOT implement yet.

ONLY prepare architecture hooks:

- Each app must be independently buildable
- Each app must expose a "root entry"
- Shared libs must remain singleton-safe

Reference:

- host/remote architecture (Nx Module Federation concept)

---

# 🧠 RULES (CRITICAL)

❌ Do NOT merge UI logic across apps
❌ Do NOT duplicate capability system
❌ Do NOT reintroduce apiClient usage
❌ Do NOT modify Phase 4 system
❌ Do NOT touch JiraExtensionProvider

---

# 🧩 SHARED SYSTEM GUARANTEE

All apps MUST use:

✔ getEnabledFeatures()
✔ capability-engine.ts
✔ DynamicUI renderer
✔ JiraExtensionProvider (or equivalent per platform)

---

# 🧠 PHASE 5 SUCCESS CRITERIA

After completion:

✔ Jira app still works unchanged
✔ Asana app runs independently
✔ Capability system shared
✔ No cross-app imports of UI logic
✔ Nx boundaries enforced

---

# 🚀 OUTPUT EXPECTATION

You should end with:

- 3+ NX apps
- 1 shared capability engine
- 1 shared provider abstraction system
- zero duplication of core logic
