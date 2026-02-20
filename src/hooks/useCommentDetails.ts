import { apiClient } from "@/lib/axiosClient";
import { JiraComment } from "@/types/jira";
import { useQuery } from "@tanstack/react-query";

export const useCommentDetails = (issueIdOrKey: string, commentId: string) => {
  return useQuery({
    queryKey: ['jira-comment-details', issueIdOrKey, commentId],
    queryFn: async (): Promise<JiraComment> => {
      
      if (!commentId || !issueIdOrKey) {
        throw new Error('Missing commentId or issueIdOrKey');
      }

      console.log(commentId);
      console.log(issueIdOrKey);
      
      const response = await apiClient.get<JiraComment>(`/jira/comments/${commentId}?issueIdOrKey=${issueIdOrKey}`);
      return response.data;
    },
    enabled: !!issueIdOrKey && !!commentId,
  });
};