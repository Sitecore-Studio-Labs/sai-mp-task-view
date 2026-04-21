import type { ReactNode } from "react";

export function Feature({ capability, children }: { capability: boolean; children: ReactNode }) {
  if (!capability) return null;
  return <>{children}</>;
}
