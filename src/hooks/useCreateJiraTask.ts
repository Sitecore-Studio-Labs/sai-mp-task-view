import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import type { JiraTask } from '@/types/jira';
import type { CreateJiraTaskPayload } from '@/types/jira';
import { apiClient } from '@/lib/axiosClient';
import {
  JIRA_PROJECTS_QUERY_KEY,
} from '@/hooks/useJiraConnectionStatus';
import { JIRA_PRIORITIES_QUERY_KEY } from '@/hooks/useJiraPriorities';

export function useCreateJiraTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateJiraTaskPayload): Promise<JiraTask> => {
      try {
        const res = await apiClient.post<JiraTask>('/jira/tasks', payload);
        return res.data;
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.data && typeof err.response.data === 'object' && 'error' in err.response.data && typeof (err.response.data as { error: unknown }).error === 'string') {
          throw new Error((err.response.data as { error: string }).error);
        }
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: JIRA_PROJECTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: JIRA_PRIORITIES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['jira', 'issue-types'] });
      queryClient.invalidateQueries({ queryKey: ['jira', 'assignees'] });
      queryClient.invalidateQueries({ queryKey: ['jira', 'boardIssues'] });
    },
  });
}
