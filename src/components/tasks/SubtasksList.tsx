'use client';

import { JiraIssue } from '@/types/jira';
import { StatusBadge } from './elements/StatusBadge';
import { Badge } from '../ui/badge';

export function SubtasksList({
  tasks,
  onSelectTask,
}: {
  tasks?: JiraIssue[];
  onSelectTask: (issueKey: string) => void;
}) {
  return (
    tasks &&
    tasks.length > 0 && (
      <ul className="space-y-2">
        {tasks.map((task) => (
          <li
            key={task.id}
            className="group flex items-center gap-2 text-sm cursor-pointer rounded transition-colors"
            onClick={() => onSelectTask(task.key)}
          >
            <Badge className="text-xs">{task.key}</Badge>
            <span
              className="line-clamp-1 mr-auto group-hover:underline underline-offset-2"
              title={task.fields.summary}
            >
              {task.fields.summary}
            </span>
            <StatusBadge status={task.fields.status} />
          </li>
        ))}
      </ul>
    )
  );
}
