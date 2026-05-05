import { cn } from "@/lib/utils";

import { Spinner } from "./spinner";

type FullScreenLoadingProps = {
  className?: string;
};

/**
 * Centered full-viewport loading state (e.g. while connection or setup data is resolving).
 */
export function FullScreenLoading({ className }: FullScreenLoadingProps) {
  return (
    <div
      className={cn("wrapper flex min-h-screen flex-col items-center justify-center", className)}
    >
      <Spinner className="text-primary size-8" />
    </div>
  );
}
