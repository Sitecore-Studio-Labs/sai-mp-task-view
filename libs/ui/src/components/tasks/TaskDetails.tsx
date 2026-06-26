"use client";

import { usePerformanceTracker } from "@mp/observability";
import type { PlatformTask, PlatformTransition } from "@mp/task-core";
import { getTaskDisplayIdentifier, usePlatformCapabilities, useTaskManager } from "@mp/task-core";
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
import { TaskAttachmentList } from "./elements/TaskAttachmentList";
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

function formatTaskDueDate(value: string | undefined, dueDateDisplay: "date" | "datetime"): string {
  if (!value) return "Not set";
  if (dueDateDisplay === "date") {
    const dateOnly = /^\d{4}-\d{2}-\d{2}/.exec(value);
    if (dateOnly) return dateOnly[0];
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  if (dueDateDisplay === "datetime") {
    return parsed.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  }
  return parsed.toISOString().slice(0, 10);
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
    hasAttachments,
    platformName,
    richTextFormat,
    dueDateDisplay,
    taskKeyDisplay = "key",
  } = usePlatformCapabilities();
  const { setSelectedTaskKey } = useTaskManager();

  const taskKey = task?.key ?? "";
  const taskDisplayIdentifier = task ? getTaskDisplayIdentifier(task, taskKeyDisplay) : "";
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
          {(task?.fields.parent || (hasIssueTypes && task?.key)) && (
            <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
              {task?.fields.parent && (
                <>
                  <Button
                    variant="link"
                    size="xs"
                    onClick={() => setSelectedTaskKey(task.fields.parent!.key)}
                    className="px-0"
                  >
                    {getTaskDisplayIdentifier(
                      {
                        key: task.fields.parent.key,
                        fields: { summary: task.fields.parent.summary ?? "" },
                      },
                      taskKeyDisplay,
                    )}
                  </Button>
                  {hasIssueTypes && task?.key && <span>/</span>}
                </>
              )}
              {hasIssueTypes && task?.key && <span>{taskDisplayIdentifier}</span>}
            </div>
          )}
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

        {hasAttachments && richTextFormat !== "adf" && task?.fields.attachment?.length ? (
          <TaskAttachmentList attachments={task.fields.attachment} />
        ) : null}

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
              <p className="text-muted-foreground text-sm">
                {formatTaskDueDate(task?.fields.duedate, dueDateDisplay)}
              </p>
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
        <DeleteTaskButton
          taskKey={task?.key || ""}
          taskSummary={task?.fields.summary}
          deletePermissionKey={deletePermissionKey}
        />
        <EditTaskButton
          taskKey={task?.key || ""}
          onClick={onEditTask}
          editPermissionKey={editPermissionKey}
        />
      </div>
    </div>
  );
}
