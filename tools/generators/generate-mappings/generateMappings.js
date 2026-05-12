#!/usr/bin/env node
// @ts-check
"use strict";

/**
 * API descriptor → TypeScript mapping file generator.
 *
 * Reads  capabilities/<platform>.api.yaml and generates:
 *   apps/<platform>/src/platforms/<platform>/generated/<entity>.mapping.ts
 *   apps/<platform>/src/platforms/<platform>/generated/index.ts
 *
 * Usage:
 *   node tools/generators/generate-mappings/generateMappings.js --platform jira
 *   node tools/generators/generate-mappings/generateMappings.js --platform jira --validate
 *
 * Flags:
 *   --platform <name>   Platform to generate mappings for (required).
 *   --validate          Dry-run: exit 1 if any file would change (useful in CI).
 */

const fs = require("node:fs");
const path = require("node:path");
const yaml = require("js-yaml");

const ROOT = path.resolve(__dirname, "../../..");

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const platformIdx = args.indexOf("--platform");

if (platformIdx === -1 || !args[platformIdx + 1]) {
  console.error("Usage: generateMappings.js --platform <name> [--validate]");
  process.exit(1);
}

const platform = args[platformIdx + 1];
const validateOnly = args.includes("--validate");

// ── Load YAML ─────────────────────────────────────────────────────────────────

const yamlPath = path.join(ROOT, `capabilities/${platform}.api.yaml`);

if (!fs.existsSync(yamlPath)) {
  console.error(`Error: ${yamlPath} not found.`);
  process.exit(1);
}

/** @type {any} */
const apiDesc = yaml.load(fs.readFileSync(yamlPath, "utf-8"));

