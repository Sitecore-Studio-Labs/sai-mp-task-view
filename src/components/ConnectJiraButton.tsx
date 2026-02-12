"use client";

import { useState, useEffect } from "react";

type ConnectJiraButtonProps = {
  variant?: "primary" | "secondary";
  label?: string;
};

const POPUP_NAME = "jira_connect";
const POPUP_SPEC = "width=600,height=700,scrollbars=yes,resizable=yes";

/**
 * Tries to open the Jira OAuth flow in a popup (must be triggered by user click).
 * If the host iframe has allow-popups (and ideally allow-popups-to-escape-sandbox),
 * the popup opens and OAuth runs there; when done, the popup posts a message and
 * closes. If the popup is blocked, we show the copy-link fallback.
 */
export function ConnectJiraButton({ variant = "primary", label = "Connect Jira" }: ConnectJiraButtonProps) {
  const [connectUrl, setConnectUrl] = useState<string>("");
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const origin = (process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin).replace(/\/$/, "");
    setConnectUrl(origin ? `${origin}/api/auth/jira/connect` : "");
  }, []);

  const handleCopy = async () => {
    if (!connectUrl) return;
    await navigator.clipboard.writeText(connectUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClick = () => {
    if (!connectUrl) return;
    setPopupBlocked(false);

    const popup = window.open(connectUrl, POPUP_NAME, POPUP_SPEC);

    if (!popup || popup.closed) {
      setPopupBlocked(true);
      return;
    }
  };

  if (!connectUrl) {
    return <span className="text-sm text-slate-500 dark:text-slate-400">Loading…</span>;
  }

  const isSecondary = variant === "secondary";

  if (popupBlocked) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Popup was blocked. Open this link in a new tab to connect:
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <code className="max-w-full truncate rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {connectUrl}
          </code>
          <button
            type="button"
            onClick={handleCopy}
            className={
              isSecondary
                ? "rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                : "rounded-lg bg-[#0052CC] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#0747A6]"
            }
          >
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      </div>
    );
  }

  const className = isSecondary
    ? "inline-flex rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
    : "inline-flex rounded-lg bg-[#0052CC] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:bg-[#0747A6] disabled:opacity-70";

  return (
    <button type="button" onClick={handleClick} className={className}>
      {label}
    </button>
  );
}
