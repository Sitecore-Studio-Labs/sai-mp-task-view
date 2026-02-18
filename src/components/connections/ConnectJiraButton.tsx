'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import useClientOriginUrl from '@/hooks/useClientOriginUrl';

type ConnectJiraButtonProps = {
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  label?: string;
  size?: 'default' | 'xs' | 'sm' | 'lg';
};

const POPUP_NAME = 'jira_connect';
const POPUP_SPEC = 'width=600,height=700,scrollbars=yes,resizable=yes';

/**
 * Tries to open the Jira OAuth flow in a popup (must be triggered by user click).
 * If the host iframe has allow-popups (and ideally allow-popups-to-escape-sandbox),
 * the popup opens and OAuth runs there; when done, the popup posts a message and
 * closes. If the popup is blocked, we show the copy-link fallback.
 */
export function ConnectJiraButton({
  variant = 'default',
  label = 'Connect Jira',
  size = 'default',
}: ConnectJiraButtonProps) {
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [copied, setCopied] = useState(false);

  const connectUrl = useClientOriginUrl('/api/auth/jira/connect');

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
    return <span className="text-sm text-gray-500">Loading…</span>;
  }

  if (popupBlocked) {
    return (
      <AlertDialog open={popupBlocked} onOpenChange={setPopupBlocked}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Popup Blocked</AlertDialogTitle>
            <AlertDialogDescription>
              Open this link in a new tab to connect:
            </AlertDialogDescription>
          </AlertDialogHeader>

          <code className="truncate block max-w-full rounded border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs text-gray-700">
            {connectUrl}
          </code>

          <AlertDialogFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPopupBlocked(false)}
            >
              Close
            </Button>
            <Button
              onClick={handleCopy}
              size="sm"
              aria-label={copied ? 'Link copied' : 'Copy connection link'}
            >
              {copied ? 'Copied' : 'Copy link'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <Button onClick={handleClick} variant={variant} size={size}>
      {label}
    </Button>
  );
}
