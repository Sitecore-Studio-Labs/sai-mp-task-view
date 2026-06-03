#!/usr/bin/env node
// @ts-check
"use strict";

/**
 * CI guard: verifies that every capabilities/*.yaml file stays in sync with
 * its corresponding *PlatformCapabilitiesProvider.tsx.
 *
 * Convention:
 *   capabilities/jira.yaml  ↔  apps/jira/src/providers/JiraPlatformCapabilitiesProvider.tsx
 *   capabilities/wrike.yaml ↔  apps/wrike/src/providers/WrikePlatformCapabilitiesProvider.tsx
 *
 * Checks:
 *   - Every boolean capability flag in YAML is present in the TS CAPABILITIES object with the same value.
 *   - richTextFormat in YAML matches richTextFormat in the TS object.
 *   - Platform name and displayName match.
 *
 * Exit 0 → no drift detected.
 * Exit 1 → one or more mismatches found.
 *
 * Usage:
 *   node tools/check-capability-drift.js
 */

const fs = require("node:fs");
const path = require("node:path");
const yaml = require("js-yaml");

const ROOT = path.resolve(__dirname, "..");
const CAPS_DIR = path.join(ROOT, "capabilities");
const APPS_DIR = path.join(ROOT, "apps");

if (!fs.existsSync(CAPS_DIR)) {
  console.log("[check-capability-drift] No capabilities/ directory found. Skipping.");
  process.exit(0);
}

/** @type {Array<{file: string, errors: string[]}>} */
const allErrors = [];

