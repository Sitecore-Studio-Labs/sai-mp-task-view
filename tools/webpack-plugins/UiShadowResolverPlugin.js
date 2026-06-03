// @ts-check
"use strict";

const fs = require("node:fs");

/**
 * Webpack resolver plugin implementing component shadowing for @mp/ui.
 *
 * Before resolving any `@mp/ui/<subpath>` import, checks whether a matching
 * file exists inside the app's `overridesDir`. When found, the bundler is
 * redirected to that file — giving each platform app a zero-config way to
 * replace any component from libs/ui without touching the lib source.
 *
 * Convention (mirrors the lib's own directory structure):
 *
 *   import { CreateTaskView } from "@mp/ui/components/tasks/CreateTaskView"
 *   └─ checks: apps/jira/src/components/tasks/CreateTaskView.tsx  ← wins if exists
 *   └─ falls through to: libs/ui/src/components/tasks/CreateTaskView.tsx
 *
 * Usage in next.config.ts:
 *   webpack(config) {
 *     config.resolve.plugins.unshift(
 *       new UiShadowResolverPlugin({
 *         overridesDir: path.resolve(__dirname, "src"),
 *       }),
 *     );
 *     return config;
 *   }
 *
 * The TypeScript side mirrors this via tsconfig path candidates:
 *   "@mp/ui/*": ["./src/*", "../../libs/ui/src/*"]
 */
class UiShadowResolverPlugin {
  /**
   * @param {{ overridesDir: string; libAlias?: string }} options
   *   overridesDir — absolute path to the app's overrides directory.
   *   libAlias     — package alias to intercept. Defaults to "@mp/ui".
   */
  constructor({ overridesDir, libAlias = "@mp/ui" }) {
    if (!overridesDir) throw new Error("UiShadowResolverPlugin: overridesDir is required.");
    this.libAlias = libAlias;
    // Normalize to POSIX separators so string comparisons work on Windows.
    this.overridesDir = overridesDir.replace(/\\/g, "/");
  }

  /**
   * @param {import("enhanced-resolve").Resolver} resolver
   */
  apply(resolver) {
    const { libAlias, overridesDir } = this;
    const prefix = libAlias + "/";
    // Extension priority matches TypeScript's own resolution order.
    const EXTENSIONS = [".tsx", ".ts", ".jsx", ".js"];

    // Run on `described-resolve` (same stage as Next's JsConfigPathsPlugin) and
    // register this plugin first via `unshift` in next.config so shadows win
    // before tsconfig paths try `../../libs/ui/...`. That keeps the resolved
    // module resource on the app file so dev HMR watches the override.
    resolver
      .getHook("described-resolve")
      .tapAsync("UiShadowResolverPlugin", (request, resolveContext, callback) => {
        // Normalize to POSIX separators — enhanced-resolve may hand us
        // backslash paths on Windows.
        const req = request.request?.replace(/\\/g, "/");
        if (!req?.startsWith(prefix)) return callback();

        const subpath = req.slice(prefix.length);

        // Build candidates using string concat (not path.join) so the result
        // always uses forward slashes, which enhanced-resolve expects.
        const candidates = [
          ...EXTENSIONS.map((ext) => `${overridesDir}/${subpath}${ext}`),
          ...EXTENSIONS.map((ext) => `${overridesDir}/${subpath}/index${ext}`),
        ];

        for (const candidate of candidates) {
          if (fs.existsSync(candidate)) {
            return resolver.doResolve(
              resolver.ensureHook("resolve"),
              { ...request, request: candidate },
              `[UiShadow] ${req} → ${candidate}`,
              resolveContext,
              callback,
            );
          }
        }

        // No override found — fall through to normal resolution.
        return callback();
      });
  }
}

module.exports = { UiShadowResolverPlugin };
