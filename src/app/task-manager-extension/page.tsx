"use client";

import { TaskManagerProvider } from "@/providers/task-manager/TaskManagerProvider";
import { TaskManagerLayout } from "@/components/task-manager";
import ConnectionStatusBar from "@/components/connections/ConnectionStatusBar";
import ConnectionsList from "@/components/connections/ConnectionsList";

export default function TaskManagerExtensionPage() {
  return (
    <TaskManagerProvider>
      <ConnectionStatusBar />
      <ConnectionsList />
      <TaskManagerLayout />
    </TaskManagerProvider>
  );
}
