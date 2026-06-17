"use client";

import { ConnectButton, useClientOriginUrl } from "@mp/ui";

export function ConnectWrikeButton() {
  const connectUrl = useClientOriginUrl("/api/auth/wrike/connect");
  return (
    <ConnectButton
      connectUrl={connectUrl}
      label="Connect Wrike Account"
      popupName="wrike_connect"
      testId="connect-wrike-account"
    />
  );
}
