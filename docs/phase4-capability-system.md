````md
# 🚀 PHASE 4 — CAPABILITY SYSTEM IMPLEMENTATION RUNBOOK

## 🧠 GOAL

Convert UI from:
❌ platform-driven rendering (Jira/Asana/Trello)
TO:
✅ capability-driven rendering system

---

# 📦 STEP 1 — CREATE CORE CAPABILITY TYPES

Create:

📁 libs/capabilities/src/lib/capability-types.ts

```ts
export type CapabilityKey =
  | "tasks.read"
  | "tasks.write"
  | "tasks.status"
  | "tasks.assign"
  | "tasks.comments"
  | "tasks.attachments"
  | "projects.read"
  | "projects.write"
  | "users.read";

export interface PlatformCapabilities {
  platform: string;
  version: string;
  capabilities: Record<CapabilityKey, boolean>;
}
```
````

---

# 📦 STEP 2 — CREATE CAPABILITY REGISTRY

📁 libs/capabilities/src/lib/capability-registry.ts

```ts
import { PlatformCapabilities } from "./capability-types";

export const CAPABILITY_REGISTRY: Record<string, PlatformCapabilities> = {
  jira: {
    platform: "jira",
    version: "1.0",
    capabilities: {
      "tasks.read": true,
      "tasks.write": true,
      "tasks.status": true,
      "tasks.assign": true,
      "tasks.comments": true,
      "tasks.attachments": true,
      "projects.read": true,
      "projects.write": true,
      "users.read": true,
    },
  },

  asana: {
    platform: "asana",
    version: "1.0",
    capabilities: {
      "tasks.read": true,
      "tasks.write": true,
      "tasks.status": false,
      "tasks.assign": true,
      "tasks.comments": true,
      "tasks.attachments": false,
      "projects.read": true,
      "projects.write": true,
      "users.read": true,
    },
  },

  trello: {
    platform: "trello",
    version: "1.0",
    capabilities: {
      "tasks.read": true,
      "tasks.write": true,
      "tasks.status": false,
      "tasks.assign": false,
      "tasks.comments": true,
      "tasks.attachments": false,
      "projects.read": true,
      "projects.write": false,
      "users.read": false,
    },
  },
};
```

---

# 📦 STEP 3 — CREATE UI HOOK

📁 libs/capabilities/src/lib/useCapability.ts

```ts
import { useMemo } from "react";
import { CAPABILITY_REGISTRY } from "./capability-registry";

export function useCapability(platform: string) {
  return useMemo(() => {
    return CAPABILITY_REGISTRY[platform]?.capabilities ?? {};
  }, [platform]);
}
```

---

# 📦 STEP 4 — CREATE FEATURE WRAPPER

📁 libs/capabilities/src/lib/Feature.tsx

```tsx
export function Feature({
  capability,
  children,
}: {
  capability: boolean;
  children: React.ReactNode;
}) {
  if (!capability) return null;
  return <>{children}</>;
}
```

---

# 📦 STEP 5 — UI MIGRATION RULES

## FIND AND REPLACE RULES

### ❌ REMOVE:

```ts
if (platform === "jira")
```

### ❌ REMOVE:

```ts
if (asana)
```

### ❌ REMOVE:

platform-based rendering logic

---

### ✅ REPLACE WITH:

```ts
if (capabilities["tasks.status"])
```

---

# 📦 STEP 6 — VALIDATION RULES

After implementation:

Run:

```bash
nx run jira-app:lint
nx run jira-app:build
```

Check:

- no platform-based UI logic remains
- all conditional rendering uses capability flags

---

# 🚨 STEP 7 — NON-NEGOTIABLE RULES

- DO NOT modify providers
- DO NOT modify JiraExtensionProvider
- DO NOT touch BFF layer
- ONLY UI layer changes allowed
- NO new architecture layers introduced

---

# 🏁 END STATE

You should end with:

✔ Capability-driven UI
✔ Platform-agnostic rendering
✔ Provider layer unchanged
✔ Feature toggling via config only
