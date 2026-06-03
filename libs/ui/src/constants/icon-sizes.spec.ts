import { describe, expect, it } from "vitest";

import { ICON_SIZE_SCALE, resolveIconSize } from "./icon-sizes";

describe("resolveIconSize", () => {
  it("maps semantic scale tokens (standalone lib/icon)", () => {
    expect(resolveIconSize("close")).toEqual({ scale: 0.9, named: "default" });

    expect(resolveIconSize("action")).toEqual({ scale: 0.85, named: "default" });
  });

  it("maps numeric values to SVG scale transform", () => {
    expect(resolveIconSize(0.9)).toEqual({ scale: 0.9, named: "default" });

    expect(resolveIconSize(1)).toEqual({ scale: 1, named: "default" });
  });

  it("maps named tailwind sizes without scale", () => {
    expect(resolveIconSize("sm")).toEqual({ named: "sm" });

    expect(resolveIconSize("inherit")).toEqual({ named: "inherit" });
  });

  it("defaults to scale 1 like standalone lib/icon", () => {
    expect(resolveIconSize(undefined)).toEqual({ scale: 1, named: "default" });
  });

  it("documents standalone scale factors", () => {
    expect(ICON_SIZE_SCALE.close).toBe(0.9);

    expect(ICON_SIZE_SCALE.dense).toBe(0.75);
  });
});
