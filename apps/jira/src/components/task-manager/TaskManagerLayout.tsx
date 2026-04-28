"use client";

import { TaskManagerLayout as GenericTaskManagerLayout } from "@mp/ui";

import { JiraCreateTaskProvider } from "../../providers/create-task/JiraCreateTaskProvider";
import { CreateTaskView } from "../tasks/CreateTaskView";
import { TaskDetailsContainer } from "../tasks/TaskDetailsContainer";
import { WorkBreakdownPreviewView } from "../tasks/WorkBreakdownPreviewView";

export function TaskManagerLayout() {
  return (
    <GenericTaskManagerLayout
      createView={({ onBack, onSuccess, onAiGenerateSuccess, projectId, projectKey }) => (
        <JiraCreateTaskProvider projectId={projectId} projectKey={projectKey}>
          <CreateTaskView
            onBack={onBack}
            onSuccess={onSuccess}
            onAiGenerateSuccess={onAiGenerateSuccess}
          />
        </JiraCreateTaskProvider>
      )}
      previewView={({ draftId, projectId, projectKey, onBack }) => (
        <WorkBreakdownPreviewView
          draftId={draftId}
          projectId={projectId}
          projectKey={projectKey}
          onBack={onBack}
        />
      )}
      taskDetailsSlot={<TaskDetailsContainer />}
    />
  );
}
