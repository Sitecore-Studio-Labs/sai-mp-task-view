#!/usr/bin/env sh
# Optional local gate: when package manifests change, run Snyk Open Source if CLI is available.
# Skip entirely: SKIP_SNYK_PRECOMMIT=1 git commit ...

if [ "${SKIP_SNYK_PRECOMMIT:-}" = "1" ]; then
  exit 0
fi

changed_files="$(git diff --cached --name-only --diff-filter=ACMRTUXB)"

if ! printf '%s\n' "$changed_files" | grep -qE '^(package\.json|package-lock\.json)$'; then
  exit 0
fi

if ! command -v snyk >/dev/null 2>&1; then
  printf '%s\n' "snyk CLI not found. Install: https://docs.snyk.io/snyk-cli/install-the-snyk-cli — skipping optional snyk pre-commit."
  exit 0
fi

if [ -z "${SNYK_TOKEN:-}" ] && ! snyk config get api >/dev/null 2>&1; then
  printf '%s\n' "SNYK_TOKEN / snyk auth not configured — skipping optional snyk pre-commit."
  exit 0
fi

printf '%s\n' "Manifest changed — running snyk test (HIGH threshold)..."
exec snyk test --severity-threshold=high
