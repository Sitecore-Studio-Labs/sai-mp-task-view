"use client";

import ConnectionScreen from "@/components/connections/ConnectionScreen";
import ConnectionSite from "@/components/connections/ConnectionSite";
import ConnectionStatusBar from "@/components/connections/ConnectionStatusBar";
// import SetupWizard from "@/components/setup-wizard/SetupWizard";
import { TaskManagerLayout } from "@/components/task-manager";
import { TaskManagerProvider } from "@/providers/task-manager/TaskManagerProvider";

export default function TaskManagerExtensionPage() {
  return (
    <TaskManagerProvider>
      <ConnectionScreen />
      {/* <SetupWizard /> */}
      <ConnectionStatusBar />
      <ConnectionSite />
      <TaskManagerLayout />
    </TaskManagerProvider>
  );
}
