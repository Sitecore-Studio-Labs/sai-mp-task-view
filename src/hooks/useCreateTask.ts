import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

import { apiClient } from "@/lib/axiosClient";
import type { PlatformCreateTaskPayload, PlatformTask } from "@/types/platform-entities";

import { PLATFORM_ASSIGNEES_QUERY_KEY } from "./useAssignees";
import { PLATFORM_ISSUE_TYPES_QUERY_KEY } from "./useIssueTypes";
import { PLATFORM_PRIORITIES_QUERY_KEY } from "./usePriorities";
import { PLATFORM_PROJECTS_QUERY_KEY } from "./useProjects";
import { PLATFORM_TASKS_QUERY_KEY } from "./useProjectTasks";

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: PlatformCreateTaskPayload): Promise<PlatformTask> => {
      try {
        const res = await apiClient.post<PlatformTask>("/platform/tasks", payload);
        return res.data;
      } catch (err) {
        if (
          axios.isAxiosError(err) &&
          err.response?.data &&
          typeof err.response.data === "object" &&
          "error" in err.response.data &&
          typeof (err.response.data as { error: unknown }).error === "string"
        ) {
          throw new Error((err.response.data as { error: string }).error);
        }
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PLATFORM_PROJECTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PLATFORM_PRIORITIES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PLATFORM_ISSUE_TYPES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PLATFORM_ASSIGNEES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PLATFORM_TASKS_QUERY_KEY });
    },
  });
}
