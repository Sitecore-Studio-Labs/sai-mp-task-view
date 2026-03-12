"use client";

import { TaskManagerProvider } from "@/providers/task-manager/TaskManagerProvider";
import { TaskManagerLayout } from "@/components/task-manager";
import ConnectionStatusBar from "@/components/connections/ConnectionStatusBar";
import ConnectionsList from "@/components/connections/ConnectionsList";
import ConnectionSite from "@/components/connections/ConnectionSite";

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