for (const entry of fs.readdirSync(CAPS_DIR, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith(".yaml")) continue;

  const yamlPath = path.join(CAPS_DIR, entry.name);
  const platformKey = entry.name.replace(/\.yaml$/, ""); // e.g. "jira"
  const providerName =
    platformKey.charAt(0).toUpperCase() + platformKey.slice(1) + "PlatformCapabilitiesProvider";
  const providerPath = path.join(APPS_DIR, platformKey, "src", "providers", `${providerName}.tsx`);

  /** @type {string[]} */
  const errors = [];

  // ── 1. Parse YAML ─────────────────────────────────────────────────────────
  let doc;
  try {
    doc = /** @type {any} */ (yaml.load(fs.readFileSync(yamlPath, "utf8")));
  } catch (e) {
    errors.push(`Failed to parse YAML: ${e instanceof Error ? e.message : String(e)}`);
    allErrors.push({ file: entry.name, errors });
    continue;
  }

  // ── 2. Check provider exists ───────────────────────────────────────────────
  if (!fs.existsSync(providerPath)) {
    // Provider may not exist yet (e.g. wrike app not scaffolded). Warn, don't fail.
    console.warn(
      `[check-capability-drift] WARN: ${entry.name} → provider not found at ${path.relative(ROOT, providerPath)}. Skipping.`,
    );
    continue;
  }

  const providerSource = fs.readFileSync(providerPath, "utf8");

  // ── 3. Extract CAPABILITIES object from source ─────────────────────────────
  // Strategy: extract the top-level capabilities object literal via regex.
  // Matches `export const JIRA_CAPABILITIES: PlatformCapabilities = { ... };`
  const capObjectMatch = providerSource.match(
    /export\s+const\s+\w+CAPABILITIES[^=]*=\s*\{([\s\S]*?)\};/,
  );
  if (!capObjectMatch) {
    errors.push(
      `Could not find a CAPABILITIES object (expected pattern: export const *CAPABILITIES*: PlatformCapabilities = { ... })`,
    );
    allErrors.push({ file: entry.name, errors });
    continue;
  }

  const capBody = capObjectMatch[1];

  /**
   * Extracts a primitive field value from a TypeScript object literal string.
   * Returns the raw string representation (e.g. `"true"`, `'"adf"'`, `'"jira"'`).
   *
   * @param {string} source
   * @param {string} key
   * @returns {string | null}
   */
  function extractField(source, key) {
    // Match: key: value, (value is true/false/string-literal)
    const re = new RegExp(`\\b${key}\\s*:\\s*(true|false|"[^"]*"|'[^']*')`, "m");
    const m = source.match(re);
    if (!m) return null;
    return m[1];
  }

  const yamlCaps = doc.capabilities ?? {};
  const yamlPlatform = doc.platform ?? {};

  // ── 4. Compare capabilities flags ─────────────────────────────────────────
  const flagsConfigPath = path.join(ROOT, "capabilities", "capability-flags.json");
  const BOOLEAN_FLAGS = fs.existsSync(flagsConfigPath)
    ? /** @type {string[]} */ (JSON.parse(fs.readFileSync(flagsConfigPath, "utf-8")).providerFlags)
    : [
        "hasIssueTypes",
        "hasPriorities",
        "hasAssignees",
        "hasDueDate",
        "hasParentIssue",
        "hasAttachments",
        "hasComments",
        "hasSubtasks",
        "hasStatusTransitions",
        "hasAiWorkBreakdown",
      ];

  for (const flag of BOOLEAN_FLAGS) {
    const yamlVal = yamlCaps[flag];
    if (yamlVal === undefined) continue; // flag not defined in YAML — skip

    const tsRaw = extractField(capBody, flag);
    if (tsRaw === null) {
      errors.push(`  ${flag}: missing in TS CAPABILITIES object (YAML: ${yamlVal})`);
      continue;
    }

    const tsVal = tsRaw === "true";
    if (Boolean(yamlVal) !== tsVal) {
      errors.push(`  ${flag}: YAML=${yamlVal} but TS=${tsRaw}`);
    }
  }

  // ── 5. Compare richTextFormat ──────────────────────────────────────────────
  if (yamlCaps.richTextFormat !== undefined) {
    const tsRaw = extractField(capBody, "richTextFormat");
    if (tsRaw === null) {
      errors.push(
        `  richTextFormat: missing in TS CAPABILITIES object (YAML: "${yamlCaps.richTextFormat}")`,
      );
    } else {
      const tsVal = tsRaw.replace(/^["']|["']$/g, "");
      if (String(yamlCaps.richTextFormat) !== tsVal) {
        errors.push(`  richTextFormat: YAML="${yamlCaps.richTextFormat}" but TS="${tsVal}"`);
      }
    }
  }

  // ── 6. Compare platformName and platformDisplayName ────────────────────────
  if (yamlPlatform.name) {
    const tsRaw = extractField(capBody, "platformName");
    if (tsRaw !== null) {
      const tsVal = tsRaw.replace(/^["']|["']$/g, "");
      if (yamlPlatform.name !== tsVal) {
        errors.push(`  platformName: YAML="${yamlPlatform.name}" but TS="${tsVal}"`);
      }
    }
  }

  if (yamlPlatform.displayName) {
    const tsRaw = extractField(capBody, "platformDisplayName");
    if (tsRaw !== null) {
      const tsVal = tsRaw.replace(/^["']|["']$/g, "");
      if (yamlPlatform.displayName !== tsVal) {
        errors.push(`  platformDisplayName: YAML="${yamlPlatform.displayName}" but TS="${tsVal}"`);
      }
    }
  }

  if (errors.length > 0) {
    allErrors.push({ file: entry.name, errors });
  }
}

if (allErrors.length === 0) {
  console.log("[check-capability-drift] All capabilities are in sync.");
  process.exit(0);
} else {
  console.error(`[check-capability-drift] Drift detected in ${allErrors.length} file(s):\n`);
  for (const { file, errors } of allErrors) {
    console.error(`  ${file}:`);
    for (const err of errors) {
      console.error(`    ✗ ${err}`);
    }
  }
  console.error("\nUpdate the provider or the YAML to resolve the mismatch before merging.");
  process.exit(1);
}
