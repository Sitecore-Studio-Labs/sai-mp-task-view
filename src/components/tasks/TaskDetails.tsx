'use client';

import { JiraIssue } from '@/types/jira';
import { Button } from '../ui/button';
import { mdiPencilOutline, mdiPlus } from '@mdi/js';
import { Icon } from '@/lib/icon';
import { StatusBadge } from './elements/StatusBadge';
import { UserAvatar } from './elements/UserAvatar';
import { PriorityBadge } from './elements/PriorityBadge';
import { Separator } from '../ui/separator';
import { SubtasksList } from './SubtasksList';

interface TaskDetailsProps {
  task: JiraIssue | null;
  onTaskClick: (taskKey: string) => void;
}

export function TaskDetails({ task, onTaskClick }: TaskDetailsProps) {
  console.log(task);

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
              Subtasks ({task?.fields.subtasks?.length || '0'})
            </h4>
            <Button size="icon-xs" variant="outline">
              <Icon path={mdiPlus} />
            </Button>
          </div>
          <SubtasksList
            tasks={task?.fields.subtasks}
            onSelectTask={onTaskClick}
          />
        </div>
      </div>

      <Separator />

      <div className="wrapper flex flex-row gap-4 justify-between">
        <Button variant="link" size="sm" colorScheme="danger" className="px-0">
          Delete
        </Button>
        <Button variant="link" size="sm" className="px-0">
          <Icon path={mdiPencilOutline} size={0.8} />
          Edit
        </Button>
      </div>
    </div>
  );
}
