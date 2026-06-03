#!/usr/bin/env node
// @ts-check
"use strict";

/**
 * CI guard: verifies app shadow overrides mirror existing libs/ui/src subpaths.
 *
 * Valid shadow: apps/<app>/src/<subpath> exists AND libs/ui/src/<subpath> exists.
 * App-only files under components/ (e.g. JiraConnectionGate.tsx) are ignored — they
 * do not shadow @mp/ui imports unless the subpath matches libs/ui exactly.
 *
 * Exit 0 → every overlapping app/lib subpath is a valid shadow pair.
 * Exit 1 → an app file occupies a libs/ui subpath but the lib source is missing
 *   (lib component deleted while app override remains).
 *
 * Usage:
 *   node tools/check-shadows.js
 */

const fs = require("node:fs");
const path = require("node:path");
const { listShadowFiles } = require("./shadow-utils");

const ROOT = path.resolve(__dirname, "..");
const APPS_DIR = path.join(ROOT, "apps");
const LIB_SRC = path.join(ROOT, "libs", "ui", "src");
const LIB_ALIAS = "@mp/ui";

if (!fs.existsSync(LIB_SRC)) {
  console.error(`[check-shadows] libs/ui/src not found at ${LIB_SRC}`);
  process.exit(1);
}

/** @type {Set<string>} */
const libSubpaths = new Set();
for (const libFile of listShadowFiles(LIB_SRC)) {
  const rel = path.relative(LIB_SRC, libFile).replace(/\\/g, "/");
  libSubpaths.add(rel.replace(/\.(tsx?|jsx?)$/, ""));
}

/** @type {Array<{shadow: string, alias: string}>} */
const orphaned = [];
/** @type {Array<{app: string, subpath: string}>} */
const validShadows = [];

for (const appEntry of fs.readdirSync(APPS_DIR, { withFileTypes: true })) {
  if (!appEntry.isDirectory()) continue;
  const appSrc = path.join(APPS_DIR, appEntry.name, "src");
  if (!fs.existsSync(appSrc)) continue;

  for (const appFile of listShadowFiles(appSrc)) {
    const rel = path.relative(appSrc, appFile).replace(/\\/g, "/");
    const subpath = rel.replace(/\.(tsx?|jsx?)$/, "");
    const aliasKey = `${LIB_ALIAS}/${subpath}`;

    if (!libSubpaths.has(subpath)) continue;

    const libFile = path.join(LIB_SRC, `${subpath}.tsx`);
    const libFileTs = path.join(LIB_SRC, `${subpath}.ts`);
    if (!fs.existsSync(libFile) && !fs.existsSync(libFileTs)) {
      orphaned.push({ shadow: appFile, alias: aliasKey });
      continue;
    }

    validShadows.push({ app: appEntry.name, subpath });
  }
}

if (orphaned.length === 0) {
  console.log(
    `[check-shadows] Shadow alias check passed (${libSubpaths.size} lib subpaths indexed, ${validShadows.length} valid override(s)).`,
  );
  if (validShadows.length > 0) {
    for (const { app, subpath } of validShadows) {
      console.log(`  ✓ apps/${app}/src/${subpath}`);
    }
  }
  process.exit(0);
}

console.error(`[check-shadows] ${orphaned.length} orphaned shadow path(s) found:\n`);
for (const { shadow, alias } of orphaned) {
  console.error(`  ✗ ${path.relative(ROOT, shadow)}`);
  console.error(`      alias ${alias} has no matching source in libs/ui/src`);
}
process.exit(1);
