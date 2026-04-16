export class JiraAuthError extends Error {
  constructor(message = "Jira session has expired. Please reconnect Jira.") {
    super(message);
    this.name = "JiraAuthError";
  }
}
