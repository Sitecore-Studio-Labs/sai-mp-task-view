"use client";

import ConnectionScreen from "@/components/connections/ConnectionScreen";
import ConnectionSite from "@/components/connections/ConnectionSite";
import ConnectionStatusBar from "@/components/connections/ConnectionStatusBar";
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
