## 🚀 File: `docs/versioned-capability-system.md`

This includes:

- versioning design
- migration strategy
- generator integration
- feature engine behavior
- Supabase impact
- AND the auto-migration tool (included as requested)

---

## 🧠 VERSIONED CAPABILITY SYSTEM (FULL GUIDE)

```md
# 🚀 Versioned Capability System (NX Platform Architecture)

---

# 🧠 GOAL

Introduce a versioned capability system that allows:

- Safe evolution of platform integrations (Jira, Asana, Trello, Wrike)
- Backward compatibility across generated apps
- Deterministic feature rendering
- Safe upgrades without breaking UI or providers

---

# 🧱 CORE IDEA

Capabilities are NOT static.

They are versioned contracts:
```

platform@version → capability set

````

Example:

- jira@1.0.0
- jira@2.0.0

---

# 📁 SYSTEM STRUCTURE

libs/core/capabilities/
  ├── capability-registry.ts
  ├── capability-resolver.ts
  ├── capability-migrations.ts
  ├── capability-manifest.ts

---

# 🧠 PHASE 1 — CAPABILITY REGISTRY DESIGN

Each platform has multiple versions.

```ts
CAPABILITY_REGISTRY = {
  "jira@1.0.0": { taskCrud: true, comments: true },
  "jira@2.0.0": { taskCrud: true, comments: true, automation: true }
}
````

---

# 🧠 PHASE 2 — VERSION RESOLUTION

Resolve capabilities dynamically:

```ts
getCapabilities(platform, version) {
  return CAPABILITY_REGISTRY[`${platform}@${version}`];
}
```

---

# 🧠 PHASE 3 — FEATURE ENGINE COMPATIBILITY

Feature engine must ALWAYS depend on resolved capabilities:

```ts
resolveFeatures(capabilities) → UI Features
```

NO direct platform checks allowed.

---

# 🧠 PHASE 4 — GENERATOR INTEGRATION (NX)

When generating an app:

```bash
nx g platform-app --platform=jira --version=2.0.0
```

Generator MUST:

- read versioned capabilities
- inject correct provider version
- register feature compatibility layer

---

# 🧠 PHASE 5 — SUPABASE IMPACT

Store version per connection:

```sql
alter table connections add column platform_version text;
```

This ensures:

- backward compatibility per tenant
- safe upgrades
- rollback support

---

# 🧠 PHASE 6 — MIGRATION SYSTEM (CRITICAL)

## Capability migration tracking

```ts
CAPABILITY_MIGRATIONS = {
  "jira@1.0.0 -> jira@2.0.0": {
    added: ["automation"],
    removed: [],
    breaking: false,
  },
};
```

---

## AUTO MIGRATION TOOL

When upgrading platform version:

### Step 1

Detect outdated version

### Step 2

Compare migration map

### Step 3

Auto-apply safe upgrades

### Step 4

Flag breaking changes

---

## MIGRATION EXECUTOR

```ts
function migrateCapabilities(platform, from, to) {
  const migrationKey = `${platform}@${from} -> ${platform}@${to}`;

  const migration = CAPABILITY_MIGRATIONS[migrationKey];

  if (!migration) {
    throw new Error("No migration path found");
  }

  return {
    updatedCapabilities: applyMigration(from, migration),
    breaking: migration.breaking,
  };
}
```

---

# 🚨 RULES

- NEVER mutate old capability versions
- NEVER overwrite existing registry entries
- ALWAYS create new version for changes
- UI must never depend on version directly

---

# 🧠 SYSTEM BEHAVIOR

| Layer          | Responsibility              |
| -------------- | --------------------------- |
| Registry       | defines capability versions |
| Resolver       | selects correct version     |
| Feature Engine | maps capability → UI        |
| Generator      | wires correct version       |
| Supabase       | stores version per tenant   |

---

# 🏁 OUTCOME

This system enables:

✔ Safe evolution of integrations
✔ Backward compatibility
✔ Deterministic UI generation
✔ Multi-tenant version isolation
✔ Zero breaking deployments
