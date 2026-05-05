"use client";

import { mdiLinkVariant } from "@mdi/js";
import { useState } from "react";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Button } from "../ui/button";
import { Icon } from "../ui/icon";

interface ConnectButtonProps {
  /** Full connect URL (e.g. from useClientOriginUrl("/api/auth/jira/connect")). */
  connectUrl: string;
  /** Label on the button, defaults to "Connect Account". */
  label?: string;
  popupName?: string;
}

const POPUP_SPEC = "width=600,height=700,scrollbars=yes,resizable=yes";

/**
 * Platform-agnostic OAuth connect button. Opens the connect URL in a popup.
 * Falls back to a copy-link dialog if the popup is blocked (common inside iframes).
 */
export function ConnectButton({
  connectUrl,
  label = "Connect Account",
  popupName = "platform_connect",
}: ConnectButtonProps) {
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(connectUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = connectUrl;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Clipboard blocked (e.g. iframe permissions policy); URL remains visible above.
      }
    }
  };

  const handleClick = () => {
    setPopupBlocked(false);
    const popup = window.open(connectUrl, popupName, POPUP_SPEC);
    if (!popup || popup.closed) setPopupBlocked(true);
  };

  if (!connectUrl) {
    return <span className="text-sm text-gray-500">Loading…</span>;
  }

  if (popupBlocked) {
    return (
      <AlertDialog open={popupBlocked} onOpenChange={setPopupBlocked}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Popup Blocked</AlertDialogTitle>
            <AlertDialogDescription>Open this link in a new tab to connect:</AlertDialogDescription>
          </AlertDialogHeader>
          <code className="block max-w-full truncate rounded border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs text-gray-700">
            {connectUrl}
          </code>
          <AlertDialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setPopupBlocked(false)}>
              Close
            </Button>
            <Button
              size="sm"
              onClick={handleCopy}
              aria-label={copied ? "Link copied" : "Copy connection link"}
            >
              {copied ? "Copied" : "Copy link"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <Button data-testid="connect-platform-account" onClick={handleClick} className="w-full">
      <Icon path={mdiLinkVariant} className="mr-2" />
      {label}
    </Button>
  );
}
