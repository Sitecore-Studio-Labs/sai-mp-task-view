'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { JIRA_STATUS_QUERY_KEY } from '@/hooks/useJiraConnectionStatus';
import { toast } from 'sonner';
import ProjectsSection from '@/components/projects/ProjectsSection';
import ConnectionsList from '@/components/connections/ConnectionsList';
import ConnectionStatusBar from '@/components/connections/ConnectionStatusBar';

export default function TaskManagerExtensionPage() {
  const queryClient = useQueryClient();

  // After OAuth callback we land with ?jira=connected. If we're in a popup, tell opener and close.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('jira') !== 'connected') return;

    if (window.opener) {
      const origin = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
      window.opener.postMessage(
        { type: 'JIRA_CONNECTED' },
        origin.replace(/\/$/, ''),
      );
      window.close();
      return;
    }

    queryClient.invalidateQueries({ queryKey: JIRA_STATUS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: ['jira', 'projects'] });
    window.history.replaceState({}, '', window.location.pathname);
    toast.success('Jira connected successfully.');
  }, [queryClient]);

  // Listen for popup finishing OAuth so we can refetch without user switching tabs
  useEffect(() => {
    const allowedOrigin = (
      process.env.NEXT_PUBLIC_APP_URL ??
      (typeof window !== 'undefined' ? window.location.origin : '')
    ).replace(/\/$/, '');
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== allowedOrigin) return;
      if (event.data?.type === 'JIRA_CONNECTED') {
        queryClient.invalidateQueries({ queryKey: JIRA_STATUS_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: ['jira', 'projects'] });

        toast.success('Jira connected successfully.');
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [queryClient]);

  return (
    <>
      <ConnectionStatusBar />
      <div className="wrapper">
        <ConnectionsList />
        <ProjectsSection />
      </div>
    </>
  );
}
