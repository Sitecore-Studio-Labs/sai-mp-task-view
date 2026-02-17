'use client';

import { useState, useEffect } from 'react';
import {
  useJiraConnectionStatus,
  useDisconnectJira,
} from '@/hooks/useJiraConnectionStatus';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Icon } from '@/lib/icon';
import {
  mdiCloudOffOutline,
  mdiCloudOutline,
  mdiCloudSyncOutline,
  mdiDotsVertical,
  mdiLinkOff,
} from '@mdi/js';

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

  const isBusy = isLoading || isDisconnecting;

  const statusLabel = isLoading
    ? 'Checking status…'
    : connected
      ? 'Connected to Jira'
      : 'Not connected';

  const liveLabel = isLoading
    ? 'Syncing'
    : isDisconnecting
      ? 'Disconnecting'
      : 'Live';

  const iconPath = isBusy
    ? mdiCloudSyncOutline
    : connected
      ? mdiCloudOutline
      : mdiCloudOffOutline;

  return (
    <div className="space-y-2">
      <div className="wrapper flex flex-wrap items-center gap-2 min-h-10">
        <div className="flex items-center gap-1 mr-auto">
          <Icon path={iconPath} className="size-5 mr-1" />
          <span className="text-sm font-medium">{statusLabel}</span>
        </div>

        {connected && (
          <>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${
                  isBusy ? 'bg-gray-500' : 'bg-green-400'
                }`}
                aria-hidden
              />
              {liveLabel}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  colorScheme="neutral"
                  size="icon"
                  aria-label="Connection options"
                >
                  <Icon path={mdiDotsVertical} size={0.8} />
                  <span className="sr-only">Connection options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={handleDisconnect}
                    disabled={isDisconnecting || isLoading}
                  >
                    <Icon path={mdiLinkOff} size={1.5} />
                    Disconnect
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>

      <Separator />
    </div>
  );
}
