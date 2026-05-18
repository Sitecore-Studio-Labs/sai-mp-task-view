export function scenarioNotImplemented(scenario: string): never {
  throw new Error(`E2E scenario not implemented: ${scenario}`);
}
