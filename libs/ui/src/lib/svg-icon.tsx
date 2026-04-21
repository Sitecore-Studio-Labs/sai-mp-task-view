import type { SVGProps } from "react";

type SvgIconProps = SVGProps<SVGSVGElement> & {
  path: string;
  title?: string;
  size?: number | string;
  className?: string;
  fill?: string;
};

/** Low-level SVG path icon (MDI path strings, etc.). */
export function SvgIcon({
  path,
  title,
  size = 1,
  className,
  fill = "currentColor",
  ...rest
}: SvgIconProps) {
  return (
    <svg
      transform={`scale(${size})`}
      viewBox="0 0 24 24"
      aria-label={title}
      className={className}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      <path d={path} fill={fill} />
    </svg>
  );
}
