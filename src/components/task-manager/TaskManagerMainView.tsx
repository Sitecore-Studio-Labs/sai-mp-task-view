"use client";

import { ProjectPickerSection } from "./ProjectPickerSection";
import { TaskListSection } from "./TaskListSection";

export function TaskManagerMainView() {
  return (
    <div className="wrapper space-y-4">
      <ProjectPickerSection />
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Tasks
      </h2>
      <TaskListSection />
    </div>
  );
}
