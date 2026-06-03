import { cn } from "@mp/shared";

import { Spinner } from "./spinner";

type FullScreenLoadingProps = {
  className?: string;
};

export function FullScreenLoading({ className }: FullScreenLoadingProps) {
  return (
    <div
      className={cn("wrapper flex min-h-screen flex-col items-center justify-center", className)}
    >
      <Spinner className="text-primary size-8" />
    </div>
  );
}
