#!/usr/bin/env node
// @ts-check
"use strict";

/**
 * Shadow override audit for a generated platform app.
 *
 * Usage:
 *   node tools/audit-shadows.js <appName>
 *   npx nx run jira:audit-shadows
 *
 * Output:
 *   - A clean table of all active shadow overrides (app file → libs/ui original).
 *   - Flags any override whose exported names diverge from the libs/ui original.
 *   - Flags any override that adds required props not present in the original.
 *
 * Drift detection uses a two-pass approach:
 *   1. Named export inventory — compare what the shadow exports vs the original.
 *   2. TypeScript type check (tsc --noEmit) on just the shadow files to surface
 *      type errors that indicate prop signature drift.
 *
 * Exit 0 → no drift detected (or only warnings).
 * Exit 1 → named export drift or type errors found.
 */

const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const LIB_UI_SRC = path.join(ROOT, "libs", "ui", "src");

// ── CLI ───────────────────────────────────────────────────────────────────────

const appName = process.argv[2];
if (!appName) {
  console.error("Usage: node tools/audit-shadows.js <appName> [--type-check]");
  process.exit(1);
}

const typeCheck = process.argv.includes("--type-check");

const APP_SRC = path.join(ROOT, "apps", appName, "src");
if (!fs.existsSync(APP_SRC)) {
  console.error(`[audit-shadows] App not found: apps/${appName}/src`);
  process.exit(1);
}

// ── Find shadow pairs ─────────────────────────────────────────────────────────

/** @type {Array<{appFile: string, libFile: string, rel: string}>} */
const shadowPairs = [];

/**
 * Recursively collect all .ts/.tsx files under dir.
 * @param {string} dir
 * @returns {string[]}
 */
function collectFiles(dir) {
  /** @type {string[]} */
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectFiles(full));
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

for (const appFile of collectFiles(APP_SRC)) {
  const rel = path.relative(APP_SRC, appFile).replace(/\\/g, "/");
  const subpath = rel.replace(/\.(tsx?|jsx?)$/, "");

  const libVariants = [
    path.join(LIB_UI_SRC, rel),
    path.join(LIB_UI_SRC, subpath + ".ts"),
    path.join(LIB_UI_SRC, subpath + ".tsx"),
  ];

  const libFile = libVariants.find((v) => fs.existsSync(v));
  if (libFile) {
    shadowPairs.push({ appFile, libFile, rel });
  }
}

// ── Export inventory comparison ───────────────────────────────────────────────

/**
 * Extract named exports from a TypeScript/TSX source file (regex-based).
 * Returns a Set of export names. Does not handle re-exports (`export * from`).
 * @param {string} filePath
 * @returns {Set<string>}
 */
function extractExports(filePath) {
  const src = fs.readFileSync(filePath, "utf8");
  /** @type {Set<string>} */
  const names = new Set();

  // export function Foo / export async function Foo / export class Foo / export const Foo
  for (const m of src.matchAll(
    /^export\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|let|var|type|interface|enum)\s+(\w+)/gm,
  )) {
    names.add(m[1]);
  }
  // export { Foo, Bar }
  for (const m of src.matchAll(/^export\s*\{([^}]+)\}/gm)) {
    for (const part of m[1].split(",")) {
      const name = part.replace(/\s+as\s+\w+/, "").trim();
      if (name) names.add(name);
    }
  }
  // export default (unnamed)
  if (/^export\s+default\s+/m.test(src)) {
    names.add("default");
  }

  return names;
}

/** @type {Array<{rel: string, missing: string[], extra: string[]}>} */
const exportDrifts = [];

for (const { appFile, libFile, rel } of shadowPairs) {
  const libExports = extractExports(libFile);
  const appExports = extractExports(appFile);

  // Exports in the lib that the shadow does not re-export — the shadow is
  // narrowing the public surface, which may break consumers.
  const missing = [...libExports].filter((n) => !appExports.has(n) && n !== "default");

  // Exports the shadow adds that don't exist in lib — usually fine, just informational.
  const extra = [...appExports].filter((n) => !libExports.has(n) && n !== "default");

  if (missing.length > 0) {
    exportDrifts.push({ rel, missing, extra });
  }
}

// ── TypeScript type check (optional) ─────────────────────────────────────────

/** @type {string[]} */
const typeErrors = [];

if (typeCheck && shadowPairs.length > 0) {
  try {
    execSync(`node_modules/.bin/tsc --noEmit --project apps/${appName}/tsconfig.json 2>&1`, {
      cwd: ROOT,
      encoding: "utf8",
      stdio: "pipe",
    });
  } catch (/** @type {any} */ err) {
    const output = (err.stdout ?? "") + (err.stderr ?? "");
    const shadowRels = new Set(shadowPairs.map((p) => p.rel));
    for (const line of output.split("\n")) {
      const m = line.match(/^(.*?)\((\d+),\d+\):\s+error/);
      if (!m) continue;
      const filePath = m[1].replace(/\\/g, "/");
      // Only include errors from shadow files
      const isFromShadow = [...shadowRels].some((r) => filePath.endsWith(r));
      if (isFromShadow) {
        typeErrors.push(line.trim());
      }
    }
  }
}

// ── Report ────────────────────────────────────────────────────────────────────

const PASS = "✓";
const FAIL = "✗";
const OK = "ok    ";
const DRIFT = "drift ";

console.log(`\nShadow audit: apps/${appName}\n${"─".repeat(70)}`);

if (shadowPairs.length === 0) {
  console.log("  (no shadow overrides found)\n");
  process.exit(0);
}

// Table header
console.log(`  ${"Status".padEnd(8)}  ${"App file".padEnd(52)}  Lib original`);
console.log(`  ${"─".repeat(8)}  ${"─".repeat(52)}  ${"─".repeat(40)}`);

const driftRels = new Set(exportDrifts.map((d) => d.rel));

for (const { rel, libFile } of shadowPairs) {
  const hasDrift = driftRels.has(rel);
  const status = hasDrift ? DRIFT : OK;
  const icon = hasDrift ? FAIL : PASS;
  const libRel = path.relative(ROOT, libFile).replace(/\\/g, "/");
  console.log(`  ${icon} ${status}  ${("src/" + rel).padEnd(52)}  ${libRel}`);
}

console.log(`\n  ${shadowPairs.length} shadow override(s) found.`);

if (exportDrifts.length > 0) {
  console.log(`\n  Export drift detected (shadow is missing lib-public names):\n`);
  for (const { rel, missing, extra } of exportDrifts) {
    console.log(`  ${FAIL} ${rel}`);
    if (missing.length) {
      console.log(`      missing exports: ${missing.join(", ")}`);
    }
    if (extra.length) {
      console.log(`      extra  exports: ${extra.join(", ")} (informational)`);
    }
  }
}

if (typeErrors.length > 0) {
  console.log(`\n  TypeScript errors in shadow files:\n`);
  for (const err of typeErrors.slice(0, 20)) {
    console.log(`  ${FAIL} ${err}`);
  }
  if (typeErrors.length > 20) {
    console.log(`  ... and ${typeErrors.length - 20} more`);
  }
}

if (!typeCheck) {
  console.log(`\n  Tip: run with --type-check to surface prop-signature drift via tsc.\n`);
} else {
  console.log("");
}

const failures = exportDrifts.length + typeErrors.length;
if (failures > 0) {
  process.exit(1);
}
