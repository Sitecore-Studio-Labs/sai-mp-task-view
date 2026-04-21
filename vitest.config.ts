import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));
const daLib = path.join(root, "libs/data-access/src/lib");

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./apps/jira-app/src/test/setup.ts"],
    include: ["apps/jira-app/src/**/*.{spec,test}.{ts,tsx,js,jsx}"],
    globals: true,
    css: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["apps/jira-app/src/**/*.{ts,tsx,js,jsx}"],
      exclude: [
        "node_modules/**",
        "apps/jira-app/.next/**",
        ".husky/**",
        "public/**",
        "supabase/**",
        "coverage/**",
        "docs/**",
        "e2e/**",
        "apps/jira-app/src/types/**",
        "apps/jira-app/src/constants/**",
        "apps/jira-app/src/exceptions/**",
        "apps/jira-app/src/schemas/**",
        "apps/jira-app/src/test/**",
        "apps/jira-app/src/prompts/**",
        "**/*.{test,spec}.{ts,tsx,js,jsx}",
        "**/__tests__/**",
      ],
    },
  },
  resolve: {
    alias: [
      {
        find: "@/lib/queryClient",
        replacement: path.join(root, "libs/core/src/lib/queryClient.ts"),
      },
      { find: "@/types/jira", replacement: path.join(daLib, "types/jira.ts") },
      { find: "@/types/platform", replacement: path.join(daLib, "types/platform.ts") },
      { find: "@/services/jiraService", replacement: path.join(daLib, "jiraService.ts") },
      { find: "@/lib/supabaseClient", replacement: path.join(daLib, "supabaseClient.ts") },
      { find: "@/exceptions/jiraErrors", replacement: path.join(daLib, "jiraErrors.ts") },
      { find: "@/lib/jqlBuilder", replacement: path.join(daLib, "jqlBuilder.ts") },
      {
        find: "@/platforms/base/PlatformAdapter",
        replacement: path.join(daLib, "platforms/base/PlatformAdapter.ts"),
      },
      {
        find: "@/platforms/jira/JiraAdapter",
        replacement: path.join(daLib, "platforms/jira/JiraAdapter.ts"),
      },
      { find: "@/utils/encryption", replacement: path.join(daLib, "encryption.ts") },
      {
        find: "@/components/ui",
        replacement: fileURLToPath(new URL("./libs/ui/src/lib", import.meta.url)),
      },
      {
        find: "@",
        replacement: fileURLToPath(new URL("./apps/jira-app/src", import.meta.url)),
      },
    ],
  },
});
