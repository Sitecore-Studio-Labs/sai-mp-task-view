"use client";

import { usePageTracking, useWebVitals } from "@mp/observability";
import {
  ActiveScopeCard,
  ConnectionStatusBar,
  DevSetupPanel,
  PlatformSetupWizardGate,
} from "@mp/ui";

import { JiraConnectionGate } from "@/components/connections/JiraConnectionGate";
import { JiraSettingsPanel } from "@/components/connections/JiraSettingsPanel";
import { TaskManagerLayout } from "@/components/task-manager";
import { JiraPlatformCapabilitiesProvider } from "@/providers/JiraPlatformCapabilitiesProvider";
import { TaskManagerProvider } from "@/providers/task-manager/TaskManagerProvider";

export default function TaskManagerExtensionPage() {
  usePageTracking("task-manager-extension");
  useWebVitals("jira");
  return (
    <JiraPlatformCapabilitiesProvider>
      <TaskManagerProvider>
        <JiraConnectionGate>
          <PlatformSetupWizardGate>
            <ConnectionStatusBar settingsPanel={<JiraSettingsPanel />} />
            <ActiveScopeCard />
            <TaskManagerLayout />
          </PlatformSetupWizardGate>
        </JiraConnectionGate>
        {process.env.NODE_ENV === "development" && <DevSetupPanel />}
      </TaskManagerProvider>
    </JiraPlatformCapabilitiesProvider>
  );
}
