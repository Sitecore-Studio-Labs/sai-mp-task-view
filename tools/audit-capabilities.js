#!/usr/bin/env node
// @ts-check
"use strict";

/**
 * Capability audit for a generated platform app.
 *
 * Usage:
 *   node tools/audit-capabilities.js <platformName>
 *   npx nx run jira:audit-capabilities
 *
 * Checks:
 *   1. Missing route stubs — expected routes based on capabilities YAML vs actual files.
 *   2. Capabilities provider sync — CAPABILITIES object in the provider vs YAML.
 *   3. Open TODOs — any `// TODO:` comment still present in generated files.
 *
 * Exit 0 → all checks pass (warnings are shown but non-fatal unless --strict).
 * Exit 1 → one or more checks failed.
 */

const fs = require("node:fs");
const path = require("node:path");
const yaml = require("js-yaml");

const ROOT = path.resolve(__dirname, "..");
const CAPS_DIR = path.join(ROOT, "capabilities");

// ── CLI ───────────────────────────────────────────────────────────────────────

const platformName = process.argv[2];
const strict = process.argv.includes("--strict");

if (!platformName) {
  console.error("Usage: node tools/audit-capabilities.js <platformName> [--strict]");
  process.exit(1);
}

const APP_DIR = path.join(ROOT, "apps", platformName);
if (!fs.existsSync(APP_DIR)) {
  console.error(`[audit-capabilities] App not found: apps/${platformName}`);
  process.exit(1);
}

// ── Resolve YAML ──────────────────────────────────────────────────────────────

/** @param {string} yamlPath @param {string} root @returns {Record<string, unknown>} */
function loadAndMergeYaml(yamlPath, root) {
  const raw = /** @type {Record<string, unknown>} */ (yaml.load(fs.readFileSync(yamlPath, "utf8")));
  const extendsKey = raw["extends"];
  if (!extendsKey) return raw;

  const baseName = String(extendsKey);
  const basePath = /[/\\]/.test(baseName)
    ? path.resolve(root, baseName)
    : path.join(root, "capabilities", `${baseName}.yaml`);

  const base = loadAndMergeYaml(basePath, root);
  return {
    ...base,
    platform: raw["platform"],
    capabilities: {
      .../** @type {any} */ (base["capabilities"]),
      .../** @type {any} */ (raw["capabilities"]),
    },
    auth: raw["auth"] ?? base["auth"],
  };
}

const yamlPath = path.join(CAPS_DIR, `${platformName}.yaml`);
if (!fs.existsSync(yamlPath)) {
  console.error(`[audit-capabilities] No capability YAML found: capabilities/${platformName}.yaml`);
  process.exit(1);
}

const matrix = loadAndMergeYaml(yamlPath, ROOT);
const caps = /** @type {Record<string, unknown>} */ (matrix["capabilities"] ?? {});
const auth = /** @type {Record<string, unknown> | undefined} */ (matrix["auth"]);

// ── Expected routes ───────────────────────────────────────────────────────────

/** @returns {string[]} */
function expectedRoutes() {
  const p = platformName;
  /** @type {string[]} */
  const routes = [
    `src/app/api/auth/${p}/status/route.ts`,
    `src/app/api/auth/${p}/disconnect/route.ts`,
    `src/app/api/auth/${p}/connect/route.ts`,
    `src/app/api/${p}/projects/route.ts`,
    `src/app/api/${p}/select-project/route.ts`,
    `src/app/api/${p}/issues/route.ts`,
    `src/app/api/${p}/issues/[issueIdOrKey]/route.ts`,
    `src/app/api/${p}/statuses/[projectKey]/route.ts`,
    `src/app/api/${p}/permissions/route.ts`,
  ];

  // Callback: all OAuth flows except api-key
  if (auth && auth["type"] !== "api-key") {
    routes.push(`src/app/api/auth/${p}/callback/route.ts`);
  }
  // Refresh: only oauth2-refresh (token expires and needs renewal)
  if (auth?.["type"] === "oauth2-refresh") {
    routes.push(`src/app/api/auth/${p}/refresh/route.ts`);
  }
  if (caps["hasSites"]) {
    routes.push(`src/app/api/${p}/sites/route.ts`);
    routes.push(`src/app/api/${p}/select-site/route.ts`);
  }
  if (caps["hasStatusTransitions"]) {
    routes.push(`src/app/api/${p}/issues/[issueIdOrKey]/transitions/route.ts`);
  }
  if (caps["hasIssueTypes"]) {
    routes.push(`src/app/api/${p}/issue-types/route.ts`);
  }
  if (caps["hasPriorities"]) {
    routes.push(`src/app/api/${p}/project-priorities/route.ts`);
  }
  if (caps["hasAssignees"]) {
    routes.push(`src/app/api/${p}/assignees/route.ts`);
    routes.push(`src/app/api/${p}/current-user/route.ts`);
  }
  if (caps["hasComments"]) {
    routes.push(`src/app/api/${p}/comments/route.ts`);
  }
  if (caps["hasAttachments"]) {
    routes.push(`src/app/api/${p}/attachment/[attachmentId]/route.ts`);
  }
  if (caps["hasAiWorkBreakdown"]) {
    routes.push("src/app/api/ai/parse-requirements/route.ts");
    routes.push("src/app/api/workbreakdown/route.ts");
    routes.push("src/app/api/workbreakdown/[draftId]/route.ts");
    routes.push("src/app/api/workbreakdown/[draftId]/publish/route.ts");
  }

  return routes;
}

