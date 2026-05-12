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

### 2. Turbopack — static alias map (`turbopack.resolveAlias`)

Some platform apps (e.g. scaffolds from `platform-app`) register a **static** Turbopack alias map built by `tools/webpack-plugins/buildUiShadowTurboAliases.js`, which walks `src/` and maps each override to `@mp/ui/<mirrored-subpath>`:

```ts
turbopack: {
  resolveAlias: buildUiShadowTurboAliases(
    path.resolve(__dirname, "src"),
    path.resolve(__dirname, "../../libs/ui/src"),
    __dirname,
  ),
},
```

The third argument is the directory that contains `next.config` (pass `__dirname`). The helper emits paths **relative to that directory** so Turbopack treats shadow files as in-project modules (absolute targets are treated as externals in client chunks).

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

## Nx commands and which dev bundler you get

In Nx, these run the **same** `serve` target from `apps/<platform>/project.json`:

```bash
npx nx run wrike:serve
npx nx serve wrike
```

There is no behavioural difference between `nx run …:serve` and `nx serve …` for a given project.

What **does** matter for shadowing is the **command inside that target**. Platform apps in this repo configure `serve` as:

```text
next dev --webpack
```

(with `cwd` set to `apps/<platform>/`), so the dev server uses **Webpack** and `UiShadowResolverPlugin` (§3): overrides are resolved dynamically and HMR tracks the app file correctly.

If you start the app differently, behaviour diverges:

| How you start                                 | Typical effect on shadows                                                                                                                                                                                                                |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`nx run <app>:serve` / `nx serve <app>`**   | Uses `project.json` → `next dev --webpack` → webpack plugin active.                                                                                                                                                                      |
| **`cd apps/<app> && npx next dev`** (no flag) | Next 16 defaults to **Turbopack**; the `webpack()` hook is **not** used. Both `jira` and `wrike` have `turbopack.resolveAlias`, so shadows still apply via the static map — but restart the dev server after adding a new override file. |
| **`cd apps/<app> && npx next dev --webpack`** | Same as the Nx target; fine for ad-hoc runs.                                                                                                                                                                                             |

So: **`nx serve <app>` and `nx run <app>:serve` are identical.** If shadows seem missing, check you are not using a plain `next dev` run without `--webpack` on an app that predates the `turbopack.resolveAlias` block, or that you restarted the dev server after adding a new shadow file.

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

### The fast path — `create-shadow` (recommended for form-field components)

`tools/create-shadow.js` analyses the source component in `libs/ui`, generates a shadow file at the correct mirrored path inside your app, and pre-wires all react-hook-form contracts so the form keeps working out of the box while you focus entirely on the UI.

```bash
# node tools/create-shadow.js <appName> <componentSubPath>
node tools/create-shadow.js jira components/tasks/task-form/TaskFormAssigneeField

# or via the npm script alias:
npm run create-shadow -- jira components/tasks/task-form/TaskFormAssigneeField
```

`<componentSubPath>` is the path **relative to `libs/ui/src/`**, without the `.tsx` extension.

#### What the script does

1. **Resolves and validates paths.** Source must exist at `libs/ui/src/<componentSubPath>.tsx`. Errors out (no overwrite) if a shadow already exists at `apps/<appName>/src/<componentSubPath>.tsx`.

2. **Analyses the source component.** Extracts:
   - The exported function name
   - `useFormContext<Type>` — the form schema type the component is bound to
   - `<Controller name="…">` — every field registered with react-hook-form
   - `field.onChange(…)` calls or `{...field}` spread — how values flow back into the form
   - Capability guard flags (`hasAssignees`, `hasPriorities`, …)
   - The props type definition (if present)
   - Relevant `@mp/task-core` type and value imports

3. **Generates the shadow file.** Writes a file that:
   - Preserves all react-hook-form wiring (`Controller`, `field.onChange`, `useFormContext`) intact
   - Replaces the actual UI with `// TODO: replace with your custom UI` placeholders
   - Emits a `// Form contract (must keep)` block at the top of the function listing every piece of wiring that must not be removed
   - Keeps only the imports the generated scaffold needs

4. **Creates parent directories** if they don't already exist.

5. **Prints a summary** of the preserved form contract and next steps.

#### Example — generated file for `TaskFormAssigneeField`

```tsx
"use client";

import type { AssigneeOption, CreateTaskFormValues } from "@mp/task-core";
import { usePlatformCapabilities } from "@mp/task-core";
import { TaskFormField } from "@mp/ui/components/tasks/task-form/TaskFormField";
import { Controller, useFormContext } from "react-hook-form";

// TODO: import your custom UI components

// Shadow of: libs/ui/src/components/tasks/task-form/TaskFormAssigneeField.tsx
//
// ─── Form contract (must keep) ────────────────────────────────────────────
//   useFormContext<CreateTaskFormValues>() — connects to the form state
//   <Controller name="assignee"> — writes form.values.assignee on submit
//   field.onChange(selectedId) — updates the form field value
//   if (!hasAssignees) return null — capability guard, do not remove
// ───────────────────────────────────────────────────────────────────────────

type TaskFormAssigneeFieldProps = {
  projectIdOrKey: string;
};

export function TaskFormAssigneeField({ projectIdOrKey }: TaskFormAssigneeFieldProps) {
  const { hasAssignees } = usePlatformCapabilities();
  const {
    control,
    formState: { errors },
  } = useFormContext<CreateTaskFormValues>();
  const assigneeError = errors.assignee?.message;

  if (!hasAssignees) return null;

  return (
    <TaskFormField label="Assignee" htmlFor="assignee" error={assigneeError}>
      {({ errorId }) => (
        <Controller
          name="assignee"
          control={control}
          render={({ field }) => (
            // TODO: replace with your custom UI
            // KEEP: field.onChange(...) to write the selected value into the form
            <div>
              <p>Custom UI — replace this placeholder</p>
              {/* On selection:   field.onChange(selectedId) */}
              {/* To clear:       field.onChange("") */}
            </div>
          )}
        />
      )}
    </TaskFormField>
  );
}
```

The placeholder compiles and renders. Replace the `<div>` block with your real component; everything else — form wiring, error display, capability guard — is already correct.

#### After running `create-shadow`

1. **Replace the placeholder UI** — swap the `<div>` block with your actual component.
2. **Keep all `Controller` / `field.onChange` wiring** — removing any of these breaks form submission for that field.
3. **Restart the dev server** — Turbopack reads the alias map at startup; new shadow files are invisible until you restart (`npx nx serve <appName>`). Webpack picks them up automatically.

---

### Manual creation (for non-form-field components)

`create-shadow` is tailored to react-hook-form components. For display components (headers, badges, layout wrappers) that have no form wiring, create the file manually instead:

**1. Create the file at the mirrored path under `apps/<appName>/src/`:**

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
# NX target (recommended):
npx nx run jira:audit-shadows

# Manual scan:
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
