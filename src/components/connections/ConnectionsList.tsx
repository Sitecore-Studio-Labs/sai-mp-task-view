'use client';

import { ConnectJiraButton } from '@/components/connections/ConnectJiraButton';
import { Card, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { System, SYSTEMS } from '@/constants/systems';
import { useJiraConnectionStatus } from '@/hooks/useJiraConnectionStatus';
import { mdiConnection } from '@mdi/js';
import { Separator } from '@/components/ui/separator';

type ConnectionCardProps = {
  system: System; // Extend as needed
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
  const button =
    system === SYSTEMS.JIRA ? (
      <ConnectJiraButton label="Connect" size="sm" />
    ) : null; // Extend as needed

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
