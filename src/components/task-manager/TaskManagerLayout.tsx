"use client";

import { CreateTaskView } from "@/components/tasks/CreateTaskView";
import { WorkBreakdownPreviewView } from "@/components/tasks/WorkBreakdownPreviewView";
import { JiraCreateTaskProvider } from "@/providers/create-task/JiraCreateTaskProvider";
import { useTaskManager } from "@/providers/task-manager/TaskManagerProvider";

import { TaskManagerMainView } from "./TaskManagerMainView";

export function TaskManagerLayout() {
  const {
    view,
    goToMain,
    goToPreview,
    backFromPreview,
    effectiveProjectId,
    effectiveProjectKey,
    previewDraftId,
  } = useTaskManager();

  if (view === "create" && effectiveProjectId && effectiveProjectKey) {
    return (
      <JiraCreateTaskProvider projectId={effectiveProjectId} projectKey={effectiveProjectKey}>
        <CreateTaskView onBack={goToMain} onSuccess={goToMain} onAiGenerateSuccess={goToPreview} />
      </JiraCreateTaskProvider>
    );
  }

  if (view === "preview" && previewDraftId) {
    return (
      <WorkBreakdownPreviewView
        draftId={previewDraftId}
        projectId={effectiveProjectId ?? undefined}
        projectKey={effectiveProjectKey ?? undefined}
        onBack={backFromPreview}
      />
    );
  }

  return <TaskManagerMainView />;
}
