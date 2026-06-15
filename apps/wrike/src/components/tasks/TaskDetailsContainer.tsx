"use client";

import { EditTaskView, TaskDetailsContainer as GenericTaskDetailsContainer } from "@mp/ui";

import { WrikeEditTaskProvider } from "../../providers/edit-task/WrikeEditTaskProvider";

export function TaskDetailsContainer() {
  return (
    <GenericTaskDetailsContainer
      editProviderWrapper={({ projectId, taskKey, task, children }) => (
        <WrikeEditTaskProvider projectId={projectId} taskKey={taskKey} task={task}>
          {children}
        </WrikeEditTaskProvider>
      )}
      editView={({ onBack, onSuccess }) => <EditTaskView onBack={onBack} onSuccess={onSuccess} />}
    />
  );
}
