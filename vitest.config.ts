import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

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
    alias: {
      "@": fileURLToPath(new URL("./apps/jira/src", import.meta.url)),
      "@mp/adapter-test-kit": fileURLToPath(
        new URL("./libs/adapter-test-kit/src/index.ts", import.meta.url),
      ),
      "@mp/shared": fileURLToPath(new URL("./libs/shared/src/index.ts", import.meta.url)),
      "@mp/task-core": fileURLToPath(new URL("./libs/task-core/src/index.ts", import.meta.url)),
      "@mp/task-core/types": fileURLToPath(
        new URL("./libs/task-core/src/types/index.ts", import.meta.url),
      ),
      "@mp/task-core/errors": fileURLToPath(
        new URL("./libs/task-core/src/errors/index.ts", import.meta.url),
      ),
      "@mp/task-core/contexts": fileURLToPath(
        new URL("./libs/task-core/src/contexts/index.ts", import.meta.url),
      ),
      "@mp/ui": fileURLToPath(new URL("./libs/ui/src/index.ts", import.meta.url)),
      "@mp/ai": fileURLToPath(new URL("./libs/ai/src/index.ts", import.meta.url)),
    },
  },
});
