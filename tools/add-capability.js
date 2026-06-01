#!/usr/bin/env node
// @ts-check
"use strict";

/**
 * Scaffolds a new boolean capability flag across all the places it needs to live:
 *   1. capabilities/capability-flags.json   (single source of truth)
 *   2. libs/task-core/src/types/platform-capabilities.ts  (TypeScript interface)
 *   3. capabilities/base.yaml               (default: false)
 *
 * Then prints next-step instructions for gating UI, updating adapters, and opting
 * platforms into the new capability.
 *
 * Usage:
 *   node tools/add-capability.js <flagName> "<JSDoc description>"
 *
 * Examples:
 *   node tools/add-capability.js hasDarkMode "Platform supports dark mode theming."
 *   node tools/add-capability.js hasWorklog  "Platform supports time-tracking / worklogs on tasks."
 */

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");

// ── CLI ───────────────────────────────────────────────────────────────────────

const [, , flagName, description] = process.argv;

if (!flagName) {
  console.error(
    'Usage: node tools/add-capability.js <flagName> "<description>"\n' +
      'Example: node tools/add-capability.js hasWorklog "Platform supports time-tracking."',
  );
  process.exit(1);
}

if (!/^has[A-Z]/.test(flagName)) {
  console.error(
    `Error: flag name must start with "has" followed by an uppercase letter (e.g. hasWorklog), got: "${flagName}"`,
  );
  process.exit(1);
}

if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(flagName)) {
  console.error(
    `Error: flag name must be camelCase with no special characters, got: "${flagName}"`,
  );
  process.exit(1);
}

const jsdoc =
  (description ?? "").trim() || `Platform supports the ${flagName.slice(3).toLowerCase()} feature.`;

// ── Step 1: capability-flags.json ─────────────────────────────────────────────

const flagsPath = path.join(ROOT, "capabilities", "capability-flags.json");
const flagsJson = JSON.parse(fs.readFileSync(flagsPath, "utf-8"));

if (flagsJson.providerFlags.includes(flagName)) {
  console.error(`Error: "${flagName}" already exists in capabilities/capability-flags.json`);
  process.exit(1);
}

flagsJson.providerFlags.push(flagName);
fs.writeFileSync(flagsPath, JSON.stringify(flagsJson, null, 2) + "\n", "utf-8");
console.log(`  + capabilities/capability-flags.json  → added "${flagName}" to providerFlags`);

// ── Step 2: PlatformCapabilities TypeScript interface ─────────────────────────

const capabilitiesTypePath = path.join(
  ROOT,
  "libs",
  "task-core",
  "src",
  "types",
  "platform-capabilities.ts",
);
let capabilitiesTs = fs.readFileSync(capabilitiesTypePath, "utf-8");

if (capabilitiesTs.includes(`${flagName}:`)) {
  console.log(
    `  ~ libs/task-core/src/types/platform-capabilities.ts  → "${flagName}" already present, skipped`,
  );
} else {
  // Insert after the last "has*: boolean;" line before richTextFormat.
  const insertAfterRe =
    /([ \t]*\/\*\* Platform supports comments on tasks\. \*\/\n[ \t]*hasComments: boolean;\n)/;
  const replacement = `$1  /** ${jsdoc} */\n  ${flagName}: boolean;\n`;
  const updated = capabilitiesTs.replace(insertAfterRe, replacement);

  if (updated === capabilitiesTs) {
    // Fallback: insert before richTextFormat
    capabilitiesTs = capabilitiesTs.replace(
      /([ \t]*\/\*\* Rich-text format used by the platform for descriptions\/comments\. \*\/\n[ \t]*richTextFormat:)/,
      `  /** ${jsdoc} */\n  ${flagName}: boolean;\n$1`,
    );
    fs.writeFileSync(capabilitiesTypePath, capabilitiesTs, "utf-8");
  } else {
    fs.writeFileSync(capabilitiesTypePath, updated, "utf-8");
  }
  console.log(
    `  + libs/task-core/src/types/platform-capabilities.ts  → added ${flagName}: boolean`,
  );
}

// ── Step 3: capabilities/base.yaml ───────────────────────────────────────────

const baseYamlPath = path.join(ROOT, "capabilities", "base.yaml");
let baseYaml = fs.readFileSync(baseYamlPath, "utf-8");

if (baseYaml.includes(`${flagName}:`)) {
  console.log(`  ~ capabilities/base.yaml  → "${flagName}" already present, skipped`);
} else {
  // Insert after hasComments in base.yaml (keeps comment-reply flags grouped with comments).
  const insertAfterYamlRe = /(  hasComments: (true|false)\n)/;
  const newLine = `  ${flagName}: false\n`;
  const updatedYaml = baseYaml.replace(insertAfterYamlRe, `$1${newLine}`);

  if (updatedYaml === baseYaml) {
    // Fallback: insert before richTextFormat
    baseYaml = baseYaml.replace(/(  richTextFormat:)/, `  ${flagName}: false\n$1`);
    fs.writeFileSync(baseYamlPath, baseYaml, "utf-8");
  } else {
    fs.writeFileSync(baseYamlPath, updatedYaml, "utf-8");
  }
  console.log(`  + capabilities/base.yaml  → added ${flagName}: false`);
}

// ── Done — print next steps ───────────────────────────────────────────────────

console.log(`
✓ Added capability flag: ${flagName}

Next steps
──────────

1. Gate UI in libs/ui (only components that need ${flagName}):

     const { ${flagName} } = usePlatformCapabilities();
     if (!${flagName}) return null;

2. Add a stub to the generator template so new platforms compile:
   File: tools/generators/src/generators/platform-app/files/src/platforms/__className__ServiceAdapter.ts__tmpl__
   (The interface PlatformServiceAdapter does NOT include capability flags — no change needed there.)

3. Enable per-platform: edit capabilities/<platform>.yaml and set:
     ${flagName}: true

4. Re-sync the capabilities provider for each platform that opts in:
     nx run <platform>:sync-capabilities

5. Implement the backend route + adapter method in each opting-in app.

6. Verify with: node tools/audit-capabilities.js <platform>
`);
