import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./apps/jira/src/test/setup.ts"],
    include: ["apps/**/*.{spec,test}.{ts,tsx,js,jsx}", "libs/**/*.{spec,test}.{ts,tsx,js,jsx}"],
    globals: true,
    css: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["apps/**/*.{ts,tsx,js,jsx}", "libs/**/*.{ts,tsx,js,jsx}"],
      exclude: [
        "node_modules/**",
        "apps/jira/.next/**",
        ".husky/**",
        "public/**",
        "supabase/**",
        "coverage/**",
        "docs/**",
        "e2e/**",
        "apps/**/types/**",
        "apps/**/constants/**",
        "apps/**/exceptions/**",
        "apps/**/schemas/**",
        "apps/**/test/**",
        "apps/**/prompts/**",
        "libs/**/types/**",
        "libs/**/constants/**",
        "libs/**/schemas/**",
        "**/*.{test,spec}.{ts,tsx,js,jsx}",
        "**/__tests__/**",
      ],
    },
  },
  resolve: {
    alias: [
      // Per-app "@/" alias: resolved based on the importing file's app directory.
      // Each app under apps/ maps "@/" to its own src/ folder.
      {
        find: /^@\/(.*)/,
        replacement: "$1",
        customResolver(source: string, importer: string | undefined) {
          const suffix = source.replace(/^@\//, "");
          const normalized = (importer ?? "").replace(/\\/g, "/");

          // Detect which app is importing — walk up from importer to find apps/<name>/
          const appMatch = normalized.match(/\/apps\/([^/]+)\//);
          const appName = appMatch ? appMatch[1] : "jira";
          const base = path.resolve(root, "apps", appName, "src", suffix);

          // Try candidates in order: bare file → with extensions → as directory index
          for (const candidate of [
            base,
            `${base}.ts`,
            `${base}.tsx`,
            `${base}/index.ts`,
            `${base}/index.tsx`,
          ]) {
            try {
              if (fs.statSync(candidate).isFile()) return candidate;
            } catch {
              // not found, try next
            }
          }
          return base;
        },
      },
      {
        find: "@mp/adapter-test-kit",
        replacement: fileURLToPath(
          new URL("./libs/adapter-test-kit/src/index.ts", import.meta.url),
        ),
      },
      {
        find: "@mp/shared",
        replacement: fileURLToPath(new URL("./libs/shared/src/index.ts", import.meta.url)),
      },
      {
        find: "@mp/task-core/types",
        replacement: fileURLToPath(new URL("./libs/task-core/src/types/index.ts", import.meta.url)),
      },
      {
        find: "@mp/task-core/errors",
        replacement: fileURLToPath(
          new URL("./libs/task-core/src/errors/index.ts", import.meta.url),
        ),
      },
      {
        find: "@mp/task-core/contexts",
        replacement: fileURLToPath(
          new URL("./libs/task-core/src/contexts/index.ts", import.meta.url),
        ),
      },
      {
        find: "@mp/task-core",
        replacement: fileURLToPath(new URL("./libs/task-core/src/index.ts", import.meta.url)),
      },
      {
        find: "@mp/ui",
        replacement: fileURLToPath(new URL("./libs/ui/src/index.ts", import.meta.url)),
      },
      {
        find: "@mp/ai",
        replacement: fileURLToPath(new URL("./libs/ai/src/index.ts", import.meta.url)),
      },
    ],
  },
});
