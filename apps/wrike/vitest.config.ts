import { createProjectVitestConfig } from "../../tools/vitest/createProjectVitestConfig";

export default createProjectVitestConfig(import.meta.url, {
  setupFiles: ["src/test/setup.ts"],
});
