#!/usr/bin/env node
/**
 * tools/create-shadow.js
 *
 * Scaffolds a minimal shadow file for a libs/ui form field component.
 * Keeps all react-hook-form wiring intact; replaces UI internals with TODO placeholders.
 *
 * Usage:
 *   node tools/create-shadow.js <appName> <componentSubPath>
 *
 * Example:
 *   node tools/create-shadow.js wrike components/tasks/task-form/TaskFormAssigneeField
 */

"use strict";

const fs = require("fs");
const path = require("path");

// ── Args ──────────────────────────────────────────────────────────────────────

const [appName, componentPath] = process.argv.slice(2);

if (!appName || !componentPath) {
  console.error(
    "Usage: node tools/create-shadow.js <appName> <componentSubPath>\n" +
      "Example: node tools/create-shadow.js wrike components/tasks/task-form/TaskFormAssigneeField",
  );
  process.exit(1);
}

const workspaceRoot = path.resolve(__dirname, "..");
const sourcePath = path.join(workspaceRoot, "libs/ui/src", componentPath + ".tsx");
const destPath = path.join(workspaceRoot, "apps", appName, "src", componentPath + ".tsx");

if (!fs.existsSync(sourcePath)) {
  console.error(`Source not found: ${path.relative(workspaceRoot, sourcePath)}`);
  process.exit(1);
}

if (fs.existsSync(destPath)) {
  console.error(
    `Shadow already exists: ${path.relative(workspaceRoot, destPath)}\nDelete it first if you want to regenerate.`,
  );
  process.exit(1);
}

const source = fs.readFileSync(sourcePath, "utf-8");

// ── Parse source ──────────────────────────────────────────────────────────────

const fnMatch = source.match(/export function (\w+)/);
const fnName = fnMatch?.[1] ?? path.basename(componentPath);

const formContextMatch = source.match(/useFormContext<(\w+)>/);
const formContextType = formContextMatch?.[1] ?? null;

const controllerNames = [...source.matchAll(/name="(\w+)"/g)].map((m) => m[1]);

const errorKeys = [...source.matchAll(/errors\.(\w+)\?/g)].map((m) => m[1]);

const capabilityMatch = source.match(
  /const\s*\{\s*(has\w+)\s*\}\s*=\s*usePlatformCapabilities\(\)/,
);
const capabilityFlag = capabilityMatch?.[1] ?? null;

const formFieldMatch = source.match(/<TaskFormField\s[^>]*label="([^"]+)"[^>]*htmlFor="([^"]+)"/);
const fieldLabel = formFieldMatch?.[1] ?? "Field";
const fieldHtmlFor = formFieldMatch?.[2] ?? controllerNames[0] ?? "field";

const propsTypeMatch = source.match(/type\s+\w+Props\s*=\s*\{[\s\S]*?\n\};/);
const propsTypeBlock = propsTypeMatch?.[0] ?? null;

const onChangePatterns = [...source.matchAll(/field\.onChange\(([^)]+)\)/g)].map((m) =>
  m[1].trim(),
);
const usesSpread = source.includes("{...field}");

const taskCoreImportMatches =
  source.match(/import\s+(?:type\s+)?\{[^}]+\}\s+from\s+"@mp\/task-core";/g) ?? [];

const usesPlatformCaps = source.includes("usePlatformCapabilities");
const usesTaskFormField = source.includes("TaskFormField");

// ── Assemble imports ──────────────────────────────────────────────────────────

const typeImportItems = new Set();
const valueImportItems = new Set();

for (const imp of taskCoreImportMatches) {
  const isTypeImport = imp.startsWith("import type");
  const items = (imp.match(/\{([^}]+)\}/)?.[1] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (isTypeImport) items.forEach((i) => typeImportItems.add(i));
  else items.forEach((i) => valueImportItems.add(i));
}

if (usesPlatformCaps) valueImportItems.add("usePlatformCapabilities");
if (formContextType) typeImportItems.add(formContextType);

const importLines = ['"use client";', ""];

if (typeImportItems.size > 0)
  importLines.push(`import type { ${[...typeImportItems].join(", ")} } from "@mp/task-core";`);
if (valueImportItems.size > 0)
  importLines.push(`import { ${[...valueImportItems].join(", ")} } from "@mp/task-core";`);

if (usesTaskFormField)
  importLines.push(
    `import { TaskFormField } from "@mp/ui/components/tasks/task-form/TaskFormField";`,
  );

importLines.push(`import { Controller, useFormContext } from "react-hook-form";`);
importLines.push("", "// TODO: import your custom UI components");

// ── Contract comment ──────────────────────────────────────────────────────────

const contractLines = [
  `// Shadow of: libs/ui/src/${componentPath}.tsx`,
  `//`,
  `// ─── Form contract (must keep) ────────────────────────────────────────────`,
];

if (formContextType)
  contractLines.push(`//   useFormContext<${formContextType}>() — connects to the form state`);

