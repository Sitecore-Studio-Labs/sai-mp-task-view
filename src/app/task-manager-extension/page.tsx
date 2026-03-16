"use client";

import ConnectionSite from "@/components/connections/ConnectionSite";
import ConnectionsList from "@/components/connections/ConnectionsList";
import ConnectionStatusBar from "@/components/connections/ConnectionStatusBar";
import { TaskManagerLayout } from "@/components/task-manager";
import { TaskManagerProvider } from "@/providers/task-manager/TaskManagerProvider";

export default function TaskManagerExtensionPage() {
  return (
    <TaskManagerProvider>
      <ConnectionStatusBar />
      <ConnectionSite />
      <ConnectionsList />
      <TaskManagerLayout />
    </TaskManagerProvider>
  );
}
