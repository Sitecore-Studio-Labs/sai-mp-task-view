/** @type {import('@commitlint/types').UserConfig} */
const commitlintConfig = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      ["feat", "fix", "docs", "style", "refactor", "perf", "test", "build", "ci", "chore"],
    ],
    // Header: relaxed above the 50/72 git-email convention so scoped subjects fit.
    "header-max-length": [2, "always", 120],
    // Body/footer: match header cap so bullet lists in PR-style bodies pass without
    // arbitrary wraps. Default @commitlint/config-conventional is 100; 72 is the
    // classic git log width if you prefer stricter readability.
    "body-max-line-length": [2, "always", 120],
    "footer-max-line-length": [2, "always", 120],
    "subject-case": [2, "never", ["start-case", "pascal-case", "upper-case"]],
  },
};

export default commitlintConfig;
