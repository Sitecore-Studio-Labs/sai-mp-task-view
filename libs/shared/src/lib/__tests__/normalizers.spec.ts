import { describe, expect, it } from "vitest";

import { mapAssignee, mapPriority, stripHtml, toISODateString } from "../normalizers";

// ── toISODateString ─────────────────────────────────────────────────────────

describe("toISODateString", () => {
  it("returns null for null", () => {
    expect(toISODateString(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(toISODateString(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(toISODateString("")).toBeNull();
  });

  it("converts a Date object to ISO string", () => {
    const d = new Date("2024-06-15T10:00:00.000Z");
    expect(toISODateString(d)).toBe("2024-06-15T10:00:00.000Z");
  });

  it("returns null for an invalid Date object", () => {
    expect(toISODateString(new Date("not-a-date"))).toBeNull();
  });

  it("converts an ISO date string to ISO string", () => {
    expect(toISODateString("2024-06-15T10:00:00.000Z")).toBe("2024-06-15T10:00:00.000Z");
  });

  it("converts a YYYY-MM-DD string to ISO string", () => {
    const result = toISODateString("2024-06-15");
    expect(result).not.toBeNull();
    expect(result).toMatch(/^2024-06-15/);
  });

  it("returns null for an unparseable string", () => {
    expect(toISODateString("not-a-date")).toBeNull();
  });

  it("converts a Unix epoch number to ISO string", () => {
    const ts = Date.UTC(2024, 5, 15, 10, 0, 0);
    const result = toISODateString(ts);
    expect(result).toBe(new Date(ts).toISOString());
  });
});

// ── mapPriority ─────────────────────────────────────────────────────────────

const PRIORITY_MAP = { High: "High", Normal: "Medium", Low: "Low" };

describe("mapPriority", () => {
  it("returns null for null", () => {
    expect(mapPriority(null, PRIORITY_MAP)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(mapPriority(undefined, PRIORITY_MAP)).toBeNull();
  });

  it("maps a plain string to the corresponding label", () => {
    expect(mapPriority("High", PRIORITY_MAP)).toBe("High");
    expect(mapPriority("Normal", PRIORITY_MAP)).toBe("Medium");
  });

  it("returns null for a string not found in the map", () => {
    expect(mapPriority("Unknown", PRIORITY_MAP)).toBeNull();
  });

  it("maps an object with a name field", () => {
    expect(mapPriority({ name: "Low" }, PRIORITY_MAP)).toBe("Low");
  });

  it("returns null when the object name is not in the map", () => {
    expect(mapPriority({ name: "Critical" }, PRIORITY_MAP)).toBeNull();
  });

  it("returns null when the object has no name field", () => {
    expect(mapPriority({}, PRIORITY_MAP)).toBeNull();
  });
});

// ── mapAssignee ─────────────────────────────────────────────────────────────

describe("mapAssignee", () => {
  it("returns null for null", () => {
    expect(mapAssignee(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(mapAssignee(undefined)).toBeNull();
  });

  it("extracts accountId and displayName", () => {
    expect(mapAssignee({ accountId: "abc123", displayName: "Alice" })).toEqual({
      id: "abc123",
      displayName: "Alice",
    });
  });

  it("falls back to userId and name", () => {
    expect(mapAssignee({ userId: "u-99", name: "Bob" })).toEqual({
      id: "u-99",
      displayName: "Bob",
    });
  });

  it("falls back to id and fullName", () => {
    expect(mapAssignee({ id: "xyz", fullName: "Carol Dean" })).toEqual({
      id: "xyz",
      displayName: "Carol Dean",
    });
  });

  it("returns null when id is missing", () => {
    expect(mapAssignee({ displayName: "No ID" })).toBeNull();
  });

  it("returns null when displayName is missing", () => {
    expect(mapAssignee({ accountId: "abc" })).toBeNull();
  });
});

// ── stripHtml ───────────────────────────────────────────────────────────────

describe("stripHtml", () => {
  it("returns empty string for null", () => {
    expect(stripHtml(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(stripHtml(undefined)).toBe("");
  });

  it("returns empty string for empty string", () => {
    expect(stripHtml("")).toBe("");
  });

  it("strips simple tags", () => {
    expect(stripHtml("<p>Hello world</p>")).toBe("Hello world");
  });

  it("strips nested tags", () => {
    expect(stripHtml("<div><strong>Bold</strong> and <em>italic</em></div>")).toBe(
      "Bold and italic",
    );
  });

  it("decodes common HTML entities", () => {
    expect(stripHtml("A &amp; B &lt;tag&gt; &quot;quoted&quot; it&#39;s")).toBe(
      `A & B <tag> "quoted" it's`,
    );
  });

  it("collapses multiple whitespace into a single space", () => {
    expect(stripHtml("<p>  Hello   world  </p>")).toBe("Hello world");
  });

  it("replaces &nbsp; with a space", () => {
    expect(stripHtml("Hello&nbsp;World")).toBe("Hello World");
  });

  it("handles a Wrike-style HTML description", () => {
    const html = "<h1>Title</h1><p>Description with <strong>bold</strong> text &amp; entities.</p>";
    expect(stripHtml(html)).toBe("Title Description with bold text & entities.");
  });
});
