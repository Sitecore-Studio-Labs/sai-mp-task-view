import { describe } from "vitest";

import { buildProjectIssuesJql } from "@/lib/jqlBuilder";
import { JiraIssueFilters } from "@/types/jira";

describe("JQL Builder Fields", () => {
  it("should build JQL with only project key", () => {
    const jql = buildProjectIssuesJql("TEST");
    expect(jql).toBe(`project = "TEST"`);
  });

  it("should escape quotes and backslashes in project key", () => {
    const jql = buildProjectIssuesJql(`TE"ST\\`);
    expect(jql).toBe(`project = "TE\\"ST\\\\"`);
  });

  it("should ignore empty filter arrays", () => {
    const filters: JiraIssueFilters = { assignee: [] };
    const jql = buildProjectIssuesJql("TEST", filters);
    expect(jql).toBe(`project = "TEST"`);
  });

  it("should ignore empty priority array", () => {
    const filters: JiraIssueFilters = { priority: [] };
    const jql = buildProjectIssuesJql("TEST", filters);

    expect(jql).toBe(`project = "TEST"`);
  });

  it("should ignore empty status array", () => {
    const filters: JiraIssueFilters = { status: [] };
    const jql = buildProjectIssuesJql("TEST", filters);

    expect(jql).toBe(`project = "TEST"`);
  });

  it("should return only project when filters is undefined", () => {
    const jql = buildProjectIssuesJql("TEST", undefined);

    expect(jql).toBe(`project = "TEST"`);
  });

  it("should return only project when filters object is empty", () => {
    const filters: JiraIssueFilters = {};
    const jql = buildProjectIssuesJql("TEST", filters);

    expect(jql).toBe(`project = "TEST"`);
  });

  it("should handle assignee filter with single user", () => {
    const filters: JiraIssueFilters = { assignee: ["alice"] };
    const jql = buildProjectIssuesJql("TEST", filters);
    expect(jql).toBe(`project = "TEST" AND (assignee IN ("alice"))`);
  });

  it("should handle assignee filter with multiple users", () => {
    const filters: JiraIssueFilters = { assignee: ["alice", "bob"] };
    const jql = buildProjectIssuesJql("TEST", filters);
    expect(jql).toBe(`project = "TEST" AND (assignee IN ("alice", "bob"))`);
  });

  it("should handle assignee filter with unassigned", () => {
    const filters: JiraIssueFilters = { assignee: ["unassigned"] };
    const jql = buildProjectIssuesJql("TEST", filters);
    expect(jql).toBe(`project = "TEST" AND (assignee IS EMPTY)`);
  });

  it("should handle assignee filter with users and unassigned", () => {
    const filters: JiraIssueFilters = { assignee: ["alice", "unassigned"] };
    const jql = buildProjectIssuesJql("TEST", filters);
    expect(jql).toBe(`project = "TEST" AND (assignee IN ("alice") OR assignee IS EMPTY)`);
  });

  it("should handle priority filter", () => {
    const filters: JiraIssueFilters = { priority: ["High", "Low"] };
    const jql = buildProjectIssuesJql("TEST", filters);
    expect(jql).toBe(`project = "TEST" AND priority IN ("High", "Low")`);
  });

  it("should handle status filter", () => {
    const filters: JiraIssueFilters = { status: ["Open", "Closed"] };
    const jql = buildProjectIssuesJql("TEST", filters);
    expect(jql).toBe(`project = "TEST" AND status IN ("Open", "Closed")`);
  });

  it("should combine multiple filters", () => {
    const filters: JiraIssueFilters = {
      assignee: ["alice", "unassigned"],
      priority: ["High"],
      status: ["Open"],
    };
    const jql = buildProjectIssuesJql("TEST", filters);
    expect(jql).toBe(
      `project = "TEST" AND (assignee IN ("alice") OR assignee IS EMPTY) AND priority IN ("High") AND status IN ("Open")`,
    );
  });

  it("should escape special characters in assignee, priority, and status", () => {
    const filters: JiraIssueFilters = {
      assignee: ['ali"ce', "bob\\smith"],
      priority: ['H"igh'],
      status: ['O"pen'],
    };
    const jql = buildProjectIssuesJql("T\\EST", filters);
    expect(jql).toBe(
      `project = "T\\\\EST" AND (assignee IN ("ali\\"ce", "bob\\\\smith")) AND priority IN ("H\\"igh") AND status IN ("O\\"pen")`,
    );
  });
});
