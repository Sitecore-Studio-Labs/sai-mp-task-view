"use client";

import { useTaskManager } from "@/providers/task-manager/TaskManagerProvider";
import { JiraCreateTaskProvider } from "@/providers/create-task/JiraCreateTaskProvider";
import { CreateTaskView } from "@/components/tasks/CreateTaskView";
import { WorkBreakdownPreviewView } from "@/components/tasks/WorkBreakdownPreviewView";
import { TaskManagerMainView } from "./TaskManagerMainView";

export function TaskManagerLayout() {
  const {
    view,
    goToMain,
    goToPreview,
    backFromPreview,
    effectiveProjectId,
    previewDraftId,
  } = useTaskManager();

  if (view === "create" && effectiveProjectId) {
    return (
      <JiraCreateTaskProvider projectId={effectiveProjectId}>
        <CreateTaskView
          onBack={goToMain}
          onSuccess={goToMain}
          onAiGenerateSuccess={goToPreview}
        />
      </JiraCreateTaskProvider>
    );
  }

  if (view === "preview" && previewDraftId) {
    return (
      <WorkBreakdownPreviewView
        draftId={previewDraftId}
        projectId={effectiveProjectId ?? undefined}
        onBack={backFromPreview}
      />
    );
  }

  return <TaskManagerMainView />;
}
