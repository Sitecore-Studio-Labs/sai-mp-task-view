"use client";

import type { PlatformTask } from "@mp/task-core";
import {
  getTaskDisplayIdentifier,
  shouldShowKeyIdentifier,
  usePlatformCapabilities,
  useTaskManager,
} from "@mp/task-core";

import { Badge } from "../ui/badge";
import { StatusBadge } from "./elements/StatusBadge";

export function SubtasksList({ tasks }: { tasks?: PlatformTask[] }) {
  const { setSelectedTaskKey } = useTaskManager();
  const { taskKeyDisplay = "key" } = usePlatformCapabilities();
  const showKeyBadge = shouldShowKeyIdentifier(taskKeyDisplay);

  return (
    tasks &&
    tasks.length > 0 && (
      <ul className="space-y-2">
        {tasks.map((task) => {
          const displayIdentifier = getTaskDisplayIdentifier(task, taskKeyDisplay);
          return (
            <li
              key={task.id}
              className="group flex cursor-pointer items-center gap-2 rounded text-sm transition-colors"
              onClick={() => setSelectedTaskKey(task.key)}
            >
              {showKeyBadge ? <Badge className="text-xs">{displayIdentifier}</Badge> : null}
              <span
                className="mr-auto line-clamp-1 underline-offset-2 group-hover:underline"
                title={task.fields.summary}
              >
                {task.fields.summary || displayIdentifier}
              </span>
              <StatusBadge status={task.fields.status} />
            </li>
          );
        })}
      </ul>
    )
  );
}
