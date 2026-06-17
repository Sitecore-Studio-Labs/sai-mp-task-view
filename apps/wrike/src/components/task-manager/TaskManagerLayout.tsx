"use client";

import { CreateTaskView, TaskManagerLayout as GenericTaskManagerLayout } from "@mp/ui";

import { WrikeCreateTaskProvider } from "../../providers/create-task/WrikeCreateTaskProvider";
import { TaskDetailsContainer } from "../tasks/TaskDetailsContainer";

type CreateViewProps = {
  onBack: () => void;
  onSuccess?: () => void;
  projectId: string;
  projectKey: string;
};

function PlatformCreateView({ onBack, onSuccess, projectId, projectKey }: CreateViewProps) {
  return (
    <WrikeCreateTaskProvider projectId={projectId} projectKey={projectKey}>
      <CreateTaskView onBack={onBack} onSuccess={onSuccess} />
    </WrikeCreateTaskProvider>
  );
}

export function TaskManagerLayout() {
  return (
    <GenericTaskManagerLayout
      taskDetailsSlot={<TaskDetailsContainer />}
      createView={(props) => <PlatformCreateView {...props} />}
    />
  );
}
