"use client";

import {
  ActiveScopeCard,
  ConnectionStatusBar,
  DevSetupPanel,
  PlatformSetupWizardGate,
} from "@mp/ui";

import { WrikeConnectionGate } from "@/components/connections/WrikeConnectionGate";
import { WrikeSettingsPanel } from "@/components/connections/WrikeSettingsPanel";
import { TaskManagerLayout } from "@/components/task-manager/TaskManagerLayout";
import { TaskManagerProvider } from "@/providers/task-manager/TaskManagerProvider";
import { WrikePlatformCapabilitiesProvider } from "@/providers/WrikePlatformCapabilitiesProvider";

export default function TaskManagerExtensionPage() {
  return (
    <WrikePlatformCapabilitiesProvider>
      <TaskManagerProvider>
        <WrikeConnectionGate>
          <PlatformSetupWizardGate>
            <ConnectionStatusBar settingsPanel={<WrikeSettingsPanel />} />
            <ActiveScopeCard />
            <TaskManagerLayout />
          </PlatformSetupWizardGate>
        </WrikeConnectionGate>
        {process.env.NODE_ENV === "development" && <DevSetupPanel />}
      </TaskManagerProvider>
    </WrikePlatformCapabilitiesProvider>
  );
}
