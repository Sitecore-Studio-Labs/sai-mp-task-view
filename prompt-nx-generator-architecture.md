Goal: Implement NX generator architecture described in docs/nx-generator-architecture.md.

Context:

- NX monorepo already exists
- provider-mapping.md is authoritative mapping reference
- feature engine + capability system already implemented

---

# 🔴 STRICT RULES

1. Follow docs/nx-generator-architecture.md exactly
2. Follow docs/provider-mapping.md for ALL data transformations
3. Do NOT introduce new architecture outside defined layers

---

# 🧠 EXECUTION FLOW

## PHASE 1 — Architecture Analysis

- Read nx-generator-architecture.md
- Identify all system layers

## PHASE 2 — Generator Implementation

- Implement NX generator
- Add YAML parser integration
- Wire provider injection system

## PHASE 3 — Provider Wiring

- Create provider factory
- Inject capabilities automatically

## PHASE 4 — Feature Engine Integration

- Connect capability → feature resolver
- Ensure runtime UI composition works

## PHASE 5 — Supabase Wiring

- Add schema references
- Ensure multi-tenant support structure exists

---

# 🚨 STOP CONDITIONS

Stop immediately if:

- provider-mapping.md is missing required mapping
- capability system is bypassed
- platform-specific UI is introduced

---

# 🏁 START

Begin with PHASE 1 — Architecture Analysis
