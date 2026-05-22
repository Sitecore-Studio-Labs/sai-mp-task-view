"use client";

import { usePageTracking } from "@mp/observability";
import {
  ConnectionStatusBar,
  DevSetupPanel,
  PlatformSetupWizardGate,
  ProjectSiteCard,
} from "@mp/ui";

import { JiraConnectionGate } from "@/components/connections/JiraConnectionGate";
import { JiraSettingsPanel } from "@/components/connections/JiraSettingsPanel";
import { TaskManagerLayout } from "@/components/task-manager";
import { JiraPlatformCapabilitiesProvider } from "@/providers/JiraPlatformCapabilitiesProvider";
import { TaskManagerProvider } from "@/providers/task-manager/TaskManagerProvider";

export default function TaskManagerExtensionPage() {
  usePageTracking("task-manager-extension");
  return (
    <JiraPlatformCapabilitiesProvider>
      <TaskManagerProvider>
        <JiraConnectionGate>
          <PlatformSetupWizardGate>
            <ConnectionStatusBar settingsPanel={<JiraSettingsPanel />} />
            <ProjectSiteCard />
            <TaskManagerLayout />
          </PlatformSetupWizardGate>
        </JiraConnectionGate>
        {process.env.NODE_ENV === "development" && <DevSetupPanel />}
      </TaskManagerProvider>
    </JiraPlatformCapabilitiesProvider>
  );
}
