// @ts-check
"use strict";

const fs = require("node:fs");
const path = require("node:path");

/**
 * Scans `dir` recursively and returns a Turbopack resolveAlias map for every
 * override file found. Alias keys are `<libAlias>/<subpath>` (no extension);
 * alias values are project-relative paths (`./<rel>`) rooted at `projectRoot`.
 *
 * New override files require a dev-server restart when used with Turbopack
 * because aliases are resolved statically at startup. The webpack
 * UiShadowResolverPlugin is the dynamic alternative for webpack mode.
 *
 * @param {string} dir          Absolute path to the overrides directory.
 * @param {string} libAlias     Import alias being shadowed (e.g. "@mp/ui").
 * @param {string} projectRoot  Absolute path to the Next.js project root.
 * @returns {Record<string, string>}
 */
function buildShadowAliases(dir, libAlias, projectRoot) {
  /** @type {Record<string, string>} */
  const aliases = {};
  if (!fs.existsSync(dir)) return aliases;

  /** @param {string} current */
  const scan = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        scan(fullPath);
      } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
        const rel = path.relative(dir, fullPath).replace(/\\/g, "/");
        const subpath = rel.replace(/\.(tsx?|jsx?)$/, "");
        const projectRelPath = "./" + path.relative(projectRoot, fullPath).replace(/\\/g, "/");
        aliases[`${libAlias}/${subpath}`] = projectRelPath;
      }
    }
  };

  scan(dir);
  return aliases;
}

/**
 * Returns an array of all shadow file paths (absolute) found under `dir`.
 *
 * @param {string} dir  Absolute path to the overrides directory.
 * @returns {string[]}
 */
function listShadowFiles(dir) {
  /** @type {string[]} */
  const files = [];
  if (!fs.existsSync(dir)) return files;

  /** @param {string} current */
  const scan = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        scan(fullPath);
      } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
  };

  scan(dir);
  return files;
}

module.exports = { buildShadowAliases, listShadowFiles };
