'use client';

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
          <StatusBadge status={task?.fields.status} />
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
