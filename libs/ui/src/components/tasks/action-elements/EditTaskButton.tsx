"use client";

import { mdiPencilOutline } from "@mdi/js";
import { useTaskManager } from "@mp/task-core";

import { usePlatformPermissions } from "../../../hooks/usePlatformPermissions";
import { Button } from "../../ui/button";
import { Icon } from "../../ui/icon";

interface EditTaskButtonProps {
  taskKey: string;
  onClick?: (taskKey: string) => void;
  /** Permission key checked before enabling the edit button. Defaults to "EDIT_ISSUES". */
  editPermissionKey?: string;
}

export function EditTaskButton({
  taskKey,
  onClick,
  editPermissionKey = "EDIT_ISSUES",
}: EditTaskButtonProps) {
  const { effectiveProjectKey } = useTaskManager();
  const { data: permissionData } = usePlatformPermissions({
    permission: editPermissionKey,
    projectKey: effectiveProjectKey,
  });
  const canEdit = permissionData?.hasPermission ?? false;

  return (
    <div title={!canEdit ? "No permission to edit" : ""}>
      <Button
        variant="link"
        size="sm"
        className="px-0"
        onClick={() => onClick?.(taskKey)}
        disabled={!canEdit}
      >
        <Icon path={mdiPencilOutline} size="sm" />
        Edit
      </Button>
    </div>
  );
}
