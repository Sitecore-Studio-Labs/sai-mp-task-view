"use client";

import { WorkBreakdownPreviewView as BaseWorkBreakdownPreviewView } from "@mp/ui";

import { JiraCreateTaskProvider } from "../../providers/create-task/JiraCreateTaskProvider";

type WorkBreakdownPreviewViewProps = {
  draftId: string;
  projectId?: string;
  projectKey?: string;
  onBack: () => void;
};

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
