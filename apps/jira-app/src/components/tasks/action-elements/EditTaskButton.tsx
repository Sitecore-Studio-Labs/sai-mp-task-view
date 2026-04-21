"use client";

import { mdiPencilOutline } from "@mdi/js";

import { Button } from "@/components/ui/button";
import { usePermission } from "@/hooks/useIssuePermission";
import { Icon } from "@/lib/icon";
import { JiraPermission } from "@/types/jira";

interface EditTaskButtonProps {
  taskKey: string;
  onClick?: (taskKey: string) => void;
}

export function EditTaskButton({ taskKey, onClick }: EditTaskButtonProps) {
  const { data: userPermission } = usePermission({
    issueIdOrKey: taskKey,
    permission: JiraPermission.EDIT,
  });
  const canEdit = userPermission?.hasPermission ?? false;
  return (
    <div title={!canEdit ? "No permission to edit" : ""}>
      <Button
        variant="link"
        size="sm"
        className="px-0"
        onClick={() => onClick?.(taskKey)}
        disabled={!canEdit}
      >
        <Icon path={mdiPencilOutline} size={0.8} />
        Edit
      </Button>
    </div>
  );
}
