"use client";

import {
  type EditFormWrapperProps,
  WorkBreakdownPreviewView as BaseWorkBreakdownPreviewView,
  type WorkBreakdownPreviewViewProps,
} from "@mp/ui";

import { JiraCreateTaskProvider } from "../../providers/create-task/JiraCreateTaskProvider";

export type { EditFormWrapperProps, WorkBreakdownPreviewViewProps };

export function WorkBreakdownPreviewView({
  draftId,
  projectId,
  projectKey,
  onBack,
}: WorkBreakdownPreviewViewProps) {
  return (
    <BaseWorkBreakdownPreviewView
      draftId={draftId}
      projectId={projectId}
      projectKey={projectKey}
      onBack={onBack}
      editFormWrapper={({ projectId: pId, projectKey: pKey, children }) => (
        <JiraCreateTaskProvider projectId={pId} projectKey={pKey}>
          {children}
        </JiraCreateTaskProvider>
      )}
    />
  );
}
