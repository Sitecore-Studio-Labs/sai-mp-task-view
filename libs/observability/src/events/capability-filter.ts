/**
 * Capability-aware event gate.
 *
 * Events that are only meaningful for platforms with a specific feature are
 * silently dropped when that capability flag is false (or absent).
 * This lets every platform share the same tracking call-sites — the filter
 * handles conditional emission automatically.
 *
 * Deliberately does NOT import from @mp/task-core to keep this lib React-free
 * and usable on the server without any React dependency.
 */

/** Subset of PlatformCapabilities flags relevant to observability gating. */
export interface CapabilityFlags {
  hasStatusTransitions?: boolean;
  hasComments?: boolean;
  hasAttachments?: boolean;
  hasSites?: boolean;
  hasAiWorkBreakdown?: boolean;
  hasSubtasks?: boolean;
  hasParentIssue?: boolean;
  hasAssignees?: boolean;
  hasDueDate?: boolean;
  hasPriorities?: boolean;
  hasIssueTypes?: boolean;
}

/** Maps event names to the capability flag that must be true to emit them. */
const CAPABILITY_GUARDS: Partial<Record<string, keyof CapabilityFlags>> = {
  "task.status_changed": "hasStatusTransitions",
  "comment.added": "hasComments",
  "attachment.uploaded": "hasAttachments",
  "site.selected": "hasSites",
  "ai_breakdown.generated": "hasAiWorkBreakdown",
  "ai_breakdown.published": "hasAiWorkBreakdown",
};

/**
 * Returns true when the event should be tracked for the given capability set.
 * Events with no guard always return true.
 */
export function shouldTrackEvent(eventName: string, capabilities: CapabilityFlags): boolean {
  const guard = CAPABILITY_GUARDS[eventName];
  if (!guard) return true;
  // Only suppress when the flag is explicitly false; undefined means unrestricted
  return capabilities[guard] !== false;
}
