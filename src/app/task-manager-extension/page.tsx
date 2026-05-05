"use client";

import ConnectionSite from "@/components/connections/ConnectionSite";
import ConnectionStatusBar from "@/components/connections/ConnectionStatusBar";
import { JiraConnectionGate } from "@/components/connections/JiraConnectionGate";
import { SetupWizardGate } from "@/components/setup-wizard/SetupWizardGate";
import { TaskManagerLayout } from "@/components/task-manager";
import { TaskManagerProvider } from "@/providers/task-manager/TaskManagerProvider";

export default function TaskManagerExtensionPage() {
  return (
    <TaskManagerProvider>
      <JiraConnectionGate>
        <SetupWizardGate>
          <ConnectionStatusBar />
          <ConnectionSite />
          <TaskManagerLayout />
        </SetupWizardGate>
      </JiraConnectionGate>
    </TaskManagerProvider>
  );
}
