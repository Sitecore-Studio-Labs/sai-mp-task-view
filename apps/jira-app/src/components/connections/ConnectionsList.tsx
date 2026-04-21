"use client";

import { mdiConnection } from "@mdi/js";
import { Feature, useCapability } from "@sai-mp-jira-task-view/capabilities";

import { ConnectJiraButton } from "@/components/connections/ConnectJiraButton";
import { Card, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Separator } from "@/components/ui/separator";
import { System, SYSTEMS } from "@/constants/systems";
import { useJiraConnectionStatus } from "@/hooks/useJiraConnectionStatus";

type ConnectionCardProps = {
  system: System;
};

export default function ConnectionsList() {
  const { data: status } = useJiraConnectionStatus();
  const connected = status?.connected ?? false;

  return !connected ? (
    <>
      <div className="wrapper">
        {Object.values(SYSTEMS).map((system) => (
          <ConnectionCard key={system} system={system} />
        ))}
      </div>
      <Separator className="my-4" />
    </>
  ) : null;
}

function ConnectionCard({ system }: ConnectionCardProps) {
  const label = `Connect to ${system}`;
  const capabilities = useCapability(system.toLowerCase());

  return (
    <Card elevation="none" style="outline" padding="sm">
      <CardTitle className="flex items-center gap-2">
        <Icon path={mdiConnection} />
        <span className="mr-auto">{label}</span>
        <Feature capability={Boolean(capabilities["tasks.status"])}>
          <ConnectJiraButton label="Connect" size="sm" />
        </Feature>
      </CardTitle>
    </Card>
  );
}
