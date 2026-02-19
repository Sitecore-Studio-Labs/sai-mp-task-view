"use client";

import { useState } from "react";
import {
  JIRA_PROJECTS_QUERY_KEY,
  JIRA_STATUS_QUERY_KEY,
} from "@/hooks/useJiraConnectionStatus";
import ProjectsSection from "@/components/projects/ProjectsSection";
import ConnectionsList from "@/components/connections/ConnectionsList";
import ConnectionStatusBar from "@/components/connections/ConnectionStatusBar";
import { CreateTaskView } from "@/components/tasks/CreateTaskView";
import { WorkBreakdownPreviewView } from "@/components/tasks/WorkBreakdownPreviewView";
import { JiraCreateTaskProvider } from "@/providers/create-task/JiraCreateTaskProvider";
import { useOAuthPopupHandler } from "@/hooks/useOAuthPopupHandler";
import { useJiraConnectionStatus } from "@/hooks/useJiraConnectionStatus";
import { useJiraProjects } from "@/hooks/useJiraProjects";
import { SYSTEMS } from "@/constants/systems";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { mdiPlus } from "@mdi/js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { JiraProject } from "@/types/jira";

type View = "main" | "create" | "preview";

import TaskBoard from '@/components/task-board/TaskBoard';

export default function TaskManagerExtensionPage() {
  const [view, setView] = useState<View>("main");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );
  const [previewDraftId, setPreviewDraftId] = useState<string | null>(null);
  const { data: status } = useJiraConnectionStatus();
  const { data: projects = [], isLoading: projectsLoading } = useJiraProjects();
  const connected = status?.connected ?? false;

  useOAuthPopupHandler({
    platform: SYSTEMS.JIRA,
    invalidateKeys: [JIRA_STATUS_QUERY_KEY, JIRA_PROJECTS_QUERY_KEY],
    successMessage: "Jira connected successfully.",
  });

  return (
    <>
      <ConnectionStatusBar />
      <ConnectionsList />

      {view === "main" && (
        <div className="wrapper space-y-4">
          {connected && (
            <>
              <div className="space-y-2">
                <label
                  htmlFor="project-select"
                  className="text-sm font-medium text-neutral-fg"
                >
                  Project
                </label>
                <Select
                  value={selectedProjectId ?? ""}
                  onValueChange={(v) => setSelectedProjectId(v || null)}
                  disabled={projectsLoading}
                >
                  <SelectTrigger id="project-select" className="w-full">
                    <SelectValue placeholder="Select Project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p: JiraProject) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.key})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">
                  Tasks
                </h2>
                <Button
                  variant="outline"
                  colorScheme="neutral"
                  size="sm"
                  disabled={!selectedProjectId}
                  onClick={() => setView("create")}
                  className="shrink-0 font-normal"
                >
                  <Icon path={mdiPlus} size="sm" />
                  Create
                </Button>
              </div>
            </>
          )}
          <ProjectsSection
            selectedProjectId={selectedProjectId}
            selectedProjectKey={
              selectedProjectId
                ? (projects.find((p) => p.id === selectedProjectId)?.key ??
                  null)
                : null
            }
          />
        </div>
      )}

      {view === "create" && selectedProjectId && (
        <JiraCreateTaskProvider projectId={selectedProjectId}>
          <CreateTaskView
            onBack={() => setView("main")}
            onSuccess={() => setView("main")}
            onAiGenerateSuccess={(draftId) => {
              setPreviewDraftId(draftId);
              setView("preview");
            }}
          />
        </JiraCreateTaskProvider>
      )}

      {view === "preview" && previewDraftId && (
        <WorkBreakdownPreviewView
          draftId={previewDraftId}
          projectId={selectedProjectId ?? undefined}
          onBack={() => {
            setView("create");
            setPreviewDraftId(null);
          }}
        />
      )}
      <TaskBoard />
    </>
  );
}
