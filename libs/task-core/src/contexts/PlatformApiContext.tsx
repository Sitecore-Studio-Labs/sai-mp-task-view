"use client";

import type { AxiosInstance } from "axios";
import { createContext, type ReactNode, useContext } from "react";

import type { PlatformApiContextValue, PlatformApiPaths } from "../types/platform-api";

const PlatformApiContext = createContext<PlatformApiContextValue | null>(null);

export function usePlatformApiPaths(): PlatformApiContextValue {
  const ctx = useContext(PlatformApiContext);
  if (!ctx) throw new Error("usePlatformApiPaths must be used within PlatformApiProvider");
  return ctx;
}

export function PlatformApiProvider({
  paths,
  client,
  children,
}: {
  paths: PlatformApiPaths;
  client: AxiosInstance;
  children: ReactNode;
}) {
  return (
    <PlatformApiContext.Provider value={{ paths, client }}>{children}</PlatformApiContext.Provider>
  );
}
