import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";
import importPlugin from "eslint-plugin-import";
import simpleImportSort from "eslint-plugin-simple-import-sort";

// @nx/eslint-plugin provides @nx/enforce-module-boundaries.
// Install: npm install -D @nx/eslint-plugin@^20.3.0
let nxPlugin;
try {
  // Dynamic require so the config doesn't crash before the package is installed.
  const { default: plugin } = await import("@nx/eslint-plugin");
  nxPlugin = plugin;
} catch {
  nxPlugin = null;
}

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
            "libs/env/tsconfig.json",
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
  //   type:util  →  (nothing)
  //   type:feature  →  type:util, type:feature (e.g. auth → token-storage)
  //   type:ui  →  type:util, type:feature
  //   type:app  →  anything
  //   type:test-kit  →  test files only (enforced below)
  ...(nxPlugin
    ? [
        {
          plugins: { "@nx": nxPlugin },
          rules: {
            "@nx/enforce-module-boundaries": [
              "error",
              {
                enforceBuildableLibDependency: true,
                allow: [],
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
                  // Utility libs are leaf nodes — no lib imports allowed
                  {
                    sourceTag: "type:util",
                    onlyDependOnLibsWithTags: [],
                  },
                  // Test-kit may only be used in test files
                  {
                    sourceTag: "type:test-kit",
                    onlyDependOnLibsWithTags: ["type:feature", "type:util", "type:ui"],
                  },
                ],
              },
            ],
          },
        },
      ]
    : []),
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
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Ignore Sitecore Blok components:
    "src/components/ui/**/*",
  ]),
]);

export default eslintConfig;
