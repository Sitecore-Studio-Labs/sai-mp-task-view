"use client";

import { EditTaskView, TaskDetailsContainer as GenericTaskDetailsContainer } from "@mp/ui";

import { JiraEditTaskProvider } from "../../providers/edit-task/JiraEditTaskProvider";
import type { JiraIssue } from "../../types/jira";

export function TaskDetailsContainer() {
  return (
    <GenericTaskDetailsContainer
      editProviderWrapper={({ projectId, taskKey, task, children }) => (
        <JiraEditTaskProvider
          projectId={projectId}
          taskKey={taskKey}
          task={task as unknown as JiraIssue}
        >
          {children}
        </JiraEditTaskProvider>
      )}
      editView={({ onBack, onSuccess }) => <EditTaskView onBack={onBack} onSuccess={onSuccess} />}
    />
  );
}
