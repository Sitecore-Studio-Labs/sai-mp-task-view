'use client';

import {
  JIRA_PROJECTS_QUERY_KEY,
  JIRA_STATUS_QUERY_KEY,
} from '@/hooks/useJiraConnectionStatus';
import ConnectionsList from '@/components/connections/ConnectionsList';
import ConnectionStatusBar from '@/components/connections/ConnectionStatusBar';
import { useOAuthPopupHandler } from '@/hooks/useOAuthPopupHandler';
import { SYSTEMS } from '@/constants/systems';
import TaskBoard from '@/components/task-board/TaskBoard';

export default function TaskManagerExtensionPage() {
  useOAuthPopupHandler({
    platform: SYSTEMS.JIRA,
    invalidateKeys: [JIRA_STATUS_QUERY_KEY, JIRA_PROJECTS_QUERY_KEY],
    successMessage: 'Jira connected successfully.',
  });

  return (
    <>
      <ConnectionStatusBar />
      <ConnectionsList />
      <TaskBoard />
    </>
  );
}
