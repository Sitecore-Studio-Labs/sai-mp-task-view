# 🚀 PHASE 4.2 — RUNTIME CAPABILITY ENGINE (CORE SYSTEM)

You already built:
✔ capability registry
✔ useCapability hook
✔ Feature wrapper

Now we evolve it into:

> 🧠 **Dynamic runtime UI composition system**

(Not static checks anymore — real engine behavior)

---

# 🧩 1. CORE IDEA (IMPORTANT)

Right now you have:

```ts
capabilities["tasks.status"];
```

That is **static UI gating**

---

Now we upgrade to:

## 👉 Capability → UI Resolver Engine

Meaning:

| Input          | Output            |
| -------------- | ----------------- |
| capability map | UI component set  |
| platform       | feature list      |
| context        | dynamic UI layout |

---

# ⚙️ 2. CREATE RUNTIME ENGINE

## 📁 `capability-engine.ts`

```ts id="cap_engine"
import { CAPABILITY_REGISTRY } from "./capability-registry";

export type UIFeature = "status" | "assign" | "attachments" | "comments" | "projects";

export function resolveCapabilities(platform: string): Record<string, boolean> {
  return CAPABILITY_REGISTRY[platform]?.capabilities ?? {};
}

export function getEnabledFeatures(platform: string): UIFeature[] {
  const caps = resolveCapabilities(platform);

  const features: UIFeature[] = [];

  if (caps["tasks.status"]) features.push("status");
  if (caps["tasks.assign"]) features.push("assign");
  if (caps["tasks.attachments"]) features.push("attachments");
  if (caps["tasks.comments"]) features.push("comments");
  if (caps["projects.read"]) features.push("projects");

  return features;
}
```

---

# 🧠 3. THIS IS THE KEY SHIFT

Before:

```ts
if (capabilities["tasks.status"]) render();
```

---

Now:

```ts
const features = getEnabledFeatures(platform);
```

Then UI becomes:

```tsx id="ui_runtime"
{
  features.includes("status") && <StatusPanel />;
}
{
  features.includes("assign") && <AssigneePicker />;
}
{
  features.includes("attachments") && <AttachmentZone />;
}
```

---

# 🧩 4. INTRODUCE FEATURE REGISTRY (IMPORTANT)

## 📁 `ui-feature-registry.ts`

```ts id="feature_registry"
import { UIFeature } from "./capability-engine";

export const FEATURE_COMPONENTS: Record<string, React.ComponentType> = {
  status: () => null, // replace with real components later
  assign: () => null,
  attachments: () => null,
  comments: () => null,
  projects: () => null,
};
```

---

# 🧠 5. DYNAMIC UI COMPOSER (CORE ENGINE PIECE)

## 📁 `DynamicTaskView.tsx`

```tsx id="dynamic_ui"
import { getEnabledFeatures } from "./capability-engine";

export function DynamicTaskView({ platform }: { platform: string }) {
  const features = getEnabledFeatures(platform);

  return (
    <div>
      {features.includes("status") && <div>Status UI</div>}
      {features.includes("assign") && <div>Assign UI</div>}
      {features.includes("attachments") && <div>Attachments UI</div>}
      {features.includes("comments") && <div>Comments UI</div>}
    </div>
  );
}
```

---

# 🚨 6. WHAT YOU JUST BUILT (VERY IMPORTANT)

You now have:

## 🟢 Capability Runtime Engine

This is NOT static UI gating anymore.

It is:

> 🧠 “Feature composition engine per platform”

---

# ⚙️ 7. WHY THIS IS ARCHITECTURALLY IMPORTANT

You just moved from:

### ❌ Phase 4.1 (static capability checks)

to

### ✅ Phase 4.2 (runtime UI composition engine)

This is the same pattern used in:

- plugin-based SaaS systems
- micro-frontend feature loaders
- extensible IDE architectures (VS Code style)
