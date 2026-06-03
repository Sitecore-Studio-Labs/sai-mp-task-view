#!/usr/bin/env node
// @ts-check
"use strict";

/**
 * Verifies the platform capabilities provider matches capabilities/<platform>.yaml
 * (same check as: nx g @mp/generators:platform-app <name> --yamlFile ... --update --dryRun).
 * Cross-platform (no grep/bash). Never writes files — use <platform>:sync-capabilities to apply.
 *
 * Usage: node tools/check-capabilities-sync.js <platformName>
 */

const { spawnSync } = require("node:child_process");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const platform = process.argv[2];

if (!platform || !/^[a-z][a-z0-9-]*$/i.test(platform)) {
  console.error("Usage: node tools/check-capabilities-sync.js <platformName>");
  process.exit(2);
}

/**
 * Generator prints a bounded dry-run block; pull it out so we can show it before nx banners.
 */
function extractDryRunPlan(text) {
  const start = text.indexOf("[dry-run] Changes that would be made:");
  if (start === -1) return null;
  const footer = "Run without --dry-run to apply these changes.";
  const end = text.lastIndexOf(footer);
  if (end === -1) return text.slice(start).trimEnd();
  return text.slice(start, end + footer.length).trimEnd();
}

const r = spawnSync(
  "npx",
  [
    "nx",
    "g",
    "@mp/generators:platform-app",
    platform,
    "--yamlFile",
    `capabilities/${platform}.yaml`,
    "--update",
    "--dryRun",
  ],
  {
    cwd: ROOT,
    encoding: "utf-8",
    shell: true,
    stdio: ["inherit", "pipe", "pipe"],
  },
);

const combined = `${r.stdout ?? ""}${r.stderr ?? ""}`;

if (r.status !== 0) {
  console.error(`check-sync: nx generator exited with code ${r.status} (not a sync drift check).`);
  if (combined.trim()) console.error(combined);
  process.exit(2);
}

// `printDiff` may log "[dry-run] No changes detected." to stdout; on Windows that line can be
// missing from captured output when stderr is noisy. Treat "already matches" (no tree.write) +
// no "Changes that would be made" as equivalent when nx exited 0.
const hasPlannedChanges = combined.includes("[dry-run] Changes that would be made:");
const explicitlyClean = combined.includes("[dry-run] No changes detected.");
const providerClean = combined.includes("Capabilities provider already matches");

if (!hasPlannedChanges && (explicitlyClean || providerClean)) {
  console.log("Capabilities provider is in sync.");
  process.exit(0);
}

const plan = extractDryRunPlan(combined);

console.error("");
console.error(`Capabilities are out of sync with capabilities/${platform}.yaml.`);
console.error("");
console.error("Dry run only — no files were modified on disk.");
console.error("");
console.error("Planned changes:");
console.error("");
if (plan) {
  console.error(plan);
} else {
  console.error("(Could not parse the dry-run summary; raw generator output follows.)\n");
  console.error(combined.trimEnd());
}
console.error("");
console.error("To apply these updates when you are ready:");
console.error(`  npx nx run ${platform}:sync-capabilities`);
console.error("");

if (process.env.CAPABILITIES_CHECK_SYNC_FULL_LOG === "1" && plan) {
  console.error("--- Full nx / generator log (CAPABILITIES_CHECK_SYNC_FULL_LOG=1) ---\n");
  console.error(combined.trimEnd());
  console.error("");
}

process.exit(1);
