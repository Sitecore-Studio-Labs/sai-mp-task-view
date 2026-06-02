#!/usr/bin/env node
// @ts-check
"use strict";

/**
 * Validates that every public async method declared in a concrete Adapter class
 * is also declared in its corresponding HttpAdapter interface.
 *
 * Usage:
 *   node tools/validate-http-adapter.js --platform jira
 *   node tools/validate-http-adapter.js --platform wrike
 *
 * Exit code 0 = all methods covered. Exit code 1 = missing declarations found.
 */

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");

// ── CLI ───────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const platformIdx = args.indexOf("--platform");

if (platformIdx === -1 || !args[platformIdx + 1]) {
  console.error("Usage: validate-http-adapter.js --platform <name>");
  process.exit(1);
}

const platform = args[platformIdx + 1];

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const className = capitalize(platform);

// Derive paths from platform name.
const adapterPath = path.join(
  ROOT,
  `apps/${platform}/src/platforms/${platform}/${className}Adapter.ts`,
);
const interfacePath = path.join(
  ROOT,
  `apps/${platform}/src/platforms/${platform}/${className}HttpAdapter.ts`,
);

if (!fs.existsSync(adapterPath)) {
  console.error(`Not found: ${path.relative(ROOT, adapterPath)}`);
  process.exit(1);
}
if (!fs.existsSync(interfacePath)) {
  console.error(`Not found: ${path.relative(ROOT, interfacePath)}`);
  process.exit(1);
}

const adapterSrc = fs.readFileSync(adapterPath, "utf-8");
const interfaceSrc = fs.readFileSync(interfacePath, "utf-8");

// ── Extract method names ───────────────────────────────────────────────────────

/**
 * Extract all public async method names from a class source file.
 * Skips methods prefixed with `private`.
 * @param {string} src
 * @returns {string[]}
 */
function extractPublicAsyncMethods(src) {
  const methods = [];
  // Match: optional whitespace, NOT preceded by "private", then "async methodName("
  // This covers "async foo(" and "  async foo(" but not "private async foo(".
  const lines = src.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    // Skip private methods
    if (/^private\s/.test(trimmed)) continue;
    const match = trimmed.match(/^async\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*[(<]/);
    if (match) {
      methods.push(match[1]);
    }
  }
  return [...new Set(methods)];
}

/**
 * Extract all method names declared in an interface source file.
 * @param {string} src
 * @returns {string[]}
 */
function extractInterfaceMethods(src) {
  const methods = [];
  const lines = src.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    // Match: methodName( or methodName<
    const match = trimmed.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)\s*[(<(]/);
    if (match && !trimmed.startsWith("//") && !trimmed.startsWith("*")) {
      methods.push(match[1]);
    }
  }
  return [...new Set(methods)];
}

const implMethods = extractPublicAsyncMethods(adapterSrc);
const ifaceMethods = extractInterfaceMethods(interfaceSrc);

const missing = implMethods.filter((m) => !ifaceMethods.includes(m));

if (missing.length === 0) {
  console.log(
    `✓ ${className}HttpAdapter interface covers all ${implMethods.length} public async methods in ${className}Adapter.`,
  );
  process.exit(0);
} else {
  console.error(
    `✗ ${className}HttpAdapter is missing ${missing.length} method declaration(s) found in ${className}Adapter:`,
  );
  for (const m of missing) {
    console.error(`    - ${m}()`);
  }
  console.error(
    `\nAdd these to apps/${platform}/src/platforms/${platform}/${className}HttpAdapter.ts.`,
  );
  process.exit(1);
}
