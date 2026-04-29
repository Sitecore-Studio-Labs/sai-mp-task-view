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
        rootDir: ["apps/jira"],
      },
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
          noWarnOnMultipleProjects: true,
          project: [
            "apps/jira/tsconfig.json",
            "libs/ui/tsconfig.json",
            "libs/shared/tsconfig.json",
            "libs/task-core/tsconfig.json",
            "libs/ai/tsconfig.json",
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
  prettier,
  {
    files: ["libs/ui/**/*.tsx", "libs/ui/**/*.ts"],
    rules: {
      "@next/next/no-img-element": "off",
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
