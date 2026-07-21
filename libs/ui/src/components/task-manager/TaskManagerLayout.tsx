"use client";

import { useTaskManager } from "@mp/task-core";
import type { ReactNode } from "react";

import { TaskManagerMainView } from "./TaskManagerMainView";

interface TaskManagerLayoutProps {
  /**
   * Rendered when view === "create" and a project is selected.
   * Receives project context and navigation callbacks.
   */
  createView: (props: {
    onBack: () => void;
    onSuccess: () => void;
    onAiGenerateSuccess?: (draftId: string) => void;
    projectId: string;
    projectKey: string;
  }) => ReactNode;

  /**
   * Rendered when view === "preview" and a draft is active.
   */
  previewView?: (props: {
    draftId: string;
    projectId?: string;
    projectKey?: string;
    onBack: () => void;
  }) => ReactNode;

  /**
   * Platform-specific task detail overlay (e.g. a dialog showing task details + edit form).
   * Rendered inside the main list view.
   */
  taskDetailsSlot?: ReactNode;
}

export function TaskManagerLayout({
  createView,
  previewView,
  taskDetailsSlot,
}: TaskManagerLayoutProps) {
  const {
    connected,
    view,
    goToMain,
    goToPreview,
    backFromPreview,
    effectiveProjectId,
    effectiveProjectKey,
    previewDraftId,
  } = useTaskManager();

  if (!connected) return null;

  if (view === "create" && effectiveProjectId && effectiveProjectKey) {
    return (
      <>
        {createView({
          onBack: goToMain,
          onSuccess: goToMain,
          onAiGenerateSuccess: goToPreview,
          projectId: effectiveProjectId,
          projectKey: effectiveProjectKey,
        })}
      </>
    );
  }

  if (view === "preview" && previewDraftId && previewView) {
    return (
      <>
        {previewView({
          draftId: previewDraftId,
          projectId: effectiveProjectId ?? undefined,
          projectKey: effectiveProjectKey ?? undefined,
          onBack: backFromPreview,
        })}
      </>
    );
  }

  return <TaskManagerMainView taskDetailsSlot={taskDetailsSlot} />;
}
