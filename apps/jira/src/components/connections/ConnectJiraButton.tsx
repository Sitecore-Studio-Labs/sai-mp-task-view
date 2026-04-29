"use client";

import { ConnectButton, useClientOriginUrl } from "@mp/ui";

export function ConnectJiraButton() {
  const connectUrl = useClientOriginUrl("/api/auth/jira/connect");
  return (
    <ConnectButton connectUrl={connectUrl} label="Connect Jira Account" popupName="jira_connect" />
  );
}
