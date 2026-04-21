export type PlatformKind = "asana" | "trello" | "wrike" | "custom";

/** Phase 6.3 — public generator input shape (doc: `PlatformGeneratorSchema`). */
export interface PlatformAppGeneratorSchema {
  name: string;
  type?: PlatformKind;
}

export type PlatformGeneratorSchema = PlatformAppGeneratorSchema;
