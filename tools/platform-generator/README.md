# platform-generator

Nx local plugin (Phase 6) for scaffolding **platform apps**, **stub providers**, **capability/UI registry extensions**, and **`.env.<platform>.template`** — without editing Jira core classes.

## Building

```bash
nx run platform-generator:build
```

The repo includes **`.nxignore`** for `dist/tools/platform-generator` so Nx does not treat compiled plugin output as a second project (which would drop the `build` target).

## Generator: `platform-app`

```bash
nx g platform-generator:platform-app --name=<platform-id>
```

- **Reserved** ids: `jira` (rejected).
- **Capability registry**: platforms already defined in `capability-registry.ts` (`jira`, `asana`, `trello`) skip the generated capability file; others append to `capability-registry.extensions.ts` and `libs/capabilities/src/lib/platforms/<id>.capabilities.ts`.
- **UI schema**: built-in switch platforms skip `platform-ui-schema.extensions.ts` entries; others get a default container schema.
- **Provider registry**: appends to `libs/providers/jira/src/lib/platform-registry.extensions.ts` (relative import into `libs/providers/<id>/`).
- **Existing app** (`apps/<id>-app` already present): only adds missing `src/config/platform.config.ts` and `.env.<id>.template` (does not overwrite `page.tsx` / `next.config.js`).

## Phase 6.2 notes

- Generated provider packages have `"type": "commonjs"` removed so Next/Turbopack can bundle ESM-style sources.
- Junk file `libs/providers/<id>/src/lib/<id>-providers.ts` from `@nx/js:library` is deleted after generation.

## Phase 6.3 — input validation

- `assertValidPlatformSchema()` enforces name normalization, length, pattern, reserved ids, and **name/type alignment** when `type` is not `custom` (`--name=asana --type=asana`).
- JSON schema: `additionalProperties: false`, `type` enum `asana | trello | wrike | custom` ( **`jira` is not scaffoldable** ).

## Phase 6.4 — generator flow

- `platformAppGenerator` maps to: app shell → provider lib → capabilities + extension files → UI schema extension → platform registry extension → env template (see `platform-app.ts`).

## Phase 6.5 — capability auto-wiring

- `getGeneratedCapabilityFlags(platformKind)` is the single preset source for generated `*.capabilities.ts` (no edits to `capability-engine.ts` / `getEnabledFeatures()`).

## Phase 6.6 — platform registry (source of truth)

- Task `PLATFORM_CONFIG` merge lives in **`libs/providers/jira/src/lib/platform-registry.ts`** + **`platform-registry.extensions.ts`** (not under `libs/platform/` — see `registry-paths.ts`).

## Phase 6.7 — safety

- `assertSafePlatformGeneration(id)` and `assertWritePathAllowed(path)` block reserved ids and writes to Jira core / capability engine / runtime UI engine files (see `safety.ts`).
