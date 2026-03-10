'use client';

import { useCallback } from 'react';
import { toast } from 'sonner';
import { JiraIssue } from '@/types/jira';
import { Button } from '../ui/button';
import { StatusBadge } from './elements/StatusBadge';
import { UserAvatar } from './elements/UserAvatar';
import { PriorityBadge } from './elements/PriorityBadge';
import { Separator } from '../ui/separator';
import { SubtasksList } from './SubtasksList';
import { AdfRenderer } from '../common/AdfRenderer';
import { AddSubtaskButton } from './action-elements/AddSubtaskButton';
import { TaskComments } from './TaskComments';
import { EditTaskButton } from './action-elements/EditTaskButton';
import { DeleteTaskButton } from './action-elements/DeleteTaskButton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '../ui/select';
import { Spinner } from '../ui/spinner';
import { useIssueTransitions, type JiraIssueTransition } from '@/hooks/useIssueTransitions';
import { useIssueStatusChange } from '@/hooks/useIssueStatusChange';

interface TaskDetailsProps {
  task: JiraIssue | null;
  onTaskClick: (taskKey: string) => void;
  onTaskDelete: () => void;
}

export function TaskDetails({
  task,
  onTaskClick,
  onTaskDelete,
}: TaskDetailsProps) {
  const subtasks = task?.fields.subtasks;

  const issueKey = task?.key ?? '';

  const { data: transitions = [], isLoading: transitionsLoading } =
    useIssueTransitions(issueKey);
  const issueStatusChange = useIssueStatusChange();

  const handleChangeStatus = useCallback(
    async (transitionId: string) => {
      if (!issueKey) return;

      try {
        await issueStatusChange.mutateAsync({
          issueIdOrKey: issueKey,
          transitionId,
        });
        toast.success('Issue status updated');
      } catch (error: unknown) {
        const e = error as { response?: { data?: { error?: string } }; message?: string };
        const message =
          e?.response?.data?.error ??
          e?.message ??
          'Failed to update issue status';
        toast.error(message);
      }
    },
    [issueKey, issueStatusChange],
  );

  return (
    <div className="space-y-4">
      <div className="wrapper space-y-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            {task?.fields.parent && (
              <>
                <Button
                  variant="link"
                  size="xs"
                  onClick={() => onTaskClick(task.fields.parent!.key)}
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

        <div className="flex flex-wrap gap-6 items-center">
          <div className="flex items-center gap-3">
            <Select
              onValueChange={handleChangeStatus}
              disabled={
                !issueKey ||
                transitionsLoading ||
                issueStatusChange.isPending ||
                !transitions.length
              }
            >
              <SelectTrigger
                size="sm"
                className="border-none px-0 py-0 bg-transparent hover:bg-transparent focus-visible:ring-0 [&_svg]:hidden"
              >
                <StatusBadge status={task?.fields.status} clickable />
              </SelectTrigger>
              <SelectContent>
                {transitions.map((transition: JiraIssueTransition) => (
                  <SelectItem key={transition.id} value={transition.id}>
                    <StatusBadge status={transition.to} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {issueStatusChange.isPending && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Spinner className="size-3" />
                <span>Updating…</span>
              </div>
            )}
          </div>
          <UserAvatar user={task?.fields.assignee} size="sm" extended />
        </div>

        {task?.fields.description && (
          <AdfRenderer
            document={task?.fields.description}
            attachments={task?.fields.attachment}
          />
        )}

        <Separator />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold text-sm mb-2">Type</h4>
            <p className="text-sm text-muted-foreground">
              {task?.fields.issuetype?.name || 'Unknown'}
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-2">Priority</h4>
            <PriorityBadge priority={task?.fields.priority} />
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-2">Reporter</h4>
            <UserAvatar user={task?.fields.reporter} size="sm" extended />
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-2">Due Date</h4>
            <p className="text-sm text-muted-foreground">
              {task?.fields.duedate || 'Not set'}
            </p>
          </div>
        </div>
      </div>

      <Separator />

      <div className="wrapper space-y-4">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="font-semibold text-sm">
              Subtasks ({subtasks?.length || '0'})
            </h4>
            <AddSubtaskButton taskKey={task?.key || ''} />
          </div>
          <SubtasksList tasks={subtasks} onSelectTask={onTaskClick} />
        </div>
      </div>

      <Separator />

      <TaskComments taskKey={task?.key || ''} />

      <Separator />

      <div className="wrapper flex flex-row gap-4 justify-between">
        <DeleteTaskButton taskKey={task?.key || ''} onDeleted={onTaskDelete} />
        <EditTaskButton taskKey={task?.key || ''} />
      </div>
    </div>
  );
}
