"use client";

import {
  CreateTaskView,
  TaskManagerLayout as GenericTaskManagerLayout,
  useParseRequirements,
  WorkBreakdownPreviewView,
} from "@mp/ui";

import { WrikeCreateTaskProvider } from "../../providers/create-task/WrikeCreateTaskProvider";
import { TaskDetailsContainer } from "../tasks/TaskDetailsContainer";

type CreateViewProps = {
  onBack: () => void;
  onSuccess?: () => void;
  onAiGenerateSuccess?: (draftId: string) => void;
  projectId: string;
  projectKey: string;
};

function PlatformCreateView({
  onBack,
  onSuccess,
  onAiGenerateSuccess,
  projectId,
  projectKey,
}: CreateViewProps) {
  const parseRequirements = useParseRequirements({
    onSuccess: (data) => onAiGenerateSuccess?.(data.draftId),
  });

  return (
    <WrikeCreateTaskProvider projectId={projectId} projectKey={projectKey}>
      <CreateTaskView
        onBack={onBack}
        onSuccess={onSuccess}
        parseRequirementsMutation={parseRequirements}
      />
    </WrikeCreateTaskProvider>
  );
}

export function TaskManagerLayout() {
  return (
    <GenericTaskManagerLayout
      taskDetailsSlot={<TaskDetailsContainer />}
      createView={(props) => <PlatformCreateView {...props} />}
      previewView={({ draftId, projectId, projectKey, onBack }) => (
        <WorkBreakdownPreviewView
          draftId={draftId}
          projectId={projectId}
          projectKey={projectKey}
          onBack={onBack}
          editFormWrapper={({ projectId: pId, projectKey: pKey, children }) => (
            <WrikeCreateTaskProvider projectId={pId} projectKey={pKey}>
              {children}
            </WrikeCreateTaskProvider>
          )}
        />
      )}
    />
  );
}
