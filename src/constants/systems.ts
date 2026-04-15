export const SYSTEMS = {
  JIRA: "Jira",
  WRIKE: "Wrike",
  // Extend as needed
} as const;

export type System = (typeof SYSTEMS)[keyof typeof SYSTEMS];
