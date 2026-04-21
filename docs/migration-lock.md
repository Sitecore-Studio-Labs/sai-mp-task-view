# 🚨 MIGRATION LOCK SYSTEM (CURSOR GUARDRAILS)

---

# 🧠 PURPOSE

This file prevents Cursor from modifying completed migration phases.

---

# 🔒 LOCKED PHASES

The following phases are LOCKED and must NOT be modified:

## PHASE 2.4–3.2 (COMPLETED)

- TaskPlatformProvider implementation
- JiraTaskPlatformProvider implementation
- Platform registry setup
- Jira provider wiring in apps/jira-app
- Next.js build verified working

---

# 🚨 STRICT RULES

Cursor MUST obey:

❌ Do NOT refactor locked phases  
❌ Do NOT rename completed interfaces  
❌ Do NOT change provider contract  
❌ Do NOT reintroduce apiClient Jira calls

---

# 🧠 ALLOWED ACTIONS

✔ Extend provider layer  
✔ Add new platforms  
✔ Implement new features on top  
✔ Refactor ONLY PHASE 3.3+ code

---

# 🛑 HARD STOP CONDITION

If a change affects locked phases:

→ STOP execution  
→ Report conflict  
→ Ask user before continuing

---

# 🧠 GOLDEN RULE

> “Stability first, extension second.”
