import type { JiraProject } from "@/types/jira";
import {
  SelectReact,
  type SelectReactOption,
} from "@/components/ui/select-react";

export default function ProjectsList({
  projects,
  selectedProjectId,
  onSelectProject,
}: {
  projects: JiraProject[];
  selectedProjectId: string | null;
  onSelectProject: (id: string | null) => void;
}) {
  const options: SelectReactOption[] = projects.map((project) => ({
    value: project.key,
    label: project.name,
  }));

  const selectedOption =
    options.find((o) => o.value === selectedProjectId) ?? null;

  return (
    <div className="wrapper">
      <SelectReact
        options={options}
        placeholder="Select a project"
        aria-label="Select a project"
        value={selectedOption}
        onChange={(option) => onSelectProject(option?.value ?? null)}
      />
    </div>
  );
}
