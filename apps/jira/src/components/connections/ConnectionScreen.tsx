"use client";

import { ConnectionScreen as BaseConnectionScreen } from "@mp/ui";

import { useJiraConnectionStatus } from "../../hooks/useJiraConnectionStatus";
import { ConnectJiraButton } from "./ConnectJiraButton";

export default function ConnectionScreen() {
  const { data: status } = useJiraConnectionStatus();
  return (
    <BaseConnectionScreen
      connected={status?.connected ?? false}
      connectButton={<ConnectJiraButton />}
    />
  );
}
