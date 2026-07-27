import { describe, expect, it } from "vitest";

import { isVideoFile, resolveContentType } from "../attachmentHelpers";

describe("isVideoFile", () => {
  it("detects common video extensions", () => {
    expect(isVideoFile("demo.mp4")).toBe(true);
    expect(isVideoFile("clip.webm")).toBe(true);
    expect(isVideoFile("movie.MOV")).toBe(true);
  });

  it("returns false for non-video files", () => {
    expect(isVideoFile("photo.png")).toBe(false);
    expect(isVideoFile("notes.pdf")).toBe(false);
  });

  it("falls back to MIME type when filename has no extension", () => {
    expect(isVideoFile("recording", "video/mp4")).toBe(true);
    expect(isVideoFile("recording", "image/png")).toBe(false);
  });
});

describe("resolveContentType", () => {
  it("maps video extensions to canonical MIME types", () => {
    expect(resolveContentType("demo.mp4", "application/octet-stream")).toBe("video/mp4");
    expect(resolveContentType("clip.webm", "text/plain")).toBe("video/webm");
  });
});
