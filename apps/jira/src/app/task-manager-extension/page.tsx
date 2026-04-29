"use client";

import { ConnectionSite, ConnectionStatusBar } from "@mp/ui";

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
      </TaskManagerProvider>
    </JiraPlatformCapabilitiesProvider>
  );
}
