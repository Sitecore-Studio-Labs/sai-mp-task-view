import type { JiraProject } from "@/types/jira";
import { ProjectPicker } from "./ProjectPicker";

/**
 * @deprecated Use ProjectPicker with selectedProjectKey prop instead.
 * This wrapper exists for backward compatibility; the prop name
 * "selectedProjectId" is misleading (value is project key).
 */
export default function ProjectsList({
  projects,
  selectedProjectId,
  onSelectProject,
  disabled,
}: {
  projects: JiraProject[];
  selectedProjectId: string | null;
  onSelectProject: (projectKey: string | null) => void;
  disabled?: boolean;
}) {
  return (
    <ProjectPicker
      projects={projects}
      selectedProjectKey={selectedProjectId}
      onSelectProject={onSelectProject}
      disabled={disabled}
    />
  );
}
