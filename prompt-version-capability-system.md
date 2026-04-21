---

```md
Goal: Implement versioned capability system described in docs/versioned-capability-system.md into NX monorepo.

Context:
- NX monorepo already contains provider + feature engine + capability system
- Supabase integration exists
- provider-mapping.md is the source of truth for normalization

---

# 🔴 STRICT RULES

1. Follow versioned-capability-system.md exactly
2. NEVER modify existing capability definitions in-place
3. ALWAYS create new version entries instead of overwriting
4. DO NOT break feature engine compatibility layer

---

# 🧠 EXECUTION FLOW

## PHASE 1 — Capability Registry Setup

- Implement versioned registry structure
- Refactor existing CAPABILITIES into versioned format

## PHASE 2 — Resolver Layer

- Implement getCapabilities(platform, version)
- Ensure feature engine uses ONLY resolved output

## PHASE 3 — Generator Integration

- Extend NX generator to accept --version flag
- Inject version into provider + app scaffolding

## PHASE 4 — Supabase Update

- Add platform_version column to connections table
- Ensure version is stored per tenant

## PHASE 5 — Migration System

- Implement capability migration engine
- Add migration detection logic
- Ensure safe upgrade path

---

# 🚨 STOP CONDITIONS

STOP if:

- old capability system is still being used directly
- versioning is bypassed
- UI depends on platform-specific logic

---

# 🏁 START EXECUTION

Begin with PHASE 1 — Capability Registry Setup

```

```
