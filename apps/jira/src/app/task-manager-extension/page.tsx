"use client";

import { ConnectionSite, ConnectionStatusBar, DevSetupPanel } from "@mp/ui";

import ConnectionScreen from "@/components/connections/ConnectionScreen";
import { TaskManagerLayout } from "@/components/task-manager";
import { JiraPlatformCapabilitiesProvider } from "@/providers/JiraPlatformCapabilitiesProvider";
import { TaskManagerProvider } from "@/providers/task-manager/TaskManagerProvider";

export default function TaskManagerExtensionPage() {
  return (
    <JiraPlatformCapabilitiesProvider>
      <TaskManagerProvider>
        <ConnectionStatusBar />
        <ConnectionSite />
        <ConnectionScreen />
        <TaskManagerLayout />
        {process.env.NODE_ENV === "development" && <DevSetupPanel />}
      </TaskManagerProvider>
    </JiraPlatformCapabilitiesProvider>
  );
}
