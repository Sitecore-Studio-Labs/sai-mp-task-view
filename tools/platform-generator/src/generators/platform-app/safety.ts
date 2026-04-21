/**
 * Phase 6.7 — generator safety: never scaffold into core Jira / engine / BFF paths.
 * (Writes are still limited by generator logic; this blocks hostile ids.)
 */

const FORBIDDEN_IDS = new Set(["jira", "node_modules", "dist", "tmp", ".git"]);

/** Relative paths (posix) that must never be targeted by this generator. */
export const FORBIDDEN_WRITE_PATH_PREFIXES = [
  "libs/providers/jira/src/lib/jira-extension-provider.ts",
  "libs/providers/jira/src/lib/jira-task-platform-provider.ts",
  "libs/providers/jira/src/lib/jira-bff-client.ts",
  "libs/capabilities/src/lib/capability-engine.ts",
  "libs/capabilities/src/lib/useCapability.ts",
  "libs/capabilities/src/lib/ui-renderer.tsx",
  "libs/capabilities/src/lib/DynamicTaskView.tsx",
] as const;

export function assertSafePlatformGeneration(id: string): void {
  if (!id || id.includes("..") || id.includes("/") || id.includes("\\")) {
    throw new Error(`[platform-app/safety] Invalid platform id "${id}".`);
  }
  if (FORBIDDEN_IDS.has(id)) {
    throw new Error(`[platform-app/safety] Platform id "${id}" is blocked.`);
  }
}

export function assertWritePathAllowed(relativePosixPath: string): void {
  const norm = relativePosixPath.replace(/\\/g, "/");
  for (const prefix of FORBIDDEN_WRITE_PATH_PREFIXES) {
    if (norm === prefix || norm.startsWith(`${prefix}/`)) {
      throw new Error(`[platform-app/safety] Refusing to write protected path: ${norm}`);
    }
  }
}
