import { RESERVED_PLATFORM_IDS } from "./constants";
import type { PlatformAppGeneratorSchema, PlatformKind } from "./schema";

export type { PlatformKind } from "./schema";

export interface NormalizedPlatformInput {
  /** Normalized kebab-case id used for paths and registry keys. */
  id: string;
  /** Declared platform kind (scaffoldable kinds only; see schema enum). */
  type: PlatformKind;
  rawName: string;
}

const PLATFORM_KINDS = new Set<PlatformKind>(["asana", "trello", "wrike", "custom"]);

export function normalizePlatformId(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "");
}

/**
 * Phase 6.3 — schema validation + enforcement before any filesystem writes.
 */
export function assertValidPlatformSchema(
  options: PlatformAppGeneratorSchema,
): NormalizedPlatformInput {
  const rawName = options.name?.trim() ?? "";
  if (!rawName) {
    throw new Error('[platform-app] "name" is required.');
  }

  const id = normalizePlatformId(rawName);
  if (!id) {
    throw new Error(
      `[platform-app] Invalid platform name "${options.name}" (nothing usable after normalization).`,
    );
  }

  if (!/^[a-z][a-z0-9-]*$/.test(id)) {
    throw new Error(
      `[platform-app] Platform id must match ^[a-z][a-z0-9-]*$ (normalized: "${id}").`,
    );
  }

  if (id.length < 2 || id.length > 63) {
    throw new Error(`[platform-app] Platform id length must be 2–63 (got ${id.length}).`);
  }

  if (RESERVED_PLATFORM_IDS.has(id)) {
    throw new Error(`[platform-app] Platform id "${id}" is reserved and cannot be scaffolded.`);
  }

  const type = (options.type ?? "custom") as PlatformKind;
  if (!PLATFORM_KINDS.has(type)) {
    throw new Error(
      `[platform-app] Invalid type "${String(options.type)}". Allowed: asana | trello | wrike | custom.`,
    );
  }

  if (type !== "custom" && id !== type) {
    throw new Error(
      `[platform-app] When type is "${type}", name must normalize to the same id (got "${id}" from "${rawName}"). Use --name=${type} or set type to "custom".`,
    );
  }

  return { id, type, rawName };
}
