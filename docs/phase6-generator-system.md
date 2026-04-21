````md
# 🚀 PHASE 6 — NX GENERATOR SYSTEM (PRODUCTION STARTER PACK)

## 🧠 OBJECTIVE

Replace manual platform app creation with:

👉 Nx Plugin-based generator system  
👉 Fully capability-aware  
👉 Provider-injected apps  
👉 Zero-code provisioning model

---

# 🧱 PHASE 6.1 — CREATE NX PLUGIN

## Step 1 — Create Plugin Scaffold

Run:

```bash
nx g @nx/plugin:plugin tools/platform-generator
```
````

---

## Step 2 — Add Generator

```bash
nx g @nx/plugin:generator tools/platform-generator/src/generators/platform-app

```

---

## Output Structure

```
tools/platform-generator/
  src/
    generators/
      platform-app/
        generator.ts
        schema.json
        schema.d.ts

```

---

# 🧠 PHASE 6.2 — GENERATOR RESPONSIBILITIES

The generator MUST:

## 1. Create NX App

```
apps/{platform}-app

```

---

## 2. Inject Provider

- libs/providers/{platform}
- register in platform registry

---

## 3. Setup Environment

Generate:

```bash
.env.platform

```

With:

- OAuth keys
- API base URL
- Supabase config

---

## 4. Configure Capabilities

Inject:

```ts
CAPABILITY_REGISTRY[platform];
```

---

## 5. Register Platform

Update:

```
libs/platform/src/lib/platform-registry.ts

```

---

# ⚙️ PHASE 6.3 — GENERATOR INPUT SCHEMA

```ts
export interface PlatformGeneratorSchema {
  name: string;
  type: "jira" | "asana" | "trello" | "wrike" | "custom";
}
```

---

# 🧠 PHASE 6.4 — GENERATOR LOGIC (CORE)

```ts
export default async function generator(tree, options) {
  const platform = options.name;

  // 1. Create app
  createApplication(tree, platform);

  // 2. Create provider
  createProvider(tree, platform);

  // 3. Inject capabilities
  injectCapabilities(tree, platform);

  // 4. Register platform
  updatePlatformRegistry(tree, platform);

  // 5. Add env template
  createEnvTemplate(tree, platform);

  return tree;
}
```

---

# 🧠 PHASE 6.5 — CAPABILITY AUTO-WIRING ENGINE

## RULE

Every new platform MUST auto-register:

- capabilities
- UI schema mapping
- provider mapping

---

## Auto mapping rule

```ts
platform → capability registry → UI feature engine

```

---

## Example:

```ts
jira → {
  status: true,
  comments: true,
  attachments: true
}

```

---

# 🧠 PHASE 6.6 — PLATFORM REGISTRY AUTO-BUILDER

File:

```
libs/platform/src/lib/platform-registry.ts

```

---

## Behavior

Auto-append:

```ts
export const PLATFORM_CONFIG = {
  jira: JiraProvider,
  asana: AsanaProvider,
  trello: TrelloProvider,
};
```

---

## Rule:

✔ NEVER overwrite existing entries  
✔ ALWAYS append new platforms  
✔ NEVER modify existing provider logic

---

# 🧠 PHASE 6.7 — SAFETY RULES

## ❌ DO NOT:

- modify Jira provider logic
- change capability engine core
- touch BFF layer
- modify runtime UI engine

## ✅ DO:

- only extend via generator
- only inject via registry
- only add new modules

---

# 🏁 PHASE 6 OUTCOME

After completion:

✔ 1 command creates full platform app  
✔ provider auto-injected  
✔ capabilities auto-wired  
✔ UI automatically adapts  
✔ Supabase ready  
✔ zero manual wiring

---

# 🚀 FINAL RESULT

```bash
nx g platform-app --name=asana

```

➡ generates FULL working platform integration

```

---

# ⚡ END FILE

```

---
