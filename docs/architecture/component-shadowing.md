# Component Shadowing

Component shadowing lets a platform app silently replace any component from `libs/ui` with its own version — without modifying the library, forking it, or changing any import statements elsewhere in the codebase.

The pattern is inspired by [Gatsby theme shadowing](https://www.gatsbyjs.com/docs/how-to/plugins-and-themes/shadowing/).

---

## The problem it solves

`libs/ui` contains `TaskFormHeader` — a back button + form title shown at the top of the create/edit task forms. The default implementation is generic. An app like `apps/jira` might want a customised version (different layout, extra navigation logic, branding).

Without shadowing, the options are:

- **Fork `libs/ui`** — breaks the single source of truth; updates to the lib must be manually merged.
- **Prop drilling / render props** — forces the lib to anticipate every customisation up-front; becomes unmaintainable.
- **Shadowing** — drop a file at the right path and the bundler routes all imports to it automatically.

---

## How it works

Three mechanisms work in concert. All three must agree for shadowing to work correctly.

### 1. TypeScript path candidates

`apps/jira/tsconfig.json` lists `./src/*` before `../../libs/ui/src/*` for the `@mp/ui/*` alias:

```jsonc
{
  "compilerOptions": {
    "paths": {
      "@mp/ui/*": ["./src/*", "../../libs/ui/src/*"],
    },
  },
}
```

When you write `import { TaskFormHeader } from "@mp/ui/components/tasks/task-form/TaskFormHeader"`, TypeScript checks `apps/jira/src/components/tasks/task-form/TaskFormHeader.{tsx,ts}` first. If found, that file is the type-checked module. If not, it falls through to `libs/ui/src/components/tasks/task-form/TaskFormHeader.tsx`.

This gives you correct IDE intellisense and type-checking for the override.

### 2. Turbopack — static alias map (default dev server)

`apps/jira/next.config.ts` scans `src/` at startup and registers every found file as a Turbopack `resolveAlias` entry:

```ts
turbopack: {
  resolveAlias: buildShadowAliases(
    path.resolve(__dirname, "src"),  // shadow root
    "@mp/ui",                         // alias prefix to intercept
    __dirname,                         // Next.js project root (apps/jira)
  ),
},
```

`buildShadowAliases` walks `src/`, and for each `.tsx/.ts/.jsx/.js` file it finds, emits:

```
"@mp/ui/components/tasks/task-form/TaskFormHeader"
  → "./src/components/tasks/task-form/TaskFormHeader"
```

The alias value is **project-relative** (`./src/…`) rather than an absolute path. This is required because Turbopack creates separate chunking contexts for `transpilePackages`. An absolute path crossing from `libs/ui`'s context into `apps/jira/src/` would be rejected as an "external module". A project-relative path stays inside the app's own compilation context.

**Important:** Turbopack resolves these aliases statically at startup. Adding a new override file requires a dev-server restart.

### 3. Webpack — dynamic resolver plugin (CI / `--webpack` builds)

For webpack builds, `tools/webpack-plugins/UiShadowResolverPlugin.js` hooks into enhanced-resolve and checks `fs.existsSync` per request at bundle time:

```ts
webpack(config) {
  config.resolve.plugins.push(
    new UiShadowResolverPlugin({
      overridesDir: path.resolve(__dirname, "src"),
    }),
  );
  return config;
},
```

The plugin intercepts every `@mp/ui/<subpath>` import and looks for a matching file in `src/<subpath>`. If found, it redirects the bundler there. If not, it falls through to normal resolution (which resolves to `libs/ui`).

Unlike Turbopack, webpack's plugin checks the filesystem dynamically — new override files are picked up without a restart.

---

## A requirement: package-absolute imports inside `libs/ui`

For individual components to be shadowable, `libs/ui` must import its own sub-components via **package-absolute paths**, not relative paths.

**Correct** (shadowable):

```ts
// libs/ui/src/components/tasks/CreateTaskView.tsx
import { TaskFormHeader } from "@mp/ui/components/tasks/task-form/TaskFormHeader";
```

**Wrong** (bypasses the shadow resolver):

```ts
// libs/ui/src/components/tasks/CreateTaskView.tsx
import { TaskFormHeader } from "./task-form/TaskFormHeader";
```

With a relative import, the bundler resolves the path at compile time within `libs/ui`'s own context. It never reaches the shadow resolver, so the override in `apps/jira/src/` is never seen.

All task-form field components and the task views (`CreateTaskView`, `EditTaskView`, `WorkBreakdownEditForm`) already use package-absolute imports. Any new `libs/ui` component that should be individually shadowable must follow the same convention.

---

## Creating an override

To replace `TaskFormHeader` in `apps/jira`:

**1. Create the file at the mirrored path under `apps/jira/src/`:**

```
libs/ui/src/components/tasks/task-form/TaskFormHeader.tsx   ← original
apps/jira/src/components/tasks/task-form/TaskFormHeader.tsx ← override (create this)
```

The path after `src/` must exactly match the path in `libs/ui/src/`.

**2. Implement your component.** It must export the same function name:

```tsx
// apps/jira/src/components/tasks/task-form/TaskFormHeader.tsx
"use client";

import { mdiArrowLeft } from "@mdi/js";
import { Button } from "@mp/ui/components/ui/button";
import { Icon } from "@mp/ui/components/ui/icon";

type TaskFormHeaderProps = {
  formTitle: string;
  onBack: () => void;
};

export function TaskFormHeader({ formTitle, onBack }: TaskFormHeaderProps) {
  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="ghost" size="sm" onClick={onBack}>
        <Icon path={mdiArrowLeft} size="sm" />
        Back
      </Button>
      <span className="text-muted-foreground text-sm">{formTitle}</span>
    </div>
  );
}
```

**3. Restart the dev server.** Turbopack builds the alias map at startup; a running server won't see the new file until restarted. (Webpack builds pick it up automatically.)

That's it — no changes to `libs/ui`, no changes to import statements anywhere else. Every consumer of `@mp/ui/components/tasks/task-form/TaskFormHeader` inside `apps/jira` now gets your version.

---

## Checking what is currently shadowed

```bash
# List all active overrides in apps/jira
find apps/jira/src -name "*.tsx" -o -name "*.ts" | \
  while read f; do
    rel="${f#apps/jira/src/}"
    lib="libs/ui/src/${rel}"
    [ -f "$lib" ] && echo "SHADOWED: $f → $lib"
  done
```

---

## Caveats

| Concern                    | Detail                                                                                                                                                            |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Turbopack requires restart | The alias map is built at startup. New override files are invisible until you restart the dev server.                                                             |
| Type signature must match  | TypeScript checks the override against the same call sites. If your props differ, you'll get a type error where the component is used.                            |
| No partial override        | You replace the whole component. If you only want to change styling, consider a CSS override or Tailwind variant instead.                                         |
| Accidental shadowing       | Any file you place at `apps/jira/src/<path>` that matches a `libs/ui/src/<path>` will become an override. Keep this in mind when adding new app-level components. |

---

## Extending to other libraries

The current setup intercepts only `@mp/ui/*`. To shadow a different library (e.g. `@mp/task-core`), add a second `UiShadowResolverPlugin` instance with a different `libAlias`, and add a second set of `resolveAlias` entries pointing to a different shadow root directory.
