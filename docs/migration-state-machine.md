# 🚀 MIGRATION STATE MACHINE (SOURCE OF TRUTH)

## 🧠 PURPOSE

This system ensures deterministic migration execution across:

- PHASES
- BATCHES
- VALIDATION GATES
- CI enforcement

---

# 🧩 CORE MODEL

## STATE = Migration Phase Snapshot

Example states:

- PHASE_2_4
- PHASE_3_3_BATCH_1
- PHASE_3_3_BATCH_2
- PHASE_3_3_BATCH_3
- PHASE_4

---

## EVENT = Trigger Action

Examples:

- batch_completed
- validation_passed
- leak_detected
- ci_failed

---

## TRANSITION RULES

A phase can ONLY transition if:

✔ validation report exists  
✔ no Jira leaks detected  
✔ CI passes  
✔ no missing hooks/providers

---

# 🚨 HARD RULES

## 1. No silent advancement

Never move to next phase automatically.

## 2. No skipped validation

Every batch must produce a validation report.

## 3. No partial assumptions

Existing code ≠ completed phase.

---

# 🧠 VALIDATION GATES

Before ANY transition:

- provider completeness check
- hook coverage check
- apiClient leakage scan
- capability consistency check

---

# 🔁 STATE PERSISTENCE

State must be stored in:

docs/migration-state-report.md

and updated after every batch.

---

# 🚀 FINAL GUARANTEE

This system ensures:

✔ deterministic migration  
✔ no skipped phases  
✔ no hidden drift  
✔ safe multi-batch execution
