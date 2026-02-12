import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/axiosClient";

export const JIRA_STATUS_QUERY_KEY = ["jira", "connectionStatus"] as const;

export function useJiraConnectionStatus() {
  return useQuery({
    queryKey: JIRA_STATUS_QUERY_KEY,
    queryFn: async (): Promise<{ connected: boolean }> => {
      const res = await apiClient.get<{ connected: boolean }>("/auth/jira/status");
      return res.data;
    },
  });
}

export function useDisconnectJira() {
  const queryClient = useQueryClient();

  return async () => {
    await apiClient.post("/auth/jira/disconnect");
    queryClient.invalidateQueries({ queryKey: JIRA_STATUS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: ["jira", "projects"] });
  };
}
