"use client";

import ConnectionStatusBar from "@/components/connections/ConnectionStatusBar";
import { JiraConnectionGate } from "@/components/connections/JiraConnectionGate";
import { SetupWizardGate } from "@/components/setup-wizard/SetupWizardGate";
import { ProjectSiteCard, TaskManagerLayout } from "@/components/task-manager";
import { TaskManagerProvider } from "@/providers/task-manager/TaskManagerProvider";

export default function TaskManagerExtensionPage() {
  return (
    <TaskManagerProvider>
      <JiraConnectionGate>
        <SetupWizardGate>
          <ConnectionStatusBar />
          <ProjectSiteCard />
          <TaskManagerLayout />
        </SetupWizardGate>
      </JiraConnectionGate>
    </TaskManagerProvider>
  );
}