for (const name of controllerNames)
  contractLines.push(`//   <Controller name="${name}"> — writes form.values.${name} on submit`);

if (usesSpread) {
  contractLines.push(`//   {...field} — spreads value/onChange/onBlur/ref onto the input`);
} else {
  for (const p of [...new Set(onChangePatterns)])
    contractLines.push(`//   field.onChange(${p}) — updates the form field value`);
}

if (capabilityFlag)
  contractLines.push(`//   if (!${capabilityFlag}) return null — capability guard, do not remove`);

contractLines.push(`// ───────────────────────────────────────────────────────────────────────`);

// ── Body ──────────────────────────────────────────────────────────────────────

const bodyLines = [];

if (propsTypeBlock) bodyLines.push("", propsTypeBlock);

let funcSignature;
if (propsTypeBlock) {
  const propsTypeName = propsTypeBlock.match(/type\s+(\w+)/)?.[1] ?? "Props";
  const destructured = source.match(/export function \w+\(\{([^}]+)\}\s*:/)?.[1];
  funcSignature = destructured
    ? `export function ${fnName}({\n  ${destructured.trim().replace(/,\s*$/, "")},\n}: ${propsTypeName}) {`
    : `export function ${fnName}(props: ${propsTypeName}) {`;
} else {
  funcSignature = `export function ${fnName}() {`;
}

bodyLines.push("", funcSignature);

if (capabilityFlag) bodyLines.push(`  const { ${capabilityFlag} } = usePlatformCapabilities();`);

if (formContextType) {
  if (errorKeys.length > 0) {
    bodyLines.push(
      `  const {`,
      `    control,`,
      `    formState: { errors },`,
      `  } = useFormContext<${formContextType}>();`,
    );
    for (const key of errorKeys) bodyLines.push(`  const ${key}Error = errors.${key}?.message;`);
  } else {
    bodyLines.push(`  const { control } = useFormContext<${formContextType}>();`);
  }
}

if (capabilityFlag) bodyLines.push("", `  if (!${capabilityFlag}) return null;`);

const mainErrorVar = errorKeys[0] ? `${errorKeys[0]}Error` : null;
const mainControllerName = controllerNames[0] ?? fieldHtmlFor;

bodyLines.push("", "  return (");

if (usesTaskFormField) {
  bodyLines.push(
    `    <TaskFormField label="${fieldLabel}" htmlFor="${fieldHtmlFor}"${mainErrorVar ? ` error={${mainErrorVar}}` : ""}>`,
    `      {({ errorId }) => (`,
    `        <Controller`,
    `          name="${mainControllerName}"`,
    `          control={control}`,
    `          render={({ field }) => (`,
    `            // TODO: replace with your custom UI`,
    `            // KEEP: field.onChange(...) to write the selected value into the form`,
  );
  if (usesSpread) {
    bodyLines.push(
      `            // KEEP: {...field} spreads value/onChange/onBlur/ref onto the input`,
      `            <input`,
      `              id="${fieldHtmlFor}"`,
      `              aria-describedby={errorId ?? undefined}`,
      `              aria-invalid={Boolean(${mainErrorVar ?? "false"})}`,
      `              {...field}`,
      `            />`,
    );
  } else {
    bodyLines.push(
      `            <div>`,
      `              <p>Custom UI — replace this placeholder</p>`,
      `              {/* On selection:   field.onChange(selectedId) */}`,
      `              {/* To clear:       field.onChange("") */}`,
      `            </div>`,
    );
  }
  bodyLines.push(`          )}`, `        />`, `      )}`, `    </TaskFormField>`);
} else {
  bodyLines.push(
    `    <Controller`,
    `      name="${mainControllerName}"`,
    `      control={control}`,
    `      render={({ field }) => (`,
    `        // TODO: replace with your custom UI`,
    `        // KEEP: field.onChange(value) to write into the form`,
    `        <div>{/* field.onChange(value) */}</div>`,
    `      )}`,
    `    />`,
  );
}

bodyLines.push("  );", "}");

// ── Write ─────────────────────────────────────────────────────────────────────

const output = [...importLines, "", ...contractLines, ...bodyLines, ""].join("\n");

fs.mkdirSync(path.dirname(destPath), { recursive: true });
fs.writeFileSync(destPath, output, "utf-8");

const contractSummary = [
  ...controllerNames.map((n) => `  • Controller name="${n}" → form.values.${n} on submit`),
  ...(usesSpread ? ["  • {...field} spread — keep on the input"] : []),
  ...[...new Set(onChangePatterns)].map((p) => `  • field.onChange(${p})`),
].join("\n");

console.log(`
✓  Shadow created: apps/${appName}/src/${componentPath}.tsx

Form contract preserved:
${contractSummary}

Next steps:
  1. Replace the placeholder UI with your custom component
  2. Keep all Controller / field.onChange wiring intact
  3. Restart dev server (Turbopack) or run: npx nx serve ${appName}
`);
