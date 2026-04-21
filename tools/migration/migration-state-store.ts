export type MigrationState =
  | "PHASE_2_4"
  | "PHASE_3_3_BATCH_1"
  | "PHASE_3_3_BATCH_2"
  | "PHASE_3_3_BATCH_3"
  | "PHASE_4";

export interface MigrationContext {
  state: MigrationState;
  lastValidationReport?: string;
  jiraLeakDetected: boolean;
  ciPassed: boolean;
  capabilitySystemReady?: boolean;
}

let currentState: MigrationState = "PHASE_3_3_BATCH_3";

export function getState() {
  return currentState;
}

export function setState(state: MigrationState) {
  currentState = state;
}

/**
 * Authorizes non–PHASE_4 transitions when validation + CI + leak gates pass.
 * PHASE_4 is never authorized here — use {@link canTransitionToPhase4}.
 */
export function canTransition(next: MigrationState, ctx: MigrationContext): boolean {
  if (next === "PHASE_4") {
    return false;
  }
  if (!ctx.lastValidationReport || ctx.jiraLeakDetected || !ctx.ciPassed) {
    return false;
  }
  return true;
}

/**
 * Sole gate for moving into PHASE_4 (adds capability readiness on top of base gates).
 */
export function canTransitionToPhase4(ctx: MigrationContext): boolean {
  if (!ctx.lastValidationReport || ctx.jiraLeakDetected || !ctx.ciPassed) {
    return false;
  }
  return ctx.capabilitySystemReady === true;
}
