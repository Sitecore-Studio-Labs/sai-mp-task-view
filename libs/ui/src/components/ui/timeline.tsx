import { cn } from "@mp/shared";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

const timelineRootVariants = cva("flex flex-col gap-0", {
  variants: {
    size: {
      sm: "[&_[data-slot=timeline-content]]:pb-3",
      md: "[&_[data-slot=timeline-content]]:pb-4",
      lg: "[&_[data-slot=timeline-content]]:pb-6",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

interface TimelineRootProps
  extends React.ComponentProps<"div">, VariantProps<typeof timelineRootVariants> {}

function TimelineRoot({ className, size, ...props }: TimelineRootProps) {
  return (
    <div
      data-slot="timeline-root"
      className={cn(timelineRootVariants({ size }), className)}
      {...props}
    />
  );
}

// Timeline Item

type TimelineItemProps = React.ComponentProps<"div">;

function TimelineItem({ className, ...props }: TimelineItemProps) {
  return (
    <div data-slot="timeline-item" className={cn("relative flex gap-3", className)} {...props} />
  );
}

// Timeline Separator

type TimelineSeparatorProps = React.ComponentProps<"div">;

function TimelineSeparator({ className, ...props }: TimelineSeparatorProps) {
  return (
    <div
      data-slot="timeline-separator"
      className={cn("flex flex-col items-center gap-0", className)}
      {...props}
    />
  );
}

// Timeline Indicator

const timelineIndicatorVariants = cva(
  "relative z-10 flex shrink-0 items-center justify-center rounded-full",
  {
    variants: {
      variant: {
        solid: "bg-foreground text-background",
        outline: "border-1 border-border bg-background",
        subtle: "bg-muted",
        plain: "bg-background",
      },
      size: {
        sm: "size-5",
        md: "size-8",
        lg: "size-10",
      },
    },
    defaultVariants: {
      variant: "solid",
      size: "sm",
    },
  },
);

interface TimelineIndicatorProps
  extends React.ComponentProps<"div">, VariantProps<typeof timelineIndicatorVariants> {}

function TimelineIndicator({ className, variant, size, ...props }: TimelineIndicatorProps) {
  return (
    <div
      data-slot="timeline-indicator"
      className={cn(timelineIndicatorVariants({ variant, size }), className)}
      {...props}
    />
  );
}

// Timeline Connector

const timelineConnectorVariants = cva("flex-1 min-h-4", {
  variants: {
    variant: {
      solid: "w-0.25 bg-border",
      dashed: "w-0 border-l-2 border-dashed border-border",
      dotted: "w-0 border-l-2 border-dotted border-border",
    },
  },
  defaultVariants: {
    variant: "solid",
  },
});

interface TimelineConnectorProps
  extends React.ComponentProps<"div">, VariantProps<typeof timelineConnectorVariants> {}

function TimelineConnector({ className, variant, ...props }: TimelineConnectorProps) {
  return (
    <div
      data-slot="timeline-connector"
      className={cn(timelineConnectorVariants({ variant }), className)}
      {...props}
    />
  );
}

//  Timeline Content

type TimelineContentProps = React.ComponentProps<"div">;

function TimelineContent({ className, ...props }: TimelineContentProps) {
  return (
    <div data-slot="timeline-content" className={cn("flex flex-col gap-1", className)} {...props} />
  );
}

// Timeline Title

type TimelineTitleProps = React.ComponentProps<"p">;

function TimelineTitle({ className, ...props }: TimelineTitleProps) {
  return (
    <p
      data-slot="timeline-title"
      className={cn("text-foreground text-base font-medium", className)}
      {...props}
    />
  );
}

// Timeline Description

type TimelineDescriptionProps = React.ComponentProps<"p">;

function TimelineDescription({ className, ...props }: TimelineDescriptionProps) {
  return (
    <p
      data-slot="timeline-description"
      className={cn("text-muted-foreground text-xs", className)}
      {...props}
    />
  );
}

export {
  TimelineConnector,
  TimelineContent,
  TimelineDescription,
  TimelineIndicator,
  TimelineItem,
  TimelineRoot,
  TimelineSeparator,
  TimelineTitle,
};

// Compound component export
export const Timeline = {
  Root: TimelineRoot,
  Item: TimelineItem,
  Separator: TimelineSeparator,
  Indicator: TimelineIndicator,
  Connector: TimelineConnector,
  Content: TimelineContent,
  Title: TimelineTitle,
  Description: TimelineDescription,
};
