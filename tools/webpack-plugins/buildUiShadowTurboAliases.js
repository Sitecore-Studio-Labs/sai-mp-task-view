// @ts-check
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const EXTENSIONS = [".tsx", ".ts", ".jsx", ".js"];

/**
 * @param {string} dir
 * @returns {string[]}
 */
function listFilesRecursive(dir) {
  if (!fs.existsSync(dir)) return [];
  /** @type {string[]} */
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...listFilesRecursive(full));
    else out.push(full);
  }
  return out;
}

/**
 * Builds Turbopack `resolveAlias` entries so `@mp/ui/<subpath>` matches the same
 * shadowing rules as {@link import("./UiShadowResolverPlugin.js").UiShadowResolverPlugin} for Webpack.
 *
 * @param {string} overridesDir Absolute path to the app tree that mirrors `libs/ui/src` (e.g. `apps/wrike/src`).
 * @param {string} _libSrc Absolute path to `libs/ui/src` (reserved for future parity checks).
 * @returns {Record<string, string>}
 */
function buildUiShadowTurboAliases(overridesDir, _libSrc) {
  void _libSrc;
  /** @type {Map<string, { abs: string; isIndex: boolean }>} */
  const byAlias = new Map();

  const files = listFilesRecursive(overridesDir);
  for (const abs of files) {
    const ext = EXTENSIONS.find((e) => abs.endsWith(e));
    if (!ext) continue;

    const rel = path.relative(overridesDir, abs);
    const relPosix = rel.split(path.sep).join("/");
    const withoutExt = relPosix.slice(0, -ext.length);
    const isIndex = /\/index$/u.test(withoutExt) || withoutExt === "index";
    const subpath = isIndex
      ? withoutExt.replace(/\/index$/u, "").replace(/^index$/u, "")
      : withoutExt;
    if (!subpath) continue;

    const alias = `@mp/ui/${subpath}`;
    const prev = byAlias.get(alias);
    if (!prev) {
      byAlias.set(alias, { abs: path.resolve(abs), isIndex });
      continue;
    }
    // Prefer a concrete file over `.../index.*` when both map to the same import (Webpack checks file before index).
    if (prev.isIndex && !isIndex) {
      byAlias.set(alias, { abs: path.resolve(abs), isIndex });
    }
  }

  /** @type {Record<string, string>} */
  const out = {};
  for (const [key, { abs }] of byAlias) {
    out[key] = abs;
  }
  return out;
}

module.exports = { buildUiShadowTurboAliases };
