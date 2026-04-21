````md
# 🚀 NEXT PHASE: FEATURE ARCHITECTURE + GENERATOR EVOLUTION

---

# 🧠 GOAL

Evolve the NX monorepo into a:

- Feature-driven architecture
- Capability-aware system
- Generator-powered multi-platform platform

---

# 🚨 IMPORTANT PRINCIPLES

- DO NOT duplicate features across apps
- DO NOT create sync engines
- DO NOT copy files between apps
- ALWAYS use shared libraries

---

# 🧩 PHASE 1 — FEATURE EXTRACTION

## Step 1.1

Identify all reusable UI + logic features in Jira app:

Examples:

- Task list
- Task details
- Comments
- Status update
- Attachments

---

## Step 1.2

Extract each feature into:

```bash
libs/features/<feature-name>/
```
````

---

## Step 1.3

Each feature MUST:

- Be platform-agnostic
- Use provider interface
- Not depend on Jira directly

---

# 🧩 PHASE 2 — CAPABILITY SYSTEM

## Step 2.1

Define capability model:

```ts
type Capability = "status" | "comments" | "attachments" | "assignee";
```

---

## Step 2.2

Define per-platform capabilities:

```ts
const CAPABILITIES = {
  jira: ["status", "comments", "attachments"],
  trello: ["comments"],
};
```

---

## Step 2.3

Create capability hook:

```ts
useCapabilities();
```

---

# 🧩 PHASE 3 — FEATURE REGISTRY

## Step 3.1

Create central registry:

```ts
const FEATURES = {
  comments: {
    component: CommentsFeature,
    requiredCapabilities: ["comments"],
  },
};
```

---

## Step 3.2

Dynamic rendering:

```ts
renderEnabledFeatures();
```

---

# 🧩 PHASE 4 — REMOVE DEFAULT CONNECTOR IDEA

## Step 4.1

DO NOT use any app as source of truth

## Step 4.2

All logic must live in:

```bash
libs/

```

---

# 🧩 PHASE 5 — GENERATOR UPGRADE

## Step 5.1

Update generator to:

- Create app
- Wire provider
- Register capabilities
- Import shared features

---

## Step 5.2

Generator MUST NOT:

- Copy feature code
- Duplicate logic
- Create feature files

---

# 🧩 PHASE 6 — PROVIDER EXTENSION

## Step 6.1

Ensure providers expose:

```ts
getCapabilities();
```

---

## Step 6.2

Normalize API responses

---

# 🧩 PHASE 7 — VALIDATION

## Step 7.1

Verify:

- Adding feature updates ALL apps automatically
- No duplication exists
- UI adapts per platform

---

# 🏁 FINAL GOAL

System should support:

✔ Add feature ONCE → available everywhere  
✔ Add platform → no code duplication  
✔ UI adapts via capability matrix  
✔ Generator creates fully working apps

---

# 🚨 STOP CONDITIONS

If any step introduces:

- duplication
- sync logic
- manual propagation

→ STOP and refactor to shared-lib approach

```

---

# 💥 Final Insight (this is the key)

What you *thought* you needed:

> “propagate features across apps”

What you *actually need*:

> 👉 **never propagate — just share**

---

If you want next:

🔥 I can design:
- :contentReference[oaicite:3]{index=3}
- or **:contentReference[oaicite:4]{index=4}**
- or **:contentReference[oaicite:5]{index=5}**

Just say 👍
::contentReference[oaicite:2]{index=2}

```
