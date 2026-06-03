"use client";

import { ConnectionScreen as BaseConnectionScreen } from "@mp/ui";

import { ConnectJiraButton } from "./ConnectJiraButton";

export default function ConnectionScreen() {
  return <BaseConnectionScreen connected={false} connectButton={<ConnectJiraButton />} />;
}
