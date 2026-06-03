/**
 * Icon color rules aligned with standalone Jira (`develop` branch).
 *
 * - `brand`: purple `text-primary-fg` — action/brand affordances (create +, back arrow, edit link).
 * - `chrome`: no color class — inherits parent text (filters, settings, neutral ghost buttons).
 * - `muted`: explicit gray tokens via `className` (chevrons, clears in fields).
 *
 * Standalone used `@/components/ui/icon` (default `primary`) for brand icons and
 * `@/lib/icon` (scale only, inherits color) inside neutral controls.
 */
export const ICON_COLOR_SCHEME = {
  brand: "primary",
  chrome: "inherit",
} as const;

export type IconColorScheme = (typeof ICON_COLOR_SCHEME)[keyof typeof ICON_COLOR_SCHEME];
