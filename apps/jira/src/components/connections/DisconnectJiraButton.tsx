"use client";

import { useTaskManager } from "@mp/task-core";
import { DisconnectButton } from "@mp/ui";

import { useDisconnectJira } from "@/hooks/useJiraConnectionStatus";

export function DisconnectJiraButton() {
  const { setSelectedSiteId, setSelectedProjectKey } = useTaskManager();
  const disconnect = useDisconnectJira();

  const handleDisconnect = async () => {
    await disconnect.mutateAsync();
    setSelectedSiteId(null);
    setSelectedProjectKey(null);
  };

  return <DisconnectButton onDisconnect={handleDisconnect} />;
}
