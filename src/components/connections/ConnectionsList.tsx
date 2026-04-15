"use client";

import { mdiConnection } from "@mdi/js";

import { ConnectPlatformButton } from "@/components/connections/ConnectPlatformButton";
import { Card, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Separator } from "@/components/ui/separator";
import { System, SYSTEMS } from "@/constants/systems";
import { useJiraConnectionStatus } from "@/hooks/useJiraConnectionStatus";
import type { PlatformType } from "@/types/platform-entities";

type ConnectionCardProps = {
  system: System;
};

export default function ConnectionsList() {
  const { data: status } = useJiraConnectionStatus();
  const connected = status?.connected ?? false;

  return !connected ? (
    <>
      <div className="wrapper space-y-3">
        {Object.values(SYSTEMS).map((system) => (
          <ConnectionCard key={system} system={system} />
        ))}
      </div>
      <Separator className="my-4" />
    </>
  ) : null;
}

const SYSTEM_TO_PLATFORM: Record<System, PlatformType> = {
  [SYSTEMS.JIRA]: "jira",
  [SYSTEMS.WRIKE]: "wrike",
};

function ConnectionCard({ system }: ConnectionCardProps) {
  const label = `Connect to ${system}`;
  const platform = SYSTEM_TO_PLATFORM[system];
  const button = platform ? (
    <ConnectPlatformButton platform={platform} label="Connect" size="sm" />
  ) : null;

  return (
    <Card elevation="none" style="outline" padding="sm">
      <CardTitle className="flex items-center gap-2">
        <Icon path={mdiConnection} />
        <span className="mr-auto">{label}</span>
        {button}
      </CardTitle>
    </Card>
  );
}