// ── Check 1: Missing route stubs ──────────────────────────────────────────────

/** @type {string[]} */
const missingRoutes = [];

for (const rel of expectedRoutes()) {
  if (!fs.existsSync(path.join(APP_DIR, rel))) {
    missingRoutes.push(rel);
  }
}

// ── Check 2: Capabilities provider sync ──────────────────────────────────────

/**
 * @param {string} source
 * @param {string} key
 * @returns {string | null}
 */
function extractField(source, key) {
  const re = new RegExp(`\\b${key}\\s*:\\s*(true|false|"[^"]*"|'[^']*')`, "m");
  const m = source.match(re);
  return m ? m[1] : null;
}

const providerPath = path.join(
  APP_DIR,
  "src",
  "providers",
  `${toPascal(platformName)}PlatformCapabilitiesProvider.tsx`,
);

/** @type {Array<{flag: string, yaml: unknown, ts: string}>} */
const capabilityDrifts = [];

if (fs.existsSync(providerPath)) {
  const src = fs.readFileSync(providerPath, "utf8");

  const capBlock = src.match(/export\s+const\s+\w+CAPABILITIES[^=]*=\s*\{([\s\S]*?)\};/);
  if (capBlock) {
    const body = capBlock[1];

    const boolFlags = [
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

    for (const flag of boolFlags) {
      if (!(flag in caps)) continue;
      const tsRaw = extractField(body, flag);
      if (tsRaw === null) {
        capabilityDrifts.push({ flag, yaml: caps[flag], ts: "(missing)" });
        continue;
      }
      if (Boolean(caps[flag]) !== (tsRaw === "true")) {
        capabilityDrifts.push({ flag, yaml: caps[flag], ts: tsRaw });
      }
    }

    const rtfYaml = caps["richTextFormat"];
    if (rtfYaml !== undefined) {
      const tsRaw = extractField(body, "richTextFormat");
      if (tsRaw !== null) {
        const tsVal = tsRaw.replace(/^["']|["']$/g, "");
        if (String(rtfYaml) !== tsVal) {
          capabilityDrifts.push({ flag: "richTextFormat", yaml: rtfYaml, ts: `"${tsVal}"` });
        }
      }
    }
  }
}

// ── Check 3: Open TODOs ───────────────────────────────────────────────────────

/** @type {Array<{file: string, line: number, text: string}>} */
const openTodos = [];

/**
 * Recursively scan a directory for // TODO: comments in .ts/.tsx files.
 * @param {string} dir
 */
function scanTodos(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanTodos(full);
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      const lines = fs.readFileSync(full, "utf8").split("\n");
      lines.forEach((line, i) => {
        if (/\/\/\s*TODO:/.test(line)) {
          openTodos.push({
            file: path.relative(APP_DIR, full),
            line: i + 1,
            text: line.trim(),
          });
        }
      });
    }
  }
}

scanTodos(path.join(APP_DIR, "src"));

// ── Report ────────────────────────────────────────────────────────────────────

const PASS = "✓";
const FAIL = "✗";
const WARN = "⚠";

console.log(`\nCapability audit: apps/${platformName}\n${"─".repeat(60)}`);

// Missing routes
if (missingRoutes.length === 0) {
  console.log(`${PASS} Route stubs        all ${expectedRoutes().length} expected routes present`);
} else {
  console.log(`${FAIL} Route stubs        ${missingRoutes.length} missing:\n`);
  for (const r of missingRoutes) {
    console.log(`     missing  ${r}`);
  }
  console.log(
    `\n  Run: npx nx g @mp/generators:platform-app ${platformName} --yamlFile capabilities/${platformName}.yaml --update`,
  );
}

// Capability drift
if (capabilityDrifts.length === 0) {
  if (fs.existsSync(providerPath)) {
    console.log(`${PASS} Capability sync    CAPABILITIES object matches ${platformName}.yaml`);
  } else {
    console.log(
      `${WARN} Capability sync    provider not found: ${path.relative(ROOT, providerPath)}`,
    );
  }
} else {
  console.log(`${FAIL} Capability sync    ${capabilityDrifts.length} mismatch(es):\n`);
  for (const d of capabilityDrifts) {
    console.log(`     ${d.flag}: YAML=${JSON.stringify(d.yaml)} but TS=${d.ts}`);
  }
}

// Open TODOs
if (openTodos.length === 0) {
  console.log(`${PASS} Open TODOs         none`);
} else {
  const icon = strict ? FAIL : WARN;
  console.log(`${icon} Open TODOs         ${openTodos.length} remaining:\n`);
  for (const t of openTodos) {
    console.log(`     ${t.file}:${t.line}  ${t.text}`);
  }
  if (!strict) {
    console.log(`\n  (use --strict to treat open TODOs as a failure)`);
  }
}

console.log("");

const failures = missingRoutes.length + capabilityDrifts.length + (strict ? openTodos.length : 0);
if (failures > 0) {
  process.exit(1);
}

// ── helpers ───────────────────────────────────────────────────────────────────

/** @param {string} s @returns {string} */
function toPascal(s) {
  return s
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}
