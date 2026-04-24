"use client";

import { ConnectJiraButton } from "@/components/connections/ConnectJiraButton";
import { useJiraConnectionStatus } from "@/hooks/useJiraConnectionStatus";

const JIRA_LOGO = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 75 75">
    <defs>
      <clipPath id="a">
        <rect x="12.87" y="16.23" width="47.18" height="47.54" />
      </clipPath>
    </defs>

    <path
      fill="#1868db"
      d="M0 18.75C0 8.39 8.39 0 18.75 0h37.5C66.61 0 75 8.39 75 18.75v37.5C75 66.61 66.61 75 56.25 75h-37.5C8.39 75 0 66.61 0 56.25z"
    />

    <g clipPath="url(#a)" fill="#fff">
      <path d="M28.04 48.51h-4.23c-6.37 0-10.95-3.9-10.95-9.62h22.72c1.18 0 1.94.84 1.94 2.02v22.87c-5.68 0-9.49-4.6-9.49-11.01zm11.22-11.36h-4.23c-6.37 0-10.95-3.83-10.95-9.55h22.72c1.18 0 2.01.77 2.01 1.95v22.87c-5.68 0-9.56-4.6-9.56-11.01zm11.29-11.29h-4.23c-6.37 0-10.95-3.9-10.95-9.62h22.72c1.18 0 1.94.84 1.94 1.95v22.87c-5.68 0-9.49-4.6-9.49-11.01v-4.18z" />
    </g>
  </svg>
);

export default function ConnectionScreen() {
  const { data: status } = useJiraConnectionStatus();
  const connected = status?.connected ?? false;

  return !connected ? (
    <>
      <div className="wrapper flex h-full flex-col items-center justify-center gap-2 text-center">
        <div className="mb-4 size-20">{JIRA_LOGO}</div>
        <h1 className="text-lg font-bold" data-testid="connect-to-jira">
          Connect to Jira
        </h1>
        <p className="text-muted-foreground mb-4 text-sm">
          Link your Jira Account to manage issues directly from the editor sidebar.
        </p>
        <ConnectJiraButton />
      </div>
    </>
  ) : null;
}
