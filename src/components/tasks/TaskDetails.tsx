"use client";

import { useCallback } from "react";
import { toast } from "sonner";

import { useIssueStatusChange } from "@/hooks/useIssueStatusChange";
import { type JiraIssueTransition, useIssueTransitions } from "@/hooks/useIssueTransitions";
import { useTaskManager } from "@/providers/task-manager/TaskManagerProvider";
import { JiraIssue } from "@/types/jira";

import { AdfRenderer } from "../common/AdfRenderer";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger } from "../ui/select";
import { Separator } from "../ui/separator";
import { Spinner } from "../ui/spinner";
import { AddSubtaskButton } from "./action-elements/AddSubtaskButton";
import { DeleteTaskButton } from "./action-elements/DeleteTaskButton";
import { EditTaskButton } from "./action-elements/EditTaskButton";
import { PriorityBadge } from "./elements/PriorityBadge";
import { StatusBadge } from "./elements/StatusBadge";
import { UserAvatar } from "./elements/UserAvatar";
import { SubtasksList } from "./SubtasksList";
import { TaskComments } from "./TaskComments";

interface TaskDetailsProps {
  task: JiraIssue | null;
  onEditTask?: (taskKey: string) => void;
}

export function TaskDetails({ task, onEditTask }: TaskDetailsProps) {
  const { setSelectedTaskKey } = useTaskManager();

  const subtasks = task?.fields.subtasks;

  const taskKey = task?.key ?? "";

  const { data: transitions = [], isLoading: transitionsLoading } = useIssueTransitions(taskKey);
  const issueStatusChange = useIssueStatusChange();

  const handleChangeStatus = useCallback(
    async (transitionId: string) => {
      if (!taskKey) return;

      try {
        await issueStatusChange.mutateAsync({
          issueIdOrKey: taskKey,
          transitionId,
        });
        toast.success("Issue status updated");
      } catch (error: unknown) {
        const e = error as { response?: { data?: { error?: string } }; message?: string };
        const message = e?.response?.data?.error ?? e?.message ?? "Failed to update issue status";
        toast.error(message);
      }
    },
    [taskKey, issueStatusChange],
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
            <Select
              onValueChange={handleChangeStatus}
              disabled={
                !taskKey || transitionsLoading || issueStatusChange.isPending || !transitions.length
              }
            >
              <SelectTrigger
                size="sm"
                className="cursor-pointer border-none bg-transparent px-0 py-0 hover:bg-transparent focus-visible:ring-0 [&_svg]:hidden"
              >
                <StatusBadge status={task?.fields.status} clickable />
              </SelectTrigger>
              <SelectContent>
                {transitions.map((transition: JiraIssueTransition) => (
                  <SelectItem key={transition.id} value={transition.id} className="cursor-pointer">
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
          </div>
          <UserAvatar user={task?.fields.assignee} size="sm" extended />
        </div>

        {task?.fields.description && (
          <AdfRenderer document={task?.fields.description} attachments={task?.fields.attachment} />
        )}

        <Separator />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="mb-2 text-sm font-semibold">Type</h4>
            <p className="text-muted-foreground text-sm">
              {task?.fields.issuetype?.name || "Unknown"}
            </p>
          </div>

          <div>
            <h4 className="mb-2 text-sm font-semibold">Priority</h4>
            <PriorityBadge priority={task?.fields.priority} />
          </div>

          <div>
            <h4 className="mb-2 text-sm font-semibold">Reporter</h4>
            <UserAvatar user={task?.fields.reporter} size="sm" extended />
          </div>

          <div>
            <h4 className="mb-2 text-sm font-semibold">Due Date</h4>
            <p className="text-muted-foreground text-sm">{task?.fields.duedate || "Not set"}</p>
          </div>
        </div>
      </div>

      <Separator />

      <div className="wrapper space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Subtasks ({subtasks?.length || "0"})</h4>
            {/* Subtask creation is not implemented yet — hide the button until the feature is supported. */}
            {false && <AddSubtaskButton taskKey={task?.key || ""} />}
          </div>
          <SubtasksList tasks={subtasks} />
        </div>
      </div>

      <Separator />

      <TaskComments taskKey={task?.key || ""} />

      <Separator />

      <div className="wrapper flex flex-row justify-between gap-4">
        <DeleteTaskButton taskKey={task?.key || ""} />
        <EditTaskButton taskKey={task?.key || ""} onClick={onEditTask} />
      </div>
    </div>
  );
}
