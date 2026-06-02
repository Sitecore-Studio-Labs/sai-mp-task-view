import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig, mergeConfig } from "vitest/config";

import { vitestBaseConfig } from "./vitest.base";

type ProjectVitestOptions = {
  setupFiles?: string[];
};

export function createProjectVitestConfig(configUrl: string, options?: ProjectVitestOptions) {
  const projectRoot = path.dirname(fileURLToPath(configUrl));

  return mergeConfig(
    vitestBaseConfig,
    defineConfig({
      root: projectRoot,
      test: {
        include: ["src/**/*.{spec,test}.{ts,tsx,js,jsx}"],
        setupFiles: options?.setupFiles ?? [],
        passWithNoTests: true,
        coverage: {
          include: ["src/**/*.{ts,tsx,js,jsx}"],
          exclude: [
            "src/**/*.d.ts",
            "src/**/types/**",
            "src/**/constants/**",
            "src/**/schemas/**",
            "src/**/test/**",
            "src/**/prompts/**",
            "**/*.{test,spec}.{ts,tsx,js,jsx}",
            "**/__tests__/**",
          ],
        },
      },
    }),
  );
}
