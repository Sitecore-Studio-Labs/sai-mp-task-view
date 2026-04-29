"use client";

import { mdiCloudOffOutline, mdiCloudOutline, mdiCloudSyncOutline } from "@mdi/js";
import { useEffect } from "react";

import SettingsPanel from "@/components/connections/SettingsPanel";
import { Separator } from "@/components/ui/separator";
import { useJiraConnectionStatus } from "@/hooks/useJiraConnectionStatus";
import { Icon } from "@/lib/icon";

export default function ConnectionStatusBar() {
  const { data: status, isLoading, refetch } = useJiraConnectionStatus();
  const connected = status?.connected ?? false;

  // Refetch when tab regains focus
  useEffect(() => {
    const onFocus = () => refetch();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refetch]);

  const statusLabel = isLoading
    ? "Checking status…"
    : connected
      ? "Connected to Jira"
      : "Not connected";

  const liveLabel = isLoading ? "Syncing" : "Live";

  const iconPath = isLoading
    ? mdiCloudSyncOutline
    : connected
      ? mdiCloudOutline
      : mdiCloudOffOutline;

  if (!connected) {
    return null;
  }

  if (!connected) {
    return null;
  }

  return (
    <>
      <div className="wrapper flex min-h-10 flex-wrap items-center gap-2">
        <div className="mr-auto flex items-center gap-1">
          <Icon path={iconPath} className="mr-1 size-5" />
          <span className="text-sm font-medium">{statusLabel}</span>
        </div>

        {connected && (
          <>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${
                  isLoading ? "bg-gray-500" : "bg-green-400"
                }`}
                aria-hidden
              />
              {liveLabel}
            </div>

            <SettingsPanel />
          </>
        )}
      </div>

      <Separator className="mb-4" />
    </>
  );
}
