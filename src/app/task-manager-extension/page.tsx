"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ConnectJiraButton } from "@/components/ConnectJiraButton";
import { useJiraProjects } from "@/hooks/useJiraProjects";
import {
  useJiraConnectionStatus,
  useDisconnectJira,
  JIRA_STATUS_QUERY_KEY,
} from "@/hooks/useJiraConnectionStatus";
import type { JiraIssue, JiraProject } from "@/types/jira";
import { useBoardIssues } from "@/hooks/useProjectIssues";

export default function TaskManagerExtensionPage() {
  const queryClient = useQueryClient();
  const {
    data: status,
    isLoading: isStatusLoading,
    refetch: refetchStatus,
  } = useJiraConnectionStatus();
  const connected = status?.connected ?? false;

  const {
    data: projects,
    isLoading: isProjectsLoading,
    isError,
    refetch,
  } = useJiraProjects();
  const [selectedProjectKey, setSelectedProjectKey] = useState<string | null>(
    null,
  );

  // const {
  //   data,
  //   isLoading: issuesLoading,
  //   fetchNextPage,
  //   hasNextPage,
  // } = useBoardIssues(selectedProjectKey);

  // const issues = data?.pages.flatMap((page) => page.issues) ?? [];

  const hasProjects = Array.isArray(projects) && projects.length > 0;
  const disconnect = useDisconnectJira();
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [showConnectedBanner, setShowConnectedBanner] = useState(false);

  // After OAuth callback we land with ?jira=connected. If we're in a popup, tell opener and close.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("jira") !== "connected") return;

    if (window.opener) {
      const origin = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
      window.opener.postMessage(
        { type: "JIRA_CONNECTED" },
        origin.replace(/\/$/, ""),
      );
      window.close();
      return;
    }

    queryClient.invalidateQueries({ queryKey: JIRA_STATUS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: ["jira", "projects"] });
    window.history.replaceState({}, "", window.location.pathname);
    setShowConnectedBanner(true);
    const t = setTimeout(() => setShowConnectedBanner(false), 5000);
    return () => clearTimeout(t);
  }, [queryClient]);

  // Listen for popup finishing OAuth so we can refetch without user switching tabs
  useEffect(() => {
    const allowedOrigin = (
      process.env.NEXT_PUBLIC_APP_URL ??
      (typeof window !== "undefined" ? window.location.origin : "")
    ).replace(/\/$/, "");
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== allowedOrigin) return;
      if (event.data?.type === "JIRA_CONNECTED") {
        queryClient.invalidateQueries({ queryKey: JIRA_STATUS_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: ["jira", "projects"] });
        setShowConnectedBanner(true);
        setTimeout(() => setShowConnectedBanner(false), 5000);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [queryClient]);

  // When user returns to this tab, refetch connection status
  useEffect(() => {
    const onFocus = () => refetchStatus();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refetchStatus]);

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await disconnect();
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {showConnectedBanner && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
          Jira connected successfully.
        </div>
      )}

      {/* Connection status bar – always visible */}
      <section className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/50">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {isStatusLoading ? (
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Checking status…
              </span>
            ) : (
              <>
                <span
                  className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${connected ? "bg-emerald-500" : "bg-slate-400"}`}
                  aria-hidden
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {connected ? "Connected to Jira" : "Not connected"}
                </span>
              </>
            )}
          </div>
          <div>
            {!isStatusLoading &&
              (connected ? (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={isDisconnecting}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  {isDisconnecting ? "Disconnecting…" : "Disconnect"}
                </button>
              ) : (
                <ConnectJiraButton />
              ))}
          </div>
        </div>
      </section>

      {/* Projects section */}
      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Jira projects
        </h2>

        <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/50">
          {isProjectsLoading && (
            <div className="flex items-center gap-3 px-4 py-8 text-slate-500 dark:text-slate-400">
              <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600 dark:border-slate-600 dark:border-t-slate-400" />
              <span className="text-sm">Loading projects…</span>
            </div>
          )}

          {isError && (
            <div className="px-4 py-6">
              <p className="text-sm text-red-600 dark:text-red-400">
                Could not load projects. Check your connection and try again.
              </p>
              <button
                type="button"
                onClick={() => refetch()}
                className="mt-3 text-sm font-medium text-slate-600 underline hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
              >
                Retry
              </button>
            </div>
          )}

          {!isProjectsLoading && !isError && !hasProjects && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {connected
                  ? "No projects in your Jira account, or your account has no access yet."
                  : "Connect Jira above to see your projects here."}
              </p>
            </div>
          )}

          {!isProjectsLoading && !isError && hasProjects && (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700">
              {projects.map((project: JiraProject) => (
                <li
                  onClick={() => setSelectedProjectKey(project.key)}
                  key={project.id}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <span className="min-w-16 rounded bg-slate-100 px-2 py-1 text-center font-mono text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                    {project.key}
                  </span>
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    {project.name}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {/* {issuesLoading && <p>Loading...</p>}

          {issues.map((issue: JiraIssue) => (
            <div key={issue.id} className="p-2 border-b">
              <strong>{issue.key}</strong> - {issue.fields.summary}
            </div>
          ))}

          {hasNextPage && (
            <button
              onClick={() => fetchNextPage()}
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded"
            >
              Load more
            </button>
          )} */}
        </div>
      </section>
    </div>
  );
}
