/**

 * Scale factors from the standalone app (`src/lib/icon.tsx`).

 * Numeric `size` and semantic tokens render `transform="scale(n)"` on the SVG;

 * the parent (e.g. `Button` `[&_svg]`) supplies the box size — not rem width/height.

 */

export const ICON_SIZE_SCALE = {
  /** Settings cog, dialog/sheet close, carousel arrows, calendar nav, sidebar menu. */

  close: 0.9,

  /** Edit/save pencil, mapping delete, defaults picker toggle. */

  action: 0.85,

  /** Wizard web icon, edit affordances, checkbox/radio marks. */

  compact: 0.8,

  /** Filter clear controls. */

  dense: 0.75,

  /** Dropdown radio indicator, filter badge remove. */

  micro: 0.7,

  /** Pagination ellipsis. */

  tiny: 0.6,

  /** Project site swap control (full scale in button). */

  swap: 1,
} as const;

/** @deprecated Use `ICON_SIZE_SCALE` — values are scale factors, not rem. */

export const ICON_SIZE_REM = ICON_SIZE_SCALE;

export type IconSizeScale = keyof typeof ICON_SIZE_SCALE;

/** @deprecated Use `IconSizeScale`. */

export type IconSizeRem = IconSizeScale;

export const ICON_NAMED_SIZE = {
  /** Inherit box size from parent `Button` `[&_svg]` rules. */

  inherit: "inherit",

  default: "default",

  sm: "sm",

  md: "md",

  lg: "lg",

  xl: "xl",

  xxl: "xxl",
} as const;

export type IconNamedSize = keyof typeof ICON_NAMED_SIZE;

export type IconSize = IconNamedSize | IconSizeScale | number;

const SIZE_CLASS_PATTERN = /\b(size-|h-|w-|min-|max-)/;

export function classNameIncludesSvgDimensions(className?: string): boolean {
  return Boolean(className && SIZE_CLASS_PATTERN.test(className));
}

export function resolveIconSize(size: IconSize | undefined): {
  scale?: number;

  named: IconNamedSize;
} {
  if (size === undefined) {
    return { scale: 1, named: "default" };
  }

  if (typeof size === "number") {
    return { scale: size, named: "default" };
  }

  if (size in ICON_SIZE_SCALE) {
    return { scale: ICON_SIZE_SCALE[size as IconSizeScale], named: "default" };
  }

  return { named: size as IconNamedSize };
}
