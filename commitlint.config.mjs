/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      ["feature", "fix", "docs", "style", "refactor", "perf", "test", "build", "ci", "chore"],
    ],
    "header-max-length": [2, "always", 100],
    "subject-case": [2, "never", ["start-case", "pascal-case", "upper-case"]],
  },
};
