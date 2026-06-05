"use client";

import { usePerformanceTracker } from "@mp/observability";
import type { PlatformTask, PlatformTransition } from "@mp/task-core";
import { usePlatformCapabilities, useTaskManager } from "@mp/task-core";
import { useCallback } from "react";
import { toast } from "sonner";

import {
  usePlatformStatusChange,
  usePlatformTransitions,
} from "../../hooks/usePlatformTransitions";
import { useTracking } from "../../hooks/useTracking";
import type { ADFNode } from "../common/AdfRenderer";
import { AdfRenderer } from "../common/AdfRenderer";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger } from "../ui/select";
import { Separator } from "../ui/separator";
import { Spinner } from "../ui/spinner";
import { DeleteTaskButton } from "./action-elements/DeleteTaskButton";
import { EditTaskButton } from "./action-elements/EditTaskButton";
import { PriorityBadge } from "./elements/PriorityBadge";
import { StatusBadge } from "./elements/StatusBadge";
import { UserAvatar } from "./elements/UserAvatar";
import { SubtasksList } from "./SubtasksList";
import { TaskComments } from "./TaskComments";

interface TaskDetailsProps {
  task: PlatformTask | null;
  onEditTask?: (taskKey: string) => void;
  /** Permission key for delete. Defaults to "DELETE_ISSUES". */
  deletePermissionKey?: string;
  /** Permission key for edit. Defaults to "EDIT_ISSUES". */
  editPermissionKey?: string;
}

export function TaskDetails({
  task,
  onEditTask,
  deletePermissionKey,
  editPermissionKey,
}: TaskDetailsProps) {
  const {
    hasStatusTransitions,
    hasSubtasks,
    hasComments,
    hasAssignees,
    hasPriorities,
    hasIssueTypes,
    hasDueDate,
    platformName,
    richTextFormat,
  } = usePlatformCapabilities();
  const { setSelectedTaskKey } = useTaskManager();

  const taskKey = task?.key ?? "";
  const { business } = useTracking();
  usePerformanceTracker("task-manager.task-details");

  const { data: transitions = [], isLoading: transitionsLoading } = usePlatformTransitions(taskKey);
  const issueStatusChange = usePlatformStatusChange();

  const handleChangeStatus = useCallback(
    async (transitionId: string) => {
      if (!taskKey) return;
      try {
        await issueStatusChange.mutateAsync({ issueIdOrKey: taskKey, transitionId });
        business.featureUsed({ featureKey: "status-transitions", platform: platformName });
        toast.success("Issue status updated");
      } catch (error: unknown) {
        const e = error as { response?: { data?: { error?: string } }; message?: string };
        const message = e?.response?.data?.error ?? e?.message ?? "Failed to update issue status";
        toast.error(message);
      }
    },
    [business, issueStatusChange, platformName, taskKey],
  );

  return (
    <div className="space-y-4">
      <div className="wrapper space-y-4">
        <div className="space-y-1">
          <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
            {task?.fields.parent && (
              <>
                <Button
                  variant="link"
                  size="xs"
                  onClick={() => setSelectedTaskKey(task.fields.parent!.key)}
                  className="px-0"
                >
                  {task.fields.parent.key}
                </Button>
                <span>/</span>
              </>
            )}
            <span>{task?.key}</span>
          </div>
          <h2 className="text-xl">{task?.fields.summary}</h2>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            {hasStatusTransitions ? (
              <>
                <Select
                  onValueChange={handleChangeStatus}
                  disabled={
                    !taskKey ||
                    transitionsLoading ||
                    issueStatusChange.isPending ||
                    !transitions.length
                  }
                >
                  <SelectTrigger
                    size="sm"
                    className="cursor-pointer border-none bg-transparent px-0 py-0 hover:bg-transparent focus-visible:ring-0 [&_svg]:hidden"
                    data-testid="task-status-select"
                  >
                    <StatusBadge status={task?.fields.status} clickable />
                  </SelectTrigger>
                  <SelectContent>
                    {transitions.map((transition: PlatformTransition) => (
                      <SelectItem
                        key={transition.id}
                        value={transition.id}
                        className="cursor-pointer"
                      >
                        <StatusBadge status={transition.to} />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {issueStatusChange.isPending && (
                  <div className="text-muted-foreground flex items-center gap-1 text-xs">
                    <Spinner className="size-3" />
                    <span>Updating…</span>
                  </div>
                )}
              </>
            ) : (
              <StatusBadge status={task?.fields.status} />
            )}
          </div>
          {hasAssignees && <UserAvatar user={task?.fields.assignee} size="sm" extended />}
        </div>

        {!!task?.fields.description &&
          (richTextFormat === "adf" ? (
            <AdfRenderer
              document={task.fields.description as ADFNode}
              attachments={task.fields.attachment}
            />
          ) : (
            <p className="text-muted-foreground text-sm whitespace-pre-wrap">
              {task.fields.description as string}
            </p>
          ))}

        <Separator />

        <div className="grid grid-cols-2 gap-4">
          {hasIssueTypes && (
            <div>
              <h4 className="mb-2 text-sm font-semibold">Type</h4>
              <p className="text-muted-foreground text-sm">
                {task?.fields.issuetype?.name || "Unknown"}
              </p>
            </div>
          )}
          {hasPriorities && (
            <div>
              <h4 className="mb-2 text-sm font-semibold">Priority</h4>
              <PriorityBadge priority={task?.fields.priority} />
            </div>
          )}
          <div>
            <h4 className="mb-2 text-sm font-semibold">Reporter</h4>
            <UserAvatar user={task?.fields.reporter} size="sm" extended />
          </div>
          {hasDueDate && (
            <div>
              <h4 className="mb-2 text-sm font-semibold">Due Date</h4>
              <p className="text-muted-foreground text-sm">{task?.fields.duedate || "Not set"}</p>
            </div>
          )}
        </div>
      </div>

      <Separator />

      {hasSubtasks && (
        <>
          <div className="wrapper space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">
                  Subtasks ({task?.fields.subtasks?.length || "0"})
                </h4>
              </div>
              <SubtasksList tasks={task?.fields.subtasks} />
            </div>
          </div>
          <Separator />
        </>
      )}

      {hasComments && <TaskComments taskKey={task?.key || ""} />}

      <Separator />

      <div className="wrapper flex flex-row justify-between gap-4">
        <DeleteTaskButton taskKey={task?.key || ""} deletePermissionKey={deletePermissionKey} />
        <EditTaskButton
          taskKey={task?.key || ""}
          onClick={onEditTask}
          editPermissionKey={editPermissionKey}
        />
      </div>
    </div>
  );
}
