import nxPlugin from "@nx/eslint-plugin";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";
import importPlugin from "eslint-plugin-import";
import simpleImportSort from "eslint-plugin-simple-import-sort";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    settings: {
      next: {
        // All Next apps in the monorepo (import resolver + Next rules need each app root).
        rootDir: ["apps/jira", "apps/wrike"],
      },
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
          noWarnOnMultipleProjects: true,
          project: [
            "apps/jira/tsconfig.json",
            "apps/wrike/tsconfig.json",
            "libs/adapter-test-kit/tsconfig.json",
            "libs/ai/tsconfig.json",
            "libs/observability/tsconfig.json",
            "libs/shared/tsconfig.json",
            "libs/task-core/tsconfig.json",
            "libs/token-storage/tsconfig.json",
            "libs/ui/tsconfig.json",
          ],
        },
      },
    },
    plugins: {
      import: importPlugin,
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
      "import/no-duplicates": "error",
      "import/no-unresolved": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  // ── NX module boundary enforcement ────────────────────────────────────────
  // Requires: npm install -D @nx/eslint-plugin@^20.3.0
  // Tags are defined in each lib's project.json under "tags".
  //
  // Dependency direction (tightest → loosest):
  //   type:util     →  type:util          (e.g. token-storage → shared)
  //   type:feature  →  type:util, type:feature  (e.g. auth → token-storage)
  //   type:ui       →  type:util, type:feature
  //   type:app      →  anything
  //   type:test-kit →  test files only (enforced below)
  {
    plugins: { "@nx": nxPlugin },
    rules: {
      "@nx/enforce-module-boundaries": [
        "error",
        {
          enforceBuildableLibDependency: true,
          // @mp/ui/* self-imports inside libs/ui are intentional: package-absolute
          // paths are required for component shadowing to work (see docs/architecture/component-shadowing.md).
          // Relative imports would bypass the webpack/Turbopack shadow resolver.
          // @mp/observability is essential infrastructure (initialized server-side in instrumentation.ts,
          // used in browser in Providers.tsx, and in routes). Static imports are required everywhere.
          allow: ["@mp/ui", "@mp/ui/*", "@mp/observability", "@mp/observability/*"],
          depConstraints: [
            // Apps can import anything in the monorepo
            {
              sourceTag: "type:app",
              onlyDependOnLibsWithTags: ["type:app", "type:feature", "type:ui", "type:util"],
            },
            // UI libs can import features and utils but not apps
            {
              sourceTag: "type:ui",
              onlyDependOnLibsWithTags: ["type:feature", "type:util"],
            },
            // Feature libs import utils and other features (not apps or UI)
            {
              sourceTag: "type:feature",
              onlyDependOnLibsWithTags: ["type:util", "type:feature"],
            },
            // Utility libs may only depend on other utility libs (no features, no UI, no apps)
            {
              sourceTag: "type:util",
              onlyDependOnLibsWithTags: ["type:util"],
            },
            // Test-kit may only be used in test files
            {
              sourceTag: "type:test-kit",
              onlyDependOnLibsWithTags: ["type:feature", "type:util", "type:ui"],
            },
            // Playwright E2E apps (apps/<platform>-e2e) may use the shared E2E kit
            {
              sourceTag: "type:e2e",
              onlyDependOnLibsWithTags: ["type:e2e-kit", "type:util"],
            },
            // E2E kit (Playwright suite runner) — no @mp feature/ui deps
            {
              sourceTag: "type:e2e-kit",
              onlyDependOnLibsWithTags: ["type:util"],
            },
          ],
        },
      ],
    },
  },
  prettier,
  {
    files: ["libs/ui/**/*.tsx", "libs/ui/**/*.ts"],
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
  // Node CLI scripts under tools/ use CommonJS require(); ESM would need .mjs or broader package type.
  {
    files: ["tools/**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  // next.config.ts is build-time configuration and must cross project boundaries
  // to import webpack plugins from tools/. Allow both the boundary crossing and
  // require() calls (needed for CJS webpack-plugin files).
  {
    files: ["apps/*/next.config.ts"],
    rules: {
      "@nx/enforce-module-boundaries": "off",
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  // vitest.config.ts is test tooling; may import shared helpers from tools/.
  {
    files: ["**/vitest.config.ts", "vitest.config.ts"],
    rules: {
      "@nx/enforce-module-boundaries": "off",
    },
  },
  // Apps may import @mp/adapter-test-kit (type:test-kit) only in test/spec files.
  {
    files: ["**/*.spec.ts", "**/*.spec.tsx", "**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "@nx/enforce-module-boundaries": [
        "error",
        {
          enforceBuildableLibDependency: true,
          allow: ["@mp/ui", "@mp/ui/*"],
          depConstraints: [
            {
              sourceTag: "type:app",
              onlyDependOnLibsWithTags: [
                "type:app",
                "type:feature",
                "type:ui",
                "type:util",
                "type:test-kit",
              ],
            },
            {
              sourceTag: "type:ui",
              onlyDependOnLibsWithTags: ["type:feature", "type:util"],
            },
            {
              sourceTag: "type:feature",
              onlyDependOnLibsWithTags: ["type:util", "type:feature"],
            },
            {
              sourceTag: "type:util",
              onlyDependOnLibsWithTags: ["type:util"],
            },
            {
              sourceTag: "type:test-kit",
              onlyDependOnLibsWithTags: ["type:feature", "type:util", "type:ui"],
            },
          ],
        },
      ],
    },
  },
  // Prevent production code from importing test-kit packages
  {
    files: ["apps/**/*.ts", "apps/**/*.tsx", "libs/**/*.ts", "libs/**/*.tsx"],
    ignores: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@mp/adapter-test-kit", "@mp/adapter-test-kit/*"],
              message: "@mp/adapter-test-kit is test-only — import it only in *.test.ts files.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "apps/**/.next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // NX build cache and dist artifacts:
    ".nx/**",
    "dist/**",
    // Ignore Sitecore Blok components:
    "src/components/ui/**/*",
  ]),
]);

export default eslintConfig;
