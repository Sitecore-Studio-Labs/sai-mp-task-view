export class WrikeAuthError extends Error {
  constructor(message = "Wrike session has expired. Please reconnect Wrike.") {
    super(message);
    this.name = "WrikeAuthError";
  }
}
