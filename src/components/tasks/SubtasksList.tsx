"use client";

import { useTaskManager } from "@/providers/task-manager/TaskManagerProvider";
import type { PlatformTask } from "@/types/platform-entities";

import { Badge } from "../ui/badge";
import { StatusBadge } from "./elements/StatusBadge";

export function SubtasksList({ tasks }: { tasks?: PlatformTask[] }) {
  const { setSelectedTaskKey } = useTaskManager();

  return (
    tasks &&
    tasks.length > 0 && (
      <ul className="space-y-2">
        {tasks.map((task) => (
          <li
            key={task.id}
            className="group flex cursor-pointer items-center gap-2 rounded text-sm transition-colors"
            onClick={() => setSelectedTaskKey(task.key)}
          >
            <Badge className="text-xs">{task.key}</Badge>
            <span
              className="mr-auto line-clamp-1 underline-offset-2 group-hover:underline"
              title={task.summary}
            >
              {task.summary}
            </span>
            <StatusBadge status={task.status} />
          </li>
        ))}
      </ul>
    )
  );
}
