import { defineConfig, mergeConfig } from "vitest/config";

import { vitestBaseConfig } from "./tools/vitest/vitest.base";

export default mergeConfig(
  vitestBaseConfig,
  defineConfig({
    test: {
      setupFiles: ["./apps/jira/src/test/setup.ts"],
      include: ["apps/**/*.{spec,test}.{ts,tsx,js,jsx}", "libs/**/*.{spec,test}.{ts,tsx,js,jsx}"],
    },
  }),
);
