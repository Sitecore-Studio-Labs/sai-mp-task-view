import { useMemo } from "react";

export function useClientOriginUrl(path: string) {
  return useMemo(() => {
    const envOrigin = process.env.NEXT_PUBLIC_APP_URL;
    if (envOrigin) {
      return `${envOrigin.replace(/\/$/, "")}${path}`;
    }
    if (typeof window === "undefined") {
      return "";
    }
    return `${window.location.origin.replace(/\/$/, "")}${path}`;
  }, [path]);
}
