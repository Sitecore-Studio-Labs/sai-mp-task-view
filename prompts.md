Goal: Execute the implementation plan defined in @next-steps.md to evolve the NX monorepo into a feature-driven, capability-based multi-platform system.

Context:

- migration-mvp-guide.md has already been completed.
- The repository is now an NX monorepo with a working Jira app.
- next-steps.md exists in the project root.
- Strict rules exist in @.cursor/rules/ (migration-enforcer.mdc).

---

# 🔴 CRITICAL INSTRUCTION

You MUST strictly follow:

1. next-steps.md
2. All Cursor rules in .cursor/rules

Do NOT deviate.

---

# 🧠 EXECUTION PROTOCOL

## 1. INITIAL STEP (MANDATORY)

- Read the FULL next-steps.md file
- Summarize:
  - Phases
  - Key architectural goals
  - Constraints

DO NOT start coding yet

---

## 2. STEP-BY-STEP EXECUTION

- Execute EXACTLY one step at a time
- Follow phases in order
- Do NOT skip steps

---

## 3. BEFORE EACH STEP

You MUST:

- State:
  - Phase
  - Step number
- Explain:
  - What will be implemented
  - Why it is needed
- List affected files

---

## 4. AFTER EACH STEP

You MUST:

- Show all code changes (diff or full code)
- Confirm completion
- WAIT for user approval

DO NOT proceed automatically

---

## 5. HARD CONSTRAINTS

You MUST:

- NOT duplicate features across apps
- NOT create sync or propagation systems
- NOT copy files between apps
- ONLY use shared libs (libs/features, libs/core, etc.)

---

## 6. ARCHITECTURE TARGET

You are building:

- Feature-driven architecture (libs/features)
- Capability-aware rendering system
- Provider-based abstraction
- Generator-powered app creation

---

## 7. VALIDATION RULE

After each PHASE:

- Ensure all apps still run
- Ensure no duplication exists
- Ensure features are reusable across platforms

---

## 8. STOP CONDITIONS

STOP and ask if:

- A step is unclear
- A change may break Jira app
- A decision requires architectural judgment

---

## 9. PRIORITY ORDER

1. next-steps.md
2. migration-enforcer.mdc rules
3. Existing codebase patterns
4. Your reasoning

---

## 10. START POINT

Begin with:

👉 PHASE 1 — Step 1.1 (Feature Identification from Jira App)
@Browser
