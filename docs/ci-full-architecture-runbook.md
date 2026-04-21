````md id="ci_runbook"
# 🚀 FULL CI ARCHITECTURE RUNBOOK (Nx + Migration + Plugin System)

## 🧠 PURPOSE

This runbook defines a complete CI enforcement system for:

- Nx monorepo boundaries
- Migration safety (PHASE 2 → PHASE 4)
- Jira leak detection
- Capability system validation
- Extension-layer architecture enforcement
- Auto-healing migration safeguards

---

# ⚙️ PHASE 1 — CI FOUNDATION SETUP

## Step 1.1 — Install CI dependencies

Ensure Nx ESLint plugin is installed:

```bash
nx add @nx/eslint-plugin @nx/devkit
```
````

```

---

## Step 1.2 — Enable Nx module boundaries

Ensure ESLint config contains:

- @nx/enforce-module-boundaries rule
- tag-based dependency constraints

(Already configured in repo root)

---

# 🚨 PHASE 2 — JIRA LEAK DETECTION SYSTEM

## Step 2.1 — Add AST-based leak detector

Create:

```

tools/audit/jira-leak-detector.ts

```

It must detect:

- apiClient Jira calls
- direct fetch to /jira endpoints
- hardcoded Jira API usage outside JiraExtensionProvider

FAIL CI if found.

---

## Step 2.2 — Add capability validator

Create:

```

tools/audit/capability-validator.ts

```

It ensures:

- required capabilities exist
- capability map is consistent
- no missing feature flags

---

# 🧠 PHASE 3 — MIGRATION SAFETY SYSTEM

## Step 3.1 — Migration lock enforcement

Ensure CI checks:

- docs/migration-state-report.md exists
- locked files are not modified
- PHASE rules are respected

---

## Step 3.2 — Auto-fix migration bot (safe mode)

Create:

```

tools/migration/auto-fix-migration-bot.ts

```

Allowed operations:

- replace apiClient Jira usage → JiraExtensionProvider
- fix known migration patterns

DO NOT modify architecture structure.

---

# 🧱 PHASE 4 — NX BOUNDARY ENFORCEMENT

Ensure ESLint config includes:

- scope:core
- scope:providers
- scope:ui

Rules:

- core → only core/shared
- providers → core/shared only
- ui → core/shared only

---

# 📊 PHASE 5 — DEPENDENCY GRAPH GENERATION

Create:

```

tools/graph/dependency-graph.ts

```

Outputs:

- nodes: core, providers, ui, capability-engine
- edges: dependency relationships

Used for visual system map UI.

---

# 🚀 PHASE 6 — CI PIPELINE INTEGRATION

## GitHub Actions

Add to:

```

.github/workflows/ci.yml

````

Steps:

```bash
- Nx lint
- Nx test
- Nx build

- node tools/audit/jira-leak-detector.ts
- node tools/audit/capability-validator.ts
- node tools/migration/auto-fix-migration-bot.ts
- node tools/graph/dependency-graph.ts
````

---

# 🚨 CI FAILURE RULES

CI MUST FAIL if:

- Jira leaks detected
- provider boundaries violated
- capability system invalid
- migration state missing
- extension-layer violations exist

---

# 🧠 PHASE 7 — SYSTEM GUARANTEE

After CI is active:

✔ No Jira logic outside extension layer
✔ No architectural drift allowed
✔ Capability system always valid
✔ Migration phases enforced
✔ Nx boundaries strictly respected

---

# 🏁 FINAL OUTCOME

You now have:

- Architecture-aware CI system
- Migration enforcement layer
- Plugin-ready validation system
- Capability-safe UI foundation
