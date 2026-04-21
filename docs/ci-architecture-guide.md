# 🚀 CI ARCHITECTURE GUIDE (Nx + Plugin + Migration-Aware System)

## 🧠 PURPOSE

This CI system enforces:

- Nx monorepo boundaries
- Provider architecture rules
- Migration safety (PHASE 2 → PHASE 4)
- Jira leak prevention
- Capability system integrity
- Extension-layer isolation

---

# 🧱 CI LAYERS

## 1. Lint Layer (Static Safety)

- Nx lint checks
- TypeScript validation
- import boundary rules

---

## 2. Architecture Guard Layer

Enforces:

- NO Jira logic in core provider
- ONLY JiraExtensionProvider for Jira APIs
- No apiClient usage in migrated hooks
- Strict Nx tags:
  - scope:core
  - scope:providers
  - scope:ui

---

## 3. Migration Safety Layer

Validates:

- migration-state-report.md exists
- no PHASE rollback violations
- locked modules are not modified

---

## 4. Jira Leak Detection Layer

Scans for:

- apiClient.get("/jira")
- direct fetch to /jira endpoints
- hardcoded Jira mappings outside provider

Fails CI if detected.

---

## 5. Capability Consistency Layer

Ensures:

- capability map exists per provider
- UI uses only capability-driven rendering
- no UI bypassing feature engine

---

## 6. Build Layer

Runs:

nx run-many -t build,test,lint

---

# 🚨 CI FAILURE RULES

CI MUST FAIL if:

- Jira logic exists outside extension layer
- TaskPlatformProvider is modified incorrectly
- capability system is bypassed
- migration lock file is violated

---

# 🧠 NX ENFORCEMENT

Use Nx module boundaries:

- core → cannot depend on providers
- providers → cannot depend on UI
- UI → only depends on capability engine

---

# 🔒 MIGRATION LOCK SYSTEM

Locked files:

- TaskPlatformProvider
- Platform registry (PHASE 2.4–3.2)
- Completed JiraBffClient logic

---

# 🚀 FUTURE EXTENSION

This CI system will later support:

- plugin marketplace validation
- runtime plugin compatibility checks
- capability versioning enforcement
