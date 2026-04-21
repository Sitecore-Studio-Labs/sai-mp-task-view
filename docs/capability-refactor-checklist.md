# 🧠 CAPABILITY-DRIVEN REFACTOR CHECKLIST (PHASE 4)

---

# 🎯 GOAL

Ensure UI is fully driven by capability system — NOT platform logic.

---

# 🔍 CHECKLIST

## 1. REMOVE PLATFORM COUPLING

❌ No imports like:

- JiraProvider
- Asana API directly
- Trello SDK calls

✔ Must use:

- TaskPlatformProvider only

---

## 2. VERIFY FEATURE ENGINE USAGE

Every UI feature must:

✔ Check capability before rendering  
✔ Use resolveFeatures() output  
✔ Avoid hardcoded platform checks

---

## 3. VALIDATE UI COMPONENTS

Check:

- Task list
- Task detail
- Comments
- Status updates

Each MUST be:

✔ capability-driven  
✔ not platform-driven

---

## 4. VERIFY DATA FLOW

All data MUST flow:

Provider → Normalizer → Feature Engine → UI

---

## 5. REMOVE DIRECT API CALLS

Search for:

- axios.get("/jira")
- fetch("/asana")
- hardcoded endpoints

Replace with:

✔ provider.getTasks()
✔ provider.getProjects()

---

## 6. SUPABASE CHECK

Ensure:

✔ multi-tenant isolation
✔ no platform-specific schema usage in UI layer

---

# 🧠 FINAL RULE

> UI never knows the platform. Only capabilities.
