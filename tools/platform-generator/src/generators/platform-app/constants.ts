/** Ids that must never be scaffolded (core product). */
export const RESERVED_PLATFORM_IDS = new Set(["jira"]);

/** Capability rows already authored in `capability-registry.ts` (skip duplicate file + extension row). */
export const BUILTIN_CAPABILITY_IDS = new Set(["jira", "asana", "trello"]);

/** Platforms with built-in `getPlatformUISchema` switch cases (skip extension UI map). */
export const BUILTIN_UI_SWITCH_IDS = new Set(["jira", "asana", "trello"]);
