"use client";

import { ConnectionScreen as BaseConnectionScreen, usePlatformConnectionStatus } from "@mp/ui";

import { ConnectWrikeButton } from "./ConnectWrikeButton";

export default function ConnectionScreen() {
  const { data: status } = usePlatformConnectionStatus();
  return (
    <BaseConnectionScreen
      connected={status?.connected ?? false}
      connectButton={<ConnectWrikeButton />}
    />
  );
}