// Basic structural validation
if (!apiDesc || typeof apiDesc !== "object") {
  console.error("Error: YAML is empty or invalid.");
  process.exit(1);
}
if (!apiDesc.entities || typeof apiDesc.entities !== "object") {
  console.error("Error: YAML must have an 'entities' section.");
  process.exit(1);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** @param {string} s */
function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Naive pluralisation → singular for common English patterns.
 * Handles: tasks→task, comments→comment, statuses→status, priorities→priority.
 * @param {string} name
 */
function singularize(name) {
  /** @type {Record<string, string>} */
  const irregular = { statuses: "status" };
  if (irregular[name]) return irregular[name];
  if (name.endsWith("ies")) return name.slice(0, -3) + "y";
  if (name.endsWith("s") && !name.endsWith("ss")) return name.slice(0, -1);
  return name;
}

/** @param {string} entityName */
function getNormalizeFuncName(entityName) {
  return "normalize" + capitalize(singularize(entityName));
}

// ── Code generation ───────────────────────────────────────────────────────────

/**
 * Generate a single <entity>.mapping.ts file content for an entity that has
 * both platformType and canonicalType defined.
 *
 * @param {string} entityName
 * @param {any} entity
 * @returns {string | null}  null when the entity should be skipped.
 */
function generateEntityMapping(entityName, entity) {
  const { platformType, canonicalType } = entity;
  if (!platformType || !canonicalType) return null;

  // Prefer list fields; fall back to getOne fields.
  const opFields =
    (entity.list?.response?.fields && Object.keys(entity.list.response.fields).length > 0
      ? entity.list.response.fields
      : null) ??
    (entity.getOne?.response?.fields && Object.keys(entity.getOne.response.fields).length > 0
      ? entity.getOne.response.fields
      : null);

  if (!opFields) return null;

  const funcName = getNormalizeFuncName(entityName);

  // Partition fields: "fields.*" source paths go into a nested fields:{} block.
  /** @type {Array<[string, any]>} */
  const topLevel = [];
  /** @type {Array<[string, any]>} */
  const nested = [];

  for (const [name, def] of Object.entries(opFields)) {
    if (typeof def.from === "string" && def.from.startsWith("fields.")) {
      nested.push([name, def]);
    } else {
      topLevel.push([name, def]);
    }
  }

  // Check whether cross-entity helpers are needed.
  const needsNormalizeComment = nested.some(([, d]) => d.transform === "comments-array-wrapper");

  /**
   * Emit one field assignment line for the generated return object.
   * @param {string} name  Canonical field name.
   * @param {any} def      YAML field descriptor.
   * @param {string} indent
   */
  function genFieldLine(name, def, indent) {
    const src = `raw.${def.from}`;

    if (def.transform === "self-array") {
      // e.g. subtasks: raw.fields.subtasks?.map(normalizeTask)
      return `${indent}${name}: ${src}?.map(${funcName}),`;
    }
    if (def.transform === "comments-array-wrapper") {
      // e.g. comment: raw.fields.comment ? { comments: raw.fields.comment.comments.map(normalizeComment) } : undefined
      return `${indent}${name}: ${src} ? { comments: ${src}.comments.map(normalizeComment) } : undefined,`;
    }
    if (def.nullable) {
      return `${indent}${name}: ${src} ?? undefined,`;
    }
    return `${indent}${name}: ${src},`;
  }

  // Build return body.
  const topLevelLines = topLevel.map(([n, d]) => genFieldLine(n, d, "    ")).join("\n");

  let returnBody;
  if (nested.length > 0) {
    const nestedLines = nested.map(([n, d]) => genFieldLine(n, d, "      ")).join("\n");
    returnBody = ["  return {", topLevelLines, "    fields: {", nestedLines, "    },", "  };"].join(
      "\n",
    );
  } else {
    returnBody = ["  return {", topLevelLines, "  };"].join("\n");
  }

  // Build import block with blank lines between groups (required by simple-import-sort).
  // Group 1: external packages (@mp/*)
  // Group 2: internal aliases (@/*)
  // Group 3: relative imports (./)
  const importLines = [
    `// @generated — do not edit. Re-generate with: npx nx run ${platform}:generate-mappings`,
    `// Source: capabilities/${platform}.api.yaml → entities.${entityName}`,
    `import type { ${canonicalType} } from "@mp/task-core";`,
    ``,
    `import type { ${platformType} } from "@/types/${platform}";`,
  ];

  if (needsNormalizeComment) {
    importLines.push(``, `import { normalizeComment } from "./comments.mapping";`);
  }

  return [
    ...importLines,
    "",
    `export function ${funcName}(raw: ${platformType}): ${canonicalType} {`,
    returnBody,
    "}",
    "",
  ].join("\n");
}

// ── Write helpers ─────────────────────────────────────────────────────────────

let hadError = false;

/**
 * Either write a file to disk or (in --validate mode) compare with what's there.
 * @param {string} filePath
 * @param {string} content
 */
function emit(filePath, content) {
  if (validateOnly) {
    if (!fs.existsSync(filePath)) {
      console.error(`MISSING: ${path.relative(ROOT, filePath)}`);
      hadError = true;
      return;
    }
    const existing = fs.readFileSync(filePath, "utf-8");
    if (existing !== content) {
      console.error(`STALE:   ${path.relative(ROOT, filePath)}`);
      hadError = true;
    } else {
      console.log(`OK:      ${path.relative(ROOT, filePath)}`);
    }
  } else {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
    console.log(`Generated: ${path.relative(ROOT, filePath)}`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

const outDir = path.join(ROOT, `apps/${platform}/src/platforms/${platform}/generated`);

const indexHeader = [
  `// @generated — do not edit. Re-generate with: npx nx run ${platform}:generate-mappings`,
  `// Source: capabilities/${platform}.api.yaml`,
];

/** @type {string[]} — collected before sorting */
const exportLines = [];

let hasAnyMapping = false;

for (const [entityName, entity] of Object.entries(apiDesc.entities)) {
  const content = generateEntityMapping(entityName, entity);
  if (!content) continue;

  hasAnyMapping = true;
  const fileName = `${entityName}.mapping.ts`;
  emit(path.join(outDir, fileName), content);

  const funcName = getNormalizeFuncName(entityName);
  exportLines.push(`export { ${funcName} } from "./${entityName}.mapping";`);
}

if (!hasAnyMapping) {
  console.warn(
    `Warning: no entities with both platformType and canonicalType found in ${yamlPath}.`,
  );
}

// Sort exports alphabetically (required by simple-import-sort/exports).
exportLines.sort();

// Write (or validate) index.ts.
emit(path.join(outDir, "index.ts"), [...indexHeader, ...exportLines].join("\n") + "\n");

if (validateOnly && hadError) {
  console.error(
    "\nGenerated files are out of date. Run: npx nx run " + platform + ":generate-mappings",
  );
  process.exit(1);
}

if (!validateOnly) {
  console.log(
    `\nDone. Generated ${Object.keys(apiDesc.entities).length} entity checks; output → ${path.relative(ROOT, outDir)}`,
  );
}
