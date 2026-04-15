"use client";

import { CreateTaskView } from "@/components/tasks/CreateTaskView";
import { WorkBreakdownPreviewView } from "@/components/tasks/WorkBreakdownPreviewView";
import { CreateTaskProvider } from "@/providers/create-task/CreateTaskProvider";
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
      <CreateTaskProvider
        projectId={effectiveProjectId}
        projectKey={effectiveProjectKey}
        platform="jira"
      >
        <CreateTaskView onBack={goToMain} onSuccess={goToMain} onAiGenerateSuccess={goToPreview} />
      </CreateTaskProvider>
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
