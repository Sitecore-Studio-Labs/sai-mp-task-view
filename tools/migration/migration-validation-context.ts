import { MigrationState } from "./migration-state-store";

export interface MigrationValidationContext {
  state: MigrationState;

  // CI
  ciPassed: boolean;

  // Jira leak system
  jiraLeakDetected: boolean;

  // structured validation report
  validationReport: {
    phase: string;
    batch: string;
    summary: string;
    missingItems: string[];
    passedChecks: string[];
  };

  // capability system readiness (PHASE 4 gate)
  capabilitySystemReady: boolean;
}

export function createValidationContext(input: MigrationValidationContext) {
  return {
    ...input,
    isValidForTransition(): boolean {
      return (
        input.ciPassed === true &&
        input.jiraLeakDetected === false &&
        input.validationReport !== undefined &&
        input.capabilitySystemReady === true
      );
    },
  };
}
