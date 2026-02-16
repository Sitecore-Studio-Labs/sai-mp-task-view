'use client';

import { useState, useEffect } from 'react';
import {
  useJiraConnectionStatus,
  useDisconnectJira,
} from '@/hooks/useJiraConnectionStatus';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export default function ConnectionStatusBar() {
  const { data: status, isLoading, refetch } = useJiraConnectionStatus();

  const connected = status?.connected ?? false;

  const disconnect = useDisconnectJira();
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Refetch when tab regains focus
  useEffect(() => {
    const onFocus = () => refetch();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refetch]);

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await disconnect();
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 shrink-0 rounded-full ${
              isLoading || !connected ? 'bg-gray-500' : 'bg-green-500'
            }`}
            aria-hidden
          />
          <span
            className={`text-sm font-medium ${
              isLoading || !connected ? 'text-gray-700' : ''
            }`}
          >
            {isLoading
              ? 'Checking status…'
              : connected
                ? 'Connected to Jira'
                : 'Not connected'}
          </span>
        </div>

        {!isLoading && connected && (
          <Button
            onClick={handleDisconnect}
            disabled={isDisconnecting}
            variant="link"
            size="xs"
            colorScheme="danger"
          >
            {isDisconnecting ? 'Disconnecting…' : 'Disconnect'}
          </Button>
        )}
      </div>

      <Separator />
    </div>
  );
}
