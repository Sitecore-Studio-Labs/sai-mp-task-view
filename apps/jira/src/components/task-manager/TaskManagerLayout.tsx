"use client";

import { CreateTaskView, TaskManagerLayout as GenericTaskManagerLayout } from "@mp/ui";

import { useParseRequirements } from "../../hooks/useParseRequirements";
import { JiraCreateTaskProvider } from "../../providers/create-task/JiraCreateTaskProvider";
import { TaskDetailsContainer } from "../tasks/TaskDetailsContainer";
import { WorkBreakdownPreviewView } from "../tasks/WorkBreakdownPreviewView";

type JiraCreateViewProps = {
  onBack: () => void;
  onSuccess?: () => void;
  onAiGenerateSuccess?: (draftId: string) => void;
  projectId: string;
  projectKey: string;
};

function JiraCreateView({
  onBack,
  onSuccess,
  onAiGenerateSuccess,
  projectId,
  projectKey,
}: JiraCreateViewProps) {
  const parseRequirements = useParseRequirements({
    onSuccess: (data) => onAiGenerateSuccess?.(data.draftId),
  });

  return (
    <JiraCreateTaskProvider projectId={projectId} projectKey={projectKey}>
      <CreateTaskView
        onBack={onBack}
        onSuccess={onSuccess}
        parseRequirementsMutation={parseRequirements}
      />
    </JiraCreateTaskProvider>
  );
}

export function TaskManagerLayout() {
  return (
    <GenericTaskManagerLayout
      createView={(props) => <JiraCreateView {...props} />}
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
