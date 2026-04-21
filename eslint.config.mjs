import { defineConfig, globalIgnores } from "eslint/config";
import nx from "@nx/eslint-plugin";
import nextVitals from "eslint-config-next/core-web-vitals";
import prettier from "eslint-config-prettier";
import simpleImportSort from "eslint-plugin-simple-import-sort";

const eslintConfig = defineConfig([
  {
    plugins: {
      "@nx": nx,
    },
  },
  ...nextVitals,
  {
    plugins: {
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
    rules: {
      "@nx/enforce-module-boundaries": [
        "error",
        {
          enforceBuildableLibDependency: true,
          allow: [
            "^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$",
            // App Router path alias (tsconfig); same-project until code moves to libs.
            "^@/",
            "^@sai-mp-jira-task-view/",
          ],
          depConstraints: [
            {
              sourceTag: "scope:ui",
              onlyDependOnLibsWithTags: ["scope:ui", "scope:core"],
            },
            {
              sourceTag: "scope:core",
              onlyDependOnLibsWithTags: ["scope:core"],
            },
            {
              sourceTag: "scope:data-access",
              onlyDependOnLibsWithTags: ["scope:data-access", "scope:core"],
            },
            {
              sourceTag: "scope:providers",
              onlyDependOnLibsWithTags: [
                "scope:providers",
                "scope:core",
                "scope:data-access",
                "scope:platform",
              ],
            },
            {
              sourceTag: "scope:platform",
              onlyDependOnLibsWithTags: ["scope:platform", "scope:core", "scope:data-access"],
            },
            {
              sourceTag: "scope:capabilities",
              onlyDependOnLibsWithTags: ["scope:capabilities", "scope:core"],
            },
            { sourceTag: "type:app", onlyDependOnLibsWithTags: ["*"] },
            { sourceTag: "*", onlyDependOnLibsWithTags: ["*"] },
          ],
        },
      ],
    },
  },
  prettier,
  {
    files: ["libs/ui/**/*.{ts,tsx}"],
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "@next/next/no-img-element": "off",
    },
  },
  {
    files: ["**/next.config.js", "**/next.config.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    "**/.next/**",
    "out/**",
    "build/**",
    "**/next-env.d.ts",
  ]),
]);

export default eslintConfig;
