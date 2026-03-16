import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{spec,test}.{ts,tsx,js,jsx}"],
    globals: true,
    css: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.{ts,tsx,js,jsx}"],
      exclude: [
        "node_modules/**",
        ".next/**",
        ".husky/**",
        "public/**",
        "supabase/**",
        "coverage/**",
        "docs/**",
        "src/types/**",
        "src/constants/**",
        "src/exceptions/**",
        "src/helpers/**",
        "src/platforms/**",
        "src/lib/**",
        "src/schemas/**",
        "src/test/**",
        "src/e2e/**",
        "src/prompts/**",
        "**/*.{test,spec}.{ts,tsx,js,jsx}",
        "**/__tests__/**",
      ],
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
