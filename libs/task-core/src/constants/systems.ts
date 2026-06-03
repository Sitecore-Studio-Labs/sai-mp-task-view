export const SYSTEMS = {
  JIRA: "Jira",
  WRIKE: "Wrike",
  // ASANA: 'Asana',
  // Extend as needed
} as const;

export type System = (typeof SYSTEMS)[keyof typeof SYSTEMS];
