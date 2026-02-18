export const SYSTEMS = {
  JIRA: 'Jira',
  // ASANA: 'Asana',
  // Extend as needed
} as const;

export type System = (typeof SYSTEMS)[keyof typeof SYSTEMS];
